import { getCampaign, getEventContext, getPageProps } from './context';

// Properties, traits and context are open records, as in the Segment
// spec, so each event can carry whatever fields its call site sets and
// the formatters read only the keys they know how to map onward.
export type Props = Record<string, unknown>;

// Events follow the Segment spec: page, track and identify calls that
// carry an anonymousId, an optional userId, a context object and a
// timestamp. Every destination preview reshapes this one format.
export interface SegmentEvent {
  type: 'page' | 'track' | 'identify';
  event?: string;
  properties?: Props;
  traits?: Props;
  anonymousId: string;
  userId: string | null;
  context: Props;
  timestamp: string;
  messageId: string;
}

// The identity pair stamped onto every event, so the anonymous ID set
// on the first visit and the user ID set by identify travel together
// on page, track and identify calls alike, the way Segment sends them.
interface Ids {
  anonymousId: string;
  userId: string | null;
}

// Every event gets a fresh messageId and timestamp when it is built.
// The messageId is what lets a destination drop duplicates, and
// Meta's preview reuses it as event_id for that same reason.
const base = (ids: Ids) => ({
  anonymousId: ids.anonymousId,
  userId: ids.userId,
  timestamp: new Date().toISOString(),
  messageId: crypto.randomUUID(),
});

// Only the page event carries campaign and click IDs. Attribution is
// decided by where the visit started, so later events get a light
// context and do not repeat the UTM parameters on every line.
export function buildPage(ids: Ids): SegmentEvent {
  return {
    type: 'page',
    properties: getPageProps(),
    context: { ...getEventContext(), ...getCampaign() },
    ...base(ids),
  };
}

// Track events record one named action with its properties and carry
// the light context without campaign fields, so attribution stays on
// the page event that started the visit and is never counted twice.
export function buildTrack(event: string, properties: Props, ids: Ids): SegmentEvent {
  return { type: 'track', event, properties, context: getEventContext(), ...base(ids) };
}

// Identify ties the traits the visitor typed to the anonymous ID, so
// every later event and destination preview can be linked to the same
// person by the user ID or by the hash of the email they entered.
export function buildIdentify(traits: Props, ids: Ids): SegmentEvent {
  return { type: 'identify', traits, context: getEventContext(), ...base(ids) };
}

// Formats properties for the live tail on one line, such as the text
// { section: "04_location" }, so each event fits a single row and the
// event itself is never changed by the way it is printed there.
export function compactProps(p: Props | undefined): string {
  if (!p) return '';
  const entries = Object.entries(p);
  if (!entries.length) return '{}';
  return `{ ${entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')} }`;
}

// Picks the short label shown beside each event in the live tail: the
// event name for track calls, the path for page calls and the user ID
// for identify calls, so each row says what happened at a glance.
export function eventLabel(e: SegmentEvent): string {
  if (e.type === 'track') return e.event ?? '';
  if (e.type === 'page') return String(e.properties?.path ?? '/');
  return e.userId ?? '';
}

// Prints an event's time as a 24-hour clock in the visitor's own time
// zone, so the live tail reads like a log without dates taking space
// on rows that all belong to the same short visit to the page.
export function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour12: false });
}
