import type { SegmentEvent } from '../tracking/events';

// What one output did with one batch, as /api/collect reports it. The
// payload is the exact body the server sent on, with the IP already
// removed, which is what the terminal prints for the visitor to see.
export interface OutputResult {
  output: string;
  host: string;
  status: 'sent' | 'failed' | 'skipped';
  httpStatus?: number;
  payload: unknown;
}

// One batch the page posted and what came back. Error holds the HTTP
// status when /api/collect itself refused the batch, or 'network' when
// no answer arrived, so the terminal can say why nothing was sent.
export interface SentBatch {
  events: SegmentEvent[];
  results: OutputResult[];
  error?: number | 'network';
}

// The collector the store drives. It queues events from the moment of
// consent, sends only once enabled, and after stop it drops its queue
// and every late answer, which is what Forget me relies on here.
export interface Collector {
  add(e: SegmentEvent): void;
  enable(): void;
  stop(): void;
}

// At most one timed send a second, and at most 20 events a request,
// which is the number /api/collect accepts, so a long visit turns into
// a steady trickle of small batches rather than a request per event.
const MIN_GAP_MS = 1000;
const MAX_EVENTS = 20;
// Each request stays well under the 64 KB that /api/collect accepts and
// that browsers allow for keepalive requests, so a batch sent while
// the tab is closing is not dropped by the browser for its size.
const MAX_BODY = 56 * 1024;

// Splits the queue into requests of at most 20 events and about 56 KB,
// the limits /api/collect enforces, so a burst of clicks becomes a
// few small posts instead of one request that the server refuses.
function chunk(events: SegmentEvent[]): SegmentEvent[][] {
  const out: SegmentEvent[][] = [];
  let cur: SegmentEvent[] = [];
  let size = 0;
  for (const e of events) {
    const n = JSON.stringify(e).length;
    if (cur.length && (cur.length >= MAX_EVENTS || size + n > MAX_BODY)) {
      out.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(e);
    size += n;
  }
  if (cur.length) out.push(cur);
  return out;
}

// Creates the collector for one consented visit. Sends happen at most
// once a second, plus once more when the tab is hidden, using a
// keepalive request so that batch still leaves as the tab closes.
export function createCollector(onBatch: (b: SentBatch) => void): Collector {
  let queue: SegmentEvent[] = [];
  let enabled = false;
  let stopped = false;
  let lastSent = 0;
  let timer: number | null = null;

  // Posts one chunk to the page's own server and reports the outcome.
  // An answer that arrives after stop belongs to an erased visit,
  // so it is dropped instead of being printed in the terminal.
  async function post(events: SegmentEvent[], keepalive: boolean) {
    let batch: SentBatch;
    try {
      const res = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive,
      });
      const data = (await res.json().catch(() => null)) as { results?: OutputResult[] } | null;
      batch = res.ok && data?.results ? { events, results: data.results } : { events, results: [], error: res.status };
    } catch {
      batch = { events, results: [], error: 'network' };
    }
    if (!stopped) onBatch(batch);
  }

  // Sends everything queued so far. The timed flush keeps to one send a
  // second, while the flush on a hidden tab goes at once, since it may
  // be the last chance before the visitor closes the tab entirely.
  function flush(keepalive: boolean) {
    if (!enabled || stopped || !queue.length) return;
    const events = queue;
    queue = [];
    lastSent = Date.now();
    for (const c of chunk(events)) void post(c, keepalive);
  }

  // Arms a single timer for the next allowed send, so events that
  // arrive close together leave in one batch rather than one request
  // each, and nothing is scheduled while the collector is not enabled.
  function schedule() {
    if (!enabled || stopped || timer !== null || !queue.length) return;
    const wait = Math.max(0, lastSent + MIN_GAP_MS - Date.now());
    timer = window.setTimeout(() => {
      timer = null;
      flush(false);
    }, wait);
  }

  // The hidden-tab flush waits one tick, so the Tab Hidden event that
  // the behavior listener records for the same change is already in
  // the queue and leaves with the rest of the batch it belongs to.
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') window.setTimeout(() => flush(true), 0);
  };

  return {
    add(e) {
      if (stopped) return;
      queue.push(e);
      schedule();
    },
    // Called once the server has confirmed that its outputs are the
    // ones the consent gate named. Events queued since consent go out
    // in the first batch, and later ones follow at most once a second.
    enable() {
      if (stopped || enabled) return;
      enabled = true;
      document.addEventListener('visibilitychange', onVisibility);
      schedule();
    },
    stop() {
      stopped = true;
      queue = [];
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
