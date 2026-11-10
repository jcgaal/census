import { apiBase, basicAuth, segmentBatch } from './segment.js';
import { httpUrl, postJson, type CollectEvent, type Output, type OutputEnv } from './types.js';

// RudderStack takes the Segment batch shape. It also fills request_ip
// from the connection unless the event carries one, so request_ip gets
// the same value as context.ip and no address is filled in for it.
function rudderBatch(events: CollectEvent[]) {
  const { batch } = segmentBatch(events);
  return { batch: batch.map((m) => ({ ...m, request_ip: m.context.ip })) };
}

// RudderStack is on when both the write key and the data plane URL are
// set. Requests go to {data plane}/v1/batch with Basic auth, the write
// key as the username, which is the form its HTTP API docs show.
export function rudderstackOutput(env: OutputEnv): Output | null {
  const key = env.RUDDERSTACK_WRITE_KEY?.trim();
  const plane = httpUrl(env.RUDDERSTACK_DATA_PLANE_URL);
  if (!key || !plane) return null;
  const url = `${apiBase(plane)}/v1/batch`;
  return {
    name: 'RudderStack',
    host: plane.host,
    send: (events) => postJson('RudderStack', plane.host, url, rudderBatch(events), { Authorization: basicAuth(key) }),
  };
}
