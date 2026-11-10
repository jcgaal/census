import { describeOutputs, type OutputEnv, type OutputInfo } from './outputs/index.js';

// GET /api/context answers with the visitor's IP, rough location and
// Accept-Language and keeps none of it. Every host calls getContext
// and mounts no request logger, so the IP lives for one request only.

// A rough location for the visitor with the source that produced it,
// so the page can say whether the host or an IP lookup supplied the
// country, region and city it shows next to the visitor's address.
export interface Geo {
  country: string | null;
  region: string | null;
  city: string | null;
  source: 'host-headers' | 'ip-lookup';
}

// The whole response body of /api/context. It holds only what the
// request itself carried plus the time it arrived, so the page shows
// nothing that the visitor's own browser did not already send along.
export interface Context {
  ip: string | null;
  geo: Geo | null;
  acceptLanguage: string | null;
  receivedAt: string;
  outputs?: OutputInfo[];
  forwardIp?: boolean;
}

// Headers arrive as Node's IncomingHttpHeaders or as a Web Headers
// object, so one type covers the Node server and the Vercel and the
// Cloudflare functions without converting between the two shapes.
export type HeaderSource = Headers | Record<string, string | string[] | undefined>;

// The optional geolocation URL lets a host without location headers
// show a country, and the output settings say where events may go.
// Left unset, the server never calls any outside service at all.
export interface ContextEnv extends OutputEnv {
  GEO_PROVIDER_URL?: string;
}

// What each host hands to getContext. The ip field is the socket
// address and is used only when X-Forwarded-For is absent, so a direct
// connection during local development still shows some address.
export interface ContextInput {
  headers: HeaderSource;
  ip: string | null | undefined;
  env: ContextEnv;
}

// Reads one header from either header shape and trims it, so callers
// get a clean string or undefined, and a header holding nothing but
// whitespace counts as missing rather than as an empty string value.
export function header(headers: HeaderSource, name: string): string | undefined {
  let s: string | null | undefined;
  if (headers instanceof Headers) {
    s = headers.get(name);
  } else {
    const v = headers[name];
    s = Array.isArray(v) ? v[0] : v;
  }
  return s?.trim() ? s.trim() : undefined;
}

// The visitor's IP is the first address in X-Forwarded-For, which
// the proxy in front of this server sets. IPv4 addresses mapped
// into IPv6 lose their ::ffff: prefix, so they read normally.
export function clientIp(headers: HeaderSource, socketIp: string | null | undefined): string | null {
  const fwd = header(headers, 'x-forwarded-for');
  const raw = fwd ? fwd.split(',')[0].trim() : (socketIp ?? null);
  if (!raw) return null;
  return raw.startsWith('::ffff:') ? raw.slice(7) : raw;
}

// Host geo headers may percent-encode city and region names, so this
// decodes them for display and keeps the raw value when the encoding
// is malformed, instead of throwing in the middle of the request.
function decode(v: string | undefined): string | null {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

// Hosts such as Vercel and Cloudflare already know where a request
// came from and pass it along in headers, so reading those first
// costs nothing and sends the visitor's IP to no outside service.
function geoFromHeaders(headers: HeaderSource): Geo | null {
  // Vercel sets the x-vercel-ip-* headers on every request it serves,
  // so a country there settles the question, and the region and city
  // arrive percent-encoded and are decoded before they are returned.
  const vCountry = header(headers, 'x-vercel-ip-country');
  if (vCountry) {
    return {
      country: vCountry,
      region: decode(header(headers, 'x-vercel-ip-country-region')),
      city: decode(header(headers, 'x-vercel-ip-city')),
      source: 'host-headers',
    };
  }
  // Cloudflare sends CF-IPCountry, where XX and T1 mean unknown or Tor,
  // so those count as no answer. Region and city only appear once the
  // visitor location headers managed transform is turned on for it.
  const cfCountry = header(headers, 'cf-ipcountry');
  if (cfCountry && cfCountry !== 'XX' && cfCountry !== 'T1') {
    return {
      country: cfCountry,
      region: decode(header(headers, 'cf-region-code') ?? header(headers, 'cf-region')),
      city: decode(header(headers, 'cf-ipcity')),
      source: 'host-headers',
    };
  }
  return null;
}

// Private and loopback addresses have no location to look up, so
// they never reach the provider. That is also why the location is
// empty while the page is running on localhost during development.
function isPrivateIp(ip: string): boolean {
  return (
    ip === '::1' ||
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith('169.254.') ||
    /^f[cd]/i.test(ip) ||
    /^fe80:/i.test(ip)
  );
}

// Without host headers the optional provider is asked instead. The
// lookup gives up after 2.5 seconds, and a failed lookup means no
// location for the visitor, never an error shown on the page.
async function geoFromProvider(ip: string | null, env: ContextEnv): Promise<Geo | null> {
  const tpl = env.GEO_PROVIDER_URL;
  if (!tpl || !ip || isPrivateIp(ip)) return null;
  // GEO_PROVIDER_URL may hold an {ip} placeholder, or else the address
  // is appended as the last path segment, so common lookup services
  // work as configured without code written for each provider.
  const url = tpl.includes('{ip}') ? tpl.replace('{ip}', encodeURIComponent(ip)) : `${tpl.replace(/\/$/, '')}/${encodeURIComponent(ip)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const d = (await res.json()) as Record<string, unknown>;
    // Providers name their fields differently, so each value is taken
    // from the first known key holding a non-empty string, and a reply
    // without any country is treated as no location for the visitor.
    const str = (...keys: string[]) => {
      for (const k of keys) if (typeof d[k] === 'string' && d[k]) return d[k] as string;
      return null;
    };
    const country = str('country_code', 'countryCode', 'country');
    if (!country) return null;
    return {
      country,
      region: str('region_code', 'region', 'regionName'),
      city: str('city'),
      source: 'ip-lookup',
    };
  } catch {
    return null;
  }
}

// This is the only data the server ever sends the page. It is built
// per request and sent with Cache-Control: no-store, so no browser or
// shared cache can hand one visitor's IP to the next person who asks.
export async function getContext({ headers, ip: socketIp, env }: ContextInput): Promise<Context> {
  const ip = clientIp(headers, socketIp);
  // Host headers come first because they cost nothing and send the IP
  // nowhere, so the provider is asked only when the host named no
  // country and a GEO_PROVIDER_URL has been configured for the site.
  const geo = geoFromHeaders(headers) ?? (await geoFromProvider(ip, env));
  const { outputs, forwardIp } = describeOutputs(env);
  return {
    ip,
    geo,
    acceptLanguage: header(headers, 'accept-language') ?? null,
    receivedAt: new Date().toISOString(),
    // Names, hosts and the IP setting only, so the page can check them
    // against what its consent gate said. Both fields are left out when
    // no output is enabled, so the default answer stays unchanged.
    ...(outputs.length ? { outputs, forwardIp } : {}),
  };
}

// Every response that carries an IP is marked no-store, so neither the
// browser nor a proxy or CDN in between keeps a copy that a shared
// cache could later serve to a different visitor of the same page.
export const NO_STORE = { 'Cache-Control': 'no-store' } as const;

// Shared by the Web-standard wrappers for Vercel and Cloudflare Pages,
// which pass a Request in and get a JSON Response back, so both hosts
// return the same body with the same no-store header as Node does.
export async function contextResponse(request: Request, env: ContextEnv, socketIp?: string | null): Promise<Response> {
  const ctx = await getContext({ headers: request.headers, ip: socketIp, env });
  return Response.json(ctx, { headers: NO_STORE });
}
