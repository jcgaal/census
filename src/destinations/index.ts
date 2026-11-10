import { ga4 } from './ga4';
import { hubspot } from './hubspot';
import { metaCapi } from './meta-capi';
import type { DestinationInput, DestinationPreview, DestinationStrings, Formatter } from './types';
import { warehouse } from './warehouse';

// The destination types are re-exported here, so the section imports
// the registry and everything it needs to type a preview from a single
// module and never reaches into the individual formatter files.
export type { DestinationInput, DestinationPreview, DestinationStrings, Formatter } from './types';

// The ordered registry. The destinations section shows one preview
// per entry in this order, so adding a destination means one new file
// next to this one and one more formatter in the list below.
export const destinations: Formatter[] = [ga4, metaCapi, hubspot, warehouse];

// Builds every preview from the same input in registry order. It only
// maps formatters over the input and never sends, so the section can
// call it on each new event without anything leaving the browser.
export function allDestinations(input: DestinationInput, t: DestinationStrings): DestinationPreview[] {
  return destinations.map((format) => format(input, t));
}
