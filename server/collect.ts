import { clientIp, header, NO_STORE, type HeaderSource } from './context.js';
import { buildOutputs, type CollectEvent, type OutputEnv, type OutputResult } from './outputs/index.js';

// POST /api/collect checks a batch from the page, strips the IP and
// forwards it to every enabled output. Nothing about the request or
// its payload is logged or stored, the same as /api/context.

// The size limits for one request: at most 20 events and 64 KB of body
// text. The Node server checks the byte count while reading, so a body
// over the limit is turned away before all of it sits in memory.
export const MAX_EVENTS = 20;
export const MAX_BYTES = 64 * 1024;

// What each host hands to collect: the method, headers, raw body text,
// the socket address as a fallback for the client IP, the host the
// request was sent to and the settings that turn outputs on.
export interface CollectInput {
  method: string;
  headers: HeaderSource;
  host: string | null | undefined;
  body: string;
  ip: string | null | undefined;
  env: OutputEnv;
}

// The status and JSON body that every host sends back. Each answer is
// sent with Cache-Control: no-store, so no cache keeps the results
// or the payloads, which may hold an email the visitor typed in.
export interface CollectReply {
  status: number;
  body: { results: OutputResult[] } | { error: string };
}

// Requests per IP in the current one-minute window. Entries are purged
// once their window ends, so an address is held in memory for at most
// a minute and is never written anywhere or printed to any log.
const windows = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;

// Counts one request for this IP and says whether it is over the limit.
// Expired windows are swept on every call, which keeps the map small
// and drops each address as soon as its minute has run out.
function overLimit(ip: string, limit: number, now: number): boolean {
  for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
  const w = windows.get(ip) ?? { count: 0, resetAt: now + WINDOW_MS };
  w.count++;
  windows.set(ip, w);
  return w.count > limit;
}

// The fields the page's event builder produces, by event part. Only
// these keys are accepted, so a request cannot slip an IP, a device
// ID or any other field into the events that leave this server.
const TOP = new Set(['type', 'event', 'properties', 'traits', 'anonymousId', 'userId', 'context', 'timestamp', 'messageId']);
const CONTEXT = new Set(['library', 'page', 'userAgent', 'locale', 'timezone', 'campaign', 'clickIds']);
const PAGE = new Set(['url', 'path', 'title', 'referrer', 'search']);
const LIBRARY = new Set(['name', 'version']);
const CAMPAIGN = new Set(['source', 'medium', 'name', 'term', 'content']);
const CLICK_IDS = new Set(['gclid', 'fbclid', 'msclkid', 'ttclid', 'li_fat_id']);
const TRAITS = new Set(['email', 'name', 'company']);
const TRACK_PROPS: Record<string, Set<string>> = {
  'Section Viewed': new Set(['section']),
  'Scroll Depth Reached': new Set(['percent']),
  'Element Clicked': new Set(['text', 'elementType']),
  'Time On Page': new Set(['seconds']),
  'Tab Hidden': new Set(),
  'Tab Visible': new Set(['hiddenSeconds']),
  'Form Started': new Set(['form']),
};

// Small type checks for the validator: a plain object, a string of
// bounded length, and a scalar value, which is the only kind of value
// the flat parts of an event may hold, nested objects never allowed.
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const shortStr = (v: unknown, max = 2048): v is string => typeof v === 'string' && v.length <= max;
const scalar = (v: unknown) => v === null || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)) || shortStr(v);

// True when the value is an object whose keys are all allowed and
// whose values are plain strings, numbers, booleans or null, which
// is the shape of every flat object the event builder produces.
function flat(v: unknown, keys: Set<string>): boolean {
  return isObj(v) && Object.entries(v).every(([k, x]) => keys.has(k) && scalar(x));
}

// Context may hold only the parts the builder adds, each in its own
// shape. The user agent and locale are strings, and the page,
// library, campaign and click IDs are flat objects of known keys.
function validContext(c: unknown): boolean {
  if (!isObj(c)) return false;
  return Object.entries(c).every(([k, v]) => {
    if (!CONTEXT.has(k)) return false;
    if (k === 'page') return flat(v, PAGE);
    if (k === 'library') return flat(v, LIBRARY);
    if (k === 'campaign') return flat(v, CAMPAIGN);
    if (k === 'clickIds') return flat(v, CLICK_IDS);
    return shortStr(v, 1024);
  });
}

