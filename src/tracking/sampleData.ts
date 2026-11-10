import type { AnonInfo } from './anonymousId';
import type { DeviceInfo } from './context';
import type { SegmentEvent } from './events';
import type { ServerContext } from './store';
import { pageTitle, site } from '../site.config';

// Sample mode runs the page on this fictional visit. Every value is
// fixed and made up, so nothing shown in sample mode is read from the
// visitor's browser and the server is never asked for anything.
const ANON = '7c1e9b2a-4f3d-4e8a-9b61-2d5c8f0a3e17';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
// The sample visit arrives from a LinkedIn ad, so the origin section
// has UTM parameters and a click ID to show, the same way a real paid
// visit would carry them on the landing page link it was sent to.
const SEARCH = '?utm_source=linkedin&utm_medium=paid_social&utm_campaign=spring_launch&li_fat_id=demo123';
// The sample URL uses the host the page is served from, so it matches
// whatever domain the deployment runs on instead of a fixed address
// that would look out of place next to the rest of the page.
const URL_ = `${location.origin}/${SEARCH}`;

// A fictional anonymous ID with the same cookie details a real first
// visit would record, using the configured cookie name and this host,
// so the identity section reads the same as it does in live mode.
export const sampleAnon: AnonInfo = {
  anonymousId: ANON,
  cookie: { name: site.cookieName, domain: location.hostname, expires: '2027-10-21T18:00:00.000Z', sameSite: 'Lax' },
  firstSeen: '2026-10-21T18:00:00.000Z',
};

// A typical desktop browser in Mexico City. The values have the same
// shape getDeviceInfo returns, so the device section renders the
// sample visit without branching on which mode the page is in.
export const sampleDevice: DeviceInfo = {
  browser: 'Google Chrome 141',
  os: 'macOS',
  mobile: false,
  language: 'es-MX',
  languages: 'es-MX, es, en',
  timezone: 'America/Mexico_City',
  screen: '1728 × 1117',
  viewport: '1440 × 900',
  pixelRatio: 2,
  colorScheme: 'light',
  reducedMotion: 'no-preference',
  connection: '4g',
  cookiesEnabled: true,
  doNotTrack: 'not set',
  globalPrivacyControl: 'not set',
};

// The full analytics.js context for the sample visit, including the
// Client Hints brands with their decoy entry, matching what the live
// getSegmentContext would build in the same desktop browser.
export const sampleSegmentContext = {
  library: { name: site.libraryName, version: '1.0.0' },
  userAgent: UA,
  userAgentData: {
    brands: [
      { brand: 'Google Chrome', version: '141' },
      { brand: 'Not?A_Brand', version: '8' },
      { brand: 'Chromium', version: '141' },
    ],
    mobile: false,
    platform: 'macOS',
  },
  locale: 'es-MX',
  timezone: 'America/Mexico_City',
  screen: { width: 1728, height: 1117, density: 2, innerWidth: 1440, innerHeight: 900 },
};

// A fixed answer standing in for GET /api/context, so sample mode can
// show an IP, a location and Accept-Language without the server ever
// being called or seeing a request from this visitor's browser.
export const sampleServer: ServerContext = {
  ip: '189.203.114.27',
  geo: { country: 'MX', region: 'CDMX', city: 'Mexico City', source: 'ip-lookup' },
  acceptLanguage: 'es-MX,es;q=0.9,en;q=0.8',
  receivedAt: '2026-10-21T18:00:00.412Z',
};

// The cookie string sample mode prints in place of document.cookie,
// since no cookie is set in sample mode and the real one would be
// empty or would belong to an earlier live visit on this device.
export const sampleCookie = `${site.cookieName}=${ANON}`;

// The light context every sample event carries, the same shape that
// getEventContext builds in live mode, with the page set to the
// sample landing URL and a LinkedIn referrer for the ad click.
const ctx = {
  library: { name: site.libraryName, version: '1.0.0' },
  page: { url: URL_, path: '/', title: pageTitle('en'), referrer: 'https://www.linkedin.com/', search: SEARCH },
  userAgent: UA,
  locale: 'es-MX',
  timezone: 'America/Mexico_City',
};

// Each sample event is placed a given number of seconds into the visit
// with a counter numbering its message ID, so the sample tail reads the
// same on every load and always lists the events in the same order.
let n = 0;
const ev = (secs: number, partial: Partial<SegmentEvent>): SegmentEvent => ({
  type: 'track',
  anonymousId: ANON,
  userId: null,
  context: ctx,
  timestamp: new Date(Date.parse('2026-10-21T18:00:00.000Z') + secs * 1000).toISOString(),
  messageId: `sample-${String(++n).padStart(4, '0')}-0000-4000-8000-000000000000`,
  ...partial,
});

// The sample page event carries the campaign and click IDs of the ad
// click in its context, which is where a CDP keeps them for the
// origin section and for every destination that maps attribution.
export const samplePage: SegmentEvent = ev(0, {
  type: 'page',
  properties: { ...ctx.page },
  context: {
    ...ctx,
    campaign: { source: 'linkedin', medium: 'paid_social', name: 'spring_launch', term: null, content: null },
    clickIds: { gclid: null, fbclid: null, msclkid: null, ttclid: null, li_fat_id: 'demo123' },
  },
});

// Shorthand for a sample track event with a name and its properties,
// placed at a given second so the sample live tail spreads out over
// the first minutes of a visit the way a real reader's events would.
const track = (secs: number, event: string, properties: Record<string, unknown>) => ev(secs, { event, properties });

// The sample live tail: the page event, then the sections, scroll
// depths, a tab switch and a click that a reader would produce while
// moving through the first five sections in about a minute and a half.
export const sampleEvents: SegmentEvent[] = [
  samplePage,
  track(2, 'Section Viewed', { section: '01_identity' }),
  track(9, 'Section Viewed', { section: '02_origin' }),
  track(11, 'Scroll Depth Reached', { percent: 25 }),
  track(18, 'Section Viewed', { section: '03_device' }),
  track(30, 'Time On Page', { seconds: 30 }),
  track(34, 'Section Viewed', { section: '04_location' }),
  track(41, 'Scroll Depth Reached', { percent: 50 }),
  track(47, 'Tab Hidden', {}),
  track(73, 'Tab Visible', { hiddenSeconds: 26 }),
  track(79, 'Section Viewed', { section: '05_behavior' }),
  track(84, 'Element Clicked', { text: 'Reload as if from a LinkedIn ad', elementType: 'button' }),
];
