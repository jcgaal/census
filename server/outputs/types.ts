// One event as the page builds it and as /api/collect accepts it. It
// mirrors the browser's SegmentEvent type, so the server can check
// every field without importing code that only runs in the browser.
export interface CollectEvent {
  type: 'page' | 'track' | 'identify';
  event?: string;
  properties?: Record<string, unknown>;
  traits?: Record<string, unknown>;
  anonymousId: string;
  userId: string | null;
  context: Record<string, unknown>;
  timestamp: string;
  messageId: string;
}

// What one output did with one batch. The payload is the exact body it
// sent, without any key or secret, so the page can show the visitor
// the JSON that left the server and say whether it got through.
export interface OutputResult {
  output: string;
  host: string;
  status: 'sent' | 'failed' | 'skipped';
  httpStatus?: number;
  payload: unknown;
}

// An enabled output. The name and host are all the page ever learns
// about it, so a write key or a webhook secret stays on the server
// and only the place the events go to is shown to the visitor.
export interface Output {
  name: string;
  host: string;
  send(events: CollectEvent[]): Promise<OutputResult>;
}

// The settings outputs read. Every one is optional, so a deployment
// that sets none of them has no output at all and the page keeps
// every event in the browser, exactly as it did before outputs.
export interface OutputEnv {
  SEGMENT_WRITE_KEY?: string;
  SEGMENT_ENDPOINT?: string;
  RUDDERSTACK_WRITE_KEY?: string;
  RUDDERSTACK_DATA_PLANE_URL?: string;
  WEBHOOK_URL?: string;
  WEBHOOK_SECRET?: string;
  OUTPUT_FORWARD_IP?: string;
  COLLECT_RATE_LIMIT?: string;
}

// Each send gives up after three seconds and is never retried, so a
// slow or broken output delays only its own result and cannot hold
// up the reply that the page is waiting for from /api/collect.
export const SEND_TIMEOUT_MS = 3000;

// Posts one JSON body and turns the outcome into a result. Any network
// error or timeout counts as failed without a status, and the error
// itself is dropped, so nothing about the request reaches a log.
export async function postJson(name: string, host: string, url: string, body: unknown, headers: Record<string, string>, text?: string): Promise<OutputResult> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: text ?? JSON.stringify(body),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    return { output: name, host, status: res.ok ? 'sent' : 'failed', httpStatus: res.status, payload: body };
  } catch {
    return { output: name, host, status: 'failed', payload: body };
  }
}

// Reads an http or https URL from a setting and returns it without a
// trailing slash, or null when it is missing or malformed, so a typo
// in a setting turns that output off instead of failing each send.
export function httpUrl(value: string | undefined): URL | null {
  if (!value?.trim()) return null;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
}
