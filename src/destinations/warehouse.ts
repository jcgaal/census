import type { Formatter } from './types';
import { page, snake, snakeProps } from './util';

// Warehouses get one row per event, in the columns Segment's warehouse
// sync creates: flattened context_ fields, snake_case properties,
// and the sent, received and original timestamps side by side.
export const warehouse: Formatter = (input, t) => {
  const e = input.event;
  if (!e) return { name: 'Data warehouse', endpoint: t.warehouseTracks, body: null };
  const p = page(e);
  const ctx = e.context as { library?: { name: string; version: string }; locale?: string; timezone?: string; userAgent?: string };
  // A warehouse sync stamps received_at and uuid_ts when it loads a row,
  // so both use the current time, while the event's own timestamp
  // fills the sent, original and timestamp columns of the preview.
  const now = new Date().toISOString();
  const common = {
    id: e.messageId,
    anonymous_id: e.anonymousId,
    user_id: input.identify?.userId ?? e.userId,
    context_library_name: ctx.library?.name,
    context_library_version: ctx.library?.version,
    context_locale: ctx.locale,
    context_timezone: ctx.timezone,
    context_user_agent: ctx.userAgent,
    context_page_path: p.path,
    context_page_url: p.url,
    original_timestamp: e.timestamp,
    sent_at: e.timestamp,
    received_at: now,
    timestamp: e.timestamp,
    uuid_ts: now,
  };
  const row =
    e.type === 'page'
      ? { ...common, path: p.path, url: p.url, title: p.title, referrer: p.referrer, search: p.search }
      : { ...common, event: snake(e.event ?? ''), event_text: e.event, ...Object.fromEntries(Object.entries(snakeProps(e.properties)).map(([k, v]) => [k, v])) };
  return {
    name: 'Data warehouse',
    endpoint: e.type === 'page' ? t.warehousePages : t.warehouseTracks,
    body: row,
  };
};