// Checks one event against the builder's output: a known type, IDs
// and times as short strings, and properties or traits limited to
// the keys that the page sets for that particular kind of call.
function validEvent(e: unknown): e is CollectEvent {
  if (!isObj(e) || !Object.keys(e).every((k) => TOP.has(k))) return false;
  if (!shortStr(e.anonymousId, 64) || !shortStr(e.messageId, 64) || !shortStr(e.timestamp, 40) || Number.isNaN(Date.parse(e.timestamp))) return false;
  if (!(e.userId === null || shortStr(e.userId, 64)) || !validContext(e.context)) return false;
  if (e.type === 'page') return e.event === undefined && e.traits === undefined && flat(e.properties, PAGE);
  if (e.type === 'track') {
    const keys = typeof e.event === 'string' ? TRACK_PROPS[e.event] : undefined;
    return keys !== undefined && e.traits === undefined && flat(e.properties ?? {}, keys);
  }
  if (e.type === 'identify') return e.event === undefined && e.properties === undefined && flat(e.traits, TRAITS);
  return false;
}

// Rebuilds each event with the visitor's IP only when the site owner
// set OUTPUT_FORWARD_IP=true. Otherwise no IP is added, and Segment
// and RudderStack then write 0.0.0.0 in place of an address.
function withIp(events: CollectEvent[], ip: string | null, forward: boolean): CollectEvent[] {
  return events.map((e) => ({ ...e, context: forward && ip ? { ...e.context, ip } : { ...e.context } }));
}

// Same-origin only: the Origin header must name the host the request
// was sent to, so another site cannot post events through this one,
// and a request with no Origin header at all is refused as well.
function sameOrigin(headers: HeaderSource, host: string | null | undefined): boolean {
  const origin = header(headers, 'origin');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Handles one request from start to finish and returns the reply. Each
// output is sent the same stripped batch at the same time, and one
// that fails or times out never blocks the others from answering.
export async function collect({ method, headers, host, body, ip: socketIp, env }: CollectInput): Promise<CollectReply> {
  if (method !== 'POST') return { status: 405, body: { error: 'method not allowed' } };
  const outputs = buildOutputs(env);
  if (!outputs.length) return { status: 404, body: { error: 'no outputs enabled' } };
  if (!sameOrigin(headers, host)) return { status: 403, body: { error: 'cross-origin request' } };
  if (new TextEncoder().encode(body).length > MAX_BYTES) return { status: 413, body: { error: 'payload too large' } };
  const ip = clientIp(headers, socketIp);
  const limit = Number(env.COLLECT_RATE_LIMIT) > 0 ? Number(env.COLLECT_RATE_LIMIT) : 60;
  if (overLimit(ip ?? 'unknown', limit, Date.now())) return { status: 429, body: { error: 'rate limited' } };
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { status: 400, body: { error: 'invalid JSON' } };
  }
  if (!isObj(parsed) || Object.keys(parsed).some((k) => k !== 'events') || !Array.isArray(parsed.events)) return { status: 400, body: { error: 'expected { events: [...] }' } };
  const events: unknown[] = parsed.events;
  if (events.length < 1 || events.length > MAX_EVENTS || !events.every(validEvent)) return { status: 400, body: { error: 'invalid events' } };
  const batch = withIp(events as CollectEvent[], ip, env.OUTPUT_FORWARD_IP === 'true');
  const results = await Promise.all(outputs.map((o) => o.send(batch)));
  return { status: 200, body: { results } };
}

// Shared by the Web-standard wrappers for Vercel and Cloudflare Pages.
// The host comes from the request URL, and an oversized body is turned
// away by its Content-Length before any of it is read into memory.
export async function collectResponse(request: Request, env: OutputEnv, socketIp?: string | null): Promise<Response> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  const reply =
    declared > MAX_BYTES
      ? ({ status: 413, body: { error: 'payload too large' } } satisfies CollectReply)
      : await collect({ method: request.method, headers: request.headers, host: new URL(request.url).host, body: await request.text(), ip: socketIp, env });
  return Response.json(reply.body, { status: reply.status, headers: NO_STORE });
}
