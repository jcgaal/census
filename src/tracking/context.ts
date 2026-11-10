import { site } from '../site.config';

// Browsers differ in what they expose. A value the browser does not
// provide is labeled as missing rather than guessed, so the page
// never shows the visitor any data it did not actually read.
export const NOT_EXPOSED = 'not exposed by this browser';

interface UABrand {
  brand: string;
  version: string;
}
interface UAData {
  brands: UABrand[];
  mobile: boolean;
  platform: string;
}
type Nav = Navigator & {
  userAgentData?: UAData;
  connection?: { effectiveType?: string };
  globalPrivacyControl?: boolean;
};

const nav = () => navigator as Nav;

// The device details shown in section 03. Fields that a browser may
// hide are typed loosely, so each one can hold the NOT_EXPOSED label
// instead of being left blank or filled in with a guessed value.
export interface DeviceInfo {
  browser: string;
  os: string;
  mobile: boolean | string;
  language: string;
  languages: string;
  timezone: string;
  screen: string;
  viewport: string;
  pixelRatio: number;
  colorScheme: string;
  reducedMotion: string;
  connection: string;
  cookiesEnabled: boolean;
  doNotTrack: string;
  globalPrivacyControl: string;
}

// The user agent string is the fallback for browsers without Client
// Hints. Order matters: Edge and Opera also say Chrome in their user
// agents, so both are matched first and Chrome only after them.
function parseBrowser(ua: string): string {
  const rules: [string, RegExp][] = [
    ['Edge', /Edg(?:A|iOS)?\/([\d.]+)/],
    ['Opera', /OPR\/([\d.]+)/],
    ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
    ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
    ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/],
  ];
  for (const [name, re] of rules) {
    const m = ua.match(re);
    if (m) return `${name} ${m[1].split('.').slice(0, 2).join('.')}`;
  }
  return 'unknown';
}

// Operating systems are read the same way. iOS is checked first, as
// its user agent also says "like Mac OS X", and each version is
// kept as precise as the user agent string allows it to be.
function parseOS(ua: string): string {
  const ios = ua.match(/(?:iPhone|iPad|iPod).*? OS (\d+(?:_\d+)*)/);
  if (ios) return `iOS ${ios[1].replace(/_/g, '.')}`;
  const android = ua.match(/Android (\d+(?:\.\d+)*)/);
  if (android) return `Android ${android[1]}`;
  const windows = ua.match(/Windows NT (\d+\.\d+)/);
  if (windows) return `Windows (NT ${windows[1]})`;
  const mac = ua.match(/Mac OS X (\d+(?:[_.]\d+)*)/);
  if (mac) return `macOS ${mac[1].replace(/_/g, '.')}`;
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'unknown';
}

// Client Hints include a decoy brand, such as "Not A Brand", meant
// to discourage sniffing. It is skipped, and a specific browser
// name is preferred over the generic Chromium entry it lists.
function brandBrowser(brands: UABrand[]): string | null {
  const real = brands.filter((b) => !/Not.?A.?Brand/i.test(b.brand));
  const pick = real.find((b) => b.brand !== 'Chromium') ?? real[0];
  return pick ? `${pick.brand} ${pick.version}` : null;
}

const mq = (q: string) => window.matchMedia(q).matches;

// This is everything the device section shows. Each value comes from
// a standard browser API, read on the spot, with no fingerprinting
// library, canvas trick or other hidden measurement involved.
export function getDeviceInfo(): DeviceInfo {
  const n = nav();
  const ua = n.userAgent;
  const uad = n.userAgentData;
  const dnt = (n as Navigator & { doNotTrack?: string | null }).doNotTrack;
  return {
    browser: (uad && brandBrowser(uad.brands)) ?? parseBrowser(ua),
    os: uad?.platform ? uad.platform : parseOS(ua),
    mobile: uad ? uad.mobile : /Mobi|Android|iPhone/.test(ua) || screen.width < 768,
    language: n.language,
    languages: (n.languages ?? []).join(', ') || NOT_EXPOSED,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${screen.width} × ${screen.height}`,
    viewport: `${innerWidth} × ${innerHeight}`,
    pixelRatio: devicePixelRatio,
    colorScheme: mq('(prefers-color-scheme: dark)') ? 'dark' : 'light',
    reducedMotion: mq('(prefers-reduced-motion: reduce)') ? 'reduce' : 'no-preference',
    connection: n.connection?.effectiveType ?? NOT_EXPOSED,
    cookiesEnabled: n.cookieEnabled,
    doNotTrack: dnt === undefined ? NOT_EXPOSED : dnt === null || dnt === 'unspecified' ? 'not set' : dnt,
    globalPrivacyControl: n.globalPrivacyControl === undefined ? NOT_EXPOSED : n.globalPrivacyControl ? 'true' : 'not set',
  };
}

// Segment events name the library that sent them. This one names the
// demo, so a warehouse row says where it came from, the same way
// a row from analytics.js or a mobile SDK names its source.
export const LIBRARY = { name: site.libraryName, version: '1.0.0' };

// The full context analytics.js attaches to its events, shown in the
// device section. Track events carry the lighter context further
// down instead, which keeps each line of the live tail short.
export function getSegmentContext() {
  const n = nav();
  const uad = n.userAgentData;
  return {
    library: LIBRARY,
    userAgent: n.userAgent,
    userAgentData: uad ? { brands: uad.brands, mobile: uad.mobile, platform: uad.platform } : NOT_EXPOSED,
    locale: n.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: { width: screen.width, height: screen.height, density: devicePixelRatio, innerWidth, innerHeight },
  };
}

// Page properties match the Segment page call: URL, path, title,
// referrer and query string, all read at the moment the event is
// built rather than cached from the moment the page first loaded.
export function getPageProps() {
  return {
    url: location.href,
    path: location.pathname,
    title: document.title,
    referrer: document.referrer,
    search: location.search,
  };
}

// Ad platforms append their own click IDs to the links they serve.
// Keeping them with the UTM parameters is what lets a later sale
// be credited to the exact ad that brought the visitor here.
const CLICK_IDS = ['gclid', 'fbclid', 'msclkid', 'ttclid', 'li_fat_id'] as const;

// Campaign fields use the Segment context.campaign names, read from the
// UTM parameters, and every click ID is listed even when empty, so the
// origin section can show which ones this visit did not carry.
export function getCampaign() {
  const q = new URLSearchParams(location.search);
  return {
    campaign: {
      source: q.get('utm_source'),
      medium: q.get('utm_medium'),
      name: q.get('utm_campaign'),
      term: q.get('utm_term'),
      content: q.get('utm_content'),
    },
    clickIds: Object.fromEntries(CLICK_IDS.map((k) => [k, q.get(k)])) as Record<(typeof CLICK_IDS)[number], string | null>,
  };
}

// Track and identify events carry this smaller context: library, page,
// user agent, locale and time zone. That is enough for each of the
// destination previews to rebuild the fields that it expects.
export function getEventContext() {
  return {
    library: LIBRARY,
    page: getPageProps(),
    userAgent: navigator.userAgent,
    locale: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
