import type { Formatter } from './types';
import { page, snake, snakeProps } from './util';

// GA4's terms forbid sending personally identifiable information such
// as an email, so only client_id, user_id and company go. The anonymous
// ID becomes client_id, and the event time is given in microseconds.
export const ga4: Formatter = (input, t) => {
  const e = input.event;
  const traits = input.identify?.traits ?? {};
  // Page calls become page_view, the name GA4 reserves for a page load,
  // and every event sets engagement_time_msec, which GA4 needs before
  // the activity can show up in its reports, such as Realtime.
  const body = e && {
    client_id: e.anonymousId,
    user_id: input.identify?.userId ?? e.userId ?? undefined,
    timestamp_micros: String(new Date(e.timestamp).getTime() * 1000),
    user_properties: traits.company ? { company: { value: traits.company } } : undefined,
    events: [
      {
        name: e.type === 'page' ? 'page_view' : snake(e.event ?? 'event'),
        params: {
          page_location: page(e).url,
          page_title: page(e).title,
          page_referrer: page(e).referrer || undefined,
          engagement_time_msec: 100,
          ...(e.type === 'track' ? snakeProps(e.properties) : {}),
        },
      },
    ],
  };
  return {
    name: 'Google Analytics 4 · Measurement Protocol',
    endpoint: 'POST https://www.google-analytics.com/mp/collect?measurement_id=G-XXXXXXX&api_secret=…',
    note: t.gaNote,
    body,
  };
};
