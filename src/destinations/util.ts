import type { Props, SegmentEvent } from '../tracking/events';

// GA4 and warehouses want snake_case names, while Meta wants its event
// names in PascalCase. Converting at this point leaves the source
// events in the Segment spec, the way Segment itself works.
export const snake = (s: string) =>
  s
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/^_|_$/g, '')
    .toLowerCase();

// Meta's standard event names are PascalCase, such as PageView, so this
// capitalizes each word of a Segment event name and drops the spaces
// and punctuation between the words, leaving letters and digits only.
export const pascal = (s: string) => s.replace(/(^|[^A-Za-z0-9]+)([A-Za-z0-9])/g, (_m, _sep, c: string) => c.toUpperCase());

// Renames every property key to snake_case and keeps the values as they
// are, so GA4 params, Meta custom_data and warehouse columns all follow
// the naming convention that each of those destinations expects.
export function snakeProps(p: Props | undefined): Props {
  return Object.fromEntries(Object.entries(p ?? {}).map(([k, v]) => [snake(k), v]));
}

// Page fields live in context.page on track events and in properties
// on page events, so this reads whichever is present and hands every
// formatter one shape for URL, path, title, referrer and search.
export function page(e: SegmentEvent) {
  return (e.context.page ?? e.properties ?? {}) as { url?: string; path?: string; title?: string; referrer?: string; search?: string };
}
