import type { Copy } from '../i18n/lang';
import type { SegmentEvent } from '../tracking/events';

// The page promises visitors that nothing leaves for these companies,
// so every formatter here only builds a payload to display, and no
// file under src/destinations ever sends a request or calls an API.

// What every formatter receives: the most recent page or track event,
// the identify call if the visitor gave an email, its SHA-256 hash and
// the user agent, so each preview reshapes the same latest activity.
export interface DestinationInput {
  event: SegmentEvent | null;
  identify: SegmentEvent | null;
  emailHash: string | null;
  userAgent: string;
}

// One card in the destinations section: the product name, the endpoint
// the payload would be posted to, an optional note and the body, which
// is shown as JSON and never leaves the visitor's own browser.
export interface DestinationPreview {
  name: string;
  endpoint: string;
  note?: string;
  body: unknown;
}

// The localized notes and endpoint labels a formatter can show, taken
// from the current language's copy, so the formatters hold no text of
// their own and the previews read the same in every language.
export type DestinationStrings = Copy['term']['dest'];

// A formatter is a pure function from input and strings to a preview,
// so it can run on every render without side effects, and it returns
// a payload object rather than a request it could ever send.
export type Formatter = (input: DestinationInput, strings: DestinationStrings) => DestinationPreview;
