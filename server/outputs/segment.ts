import { httpUrl, postJson, type CollectEvent, type Output, type OutputEnv } from './types.js';

// The batch body of the Segment HTTP Tracking API. Each message keeps
// its own type, and context.ip is set to 0.0.0.0 unless the server
// forwarded the visitor's IP on purpose, so no address is filled in.
export function segmentBatch(events: CollectEvent[]) {
  return {
    batch: events.map((e) => {
      const { userId, ...rest } = e;
      const context = { ...e.context, ip: typeof e.context.ip === 'string' ? e.context.ip : '0.0.0.0' };
      return { ...rest, ...(userId ? { userId } : {}), context };
    }),
  };
}

// Basic auth with the write key as the username and an empty password,
// as the Segment docs describe, so the key travels only in a header
// and never in the payload that the page shows to the visitor.
export function basicAuth(writeKey: string): string {
  return `Basic ${btoa(`${writeKey}:`)}`;
}

// The API base without a trailing slash or /v1, so both the default
// https://api.segment.io and an EU endpoint given with or without
// its version path end up at the same {endpoint}/v1/batch address.
export function apiBase(u: URL): string {
  return u.toString().replace(/\/+$/, '').replace(/\/v1$/, '');
}

// Segment is on when a write key is set. SEGMENT_ENDPOINT moves it to
// another region, such as events.eu1.segmentapis.com, and a malformed
// endpoint turns the output off rather than sending somewhere wrong.
export function segmentOutput(env: OutputEnv): Output | null {
  const key = env.SEGMENT_WRITE_KEY?.trim();
  const endpoint = httpUrl(env.SEGMENT_ENDPOINT || 'https://api.segment.io');
  if (!key || !endpoint) return null;
  const url = `${apiBase(endpoint)}/v1/batch`;
  return {
    name: 'Segment',
    host: endpoint.host,
    send: (events) => postJson('Segment', endpoint.host, url, segmentBatch(events), { Authorization: basicAuth(key) }),
  };
}
