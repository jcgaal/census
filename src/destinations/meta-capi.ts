import type { Formatter } from './types';
import { page, pascal, snakeProps } from './util';

// The Conversions API matches people on normalized, SHA-256-hashed
// identifiers in em, so the raw email never enters this payload, and
// event_id reuses messageId so Meta can deduplicate against its pixel.
export const metaCapi: Formatter = (input, t) => {
  const e = input.event;
  // Meta wants event_time in whole Unix seconds rather than the ISO
  // string Segment uses, and em holds only the hash, or nothing at all
  // until the visitor has identified with an email on this page.
  const body = e && {
    data: [
      {
        event_name: e.type === 'page' ? 'PageView' : pascal(e.event ?? 'Event'),
        event_time: Math.floor(new Date(e.timestamp).getTime() / 1000),
        event_id: e.messageId,
        action_source: 'website',
        event_source_url: page(e).url,
        user_data: {
          em: input.emailHash ? [input.emailHash] : undefined,
          client_user_agent: input.userAgent,
        },
        custom_data: e.type === 'track' ? snakeProps(e.properties) : undefined,
      },
    ],
  };
  return {
    name: 'Meta Conversions API',
    endpoint: 'POST https://graph.facebook.com/{api-version}/{pixel-id}/events',
    note: input.emailHash ? t.metaHashed : t.metaNoEmail,
    body,
  };
};
