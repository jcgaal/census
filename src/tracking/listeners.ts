import type { Store } from './store';

const DEPTHS = [25, 50, 75, 100];

// Behavior listeners are attached only after consent, in live mode.
// The function returned here removes every one of them, so Forget
// me stops all tracking at the moment the visitor presses the button.
export function attachListeners(store: Store): () => void {
  const reached = new Set<number>();
  let visibleSeconds = 0;
  let hiddenAt: number | null = null;

  // Scroll depth fires once per threshold, the way analytics tools
  // usually report it, so scrolling up and down again does not flood
  // the event stream with the same milestone a second or third time.
  const onScroll = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight;
    if (max <= 0) return;
    const pct = ((window.scrollY + window.innerHeight) / max) * 100;
    // Half a percent of slack lets the 100 mark fire on pages where the
    // bottom ends a fraction of a pixel short of the full scroll height,
    // which happens with browser zoom and fractional device pixel ratios.
    for (const d of DEPTHS) {
      if (pct >= d - 0.5 && !reached.has(d)) {
        reached.add(d);
        store.track('Scroll Depth Reached', { percent: d });
      }
    }
  };

  // Clicks are recorded on buttons and links only. The label is the
  // visible text or aria-label, cut to 80 characters, and no form
  // field is ever read, so nothing typed on the page gets captured.
  const onClick = (e: MouseEvent) => {
    const el = (e.target as Element | null)?.closest?.('button, a, [role="button"]');
    if (!el) return;
    const text = ((el as HTMLElement).innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    store.track('Element Clicked', { text, elementType: el.tagName.toLowerCase() });
  };

  // Switching tabs is recorded in both directions. When the visitor
  // comes back, the event says how long the tab was hidden, which
  // is how engaged time is usually told apart from idle time.
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      store.track('Tab Hidden');
    } else {
      const hiddenSeconds = hiddenAt ? Math.round((Date.now() - hiddenAt) / 1000) : undefined;
      hiddenAt = null;
      store.track('Tab Visible', hiddenSeconds !== undefined ? { hiddenSeconds } : {});
    }
  };

  // Time on page counts visible seconds only and reports every thirty
  // seconds, so a tab left open in the background does not keep
  // inflating a number that is meant to measure the visitor's attention.
  const tick = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    visibleSeconds++;
    if (visibleSeconds % 30 === 0) store.track('Time On Page', { seconds: visibleSeconds });
  }, 1000);

  // Clicks are caught in the capture phase, so a component that stops
  // propagation cannot hide one, and scroll is passive, so tracking
  // never delays scrolling while the browser waits for the handler.
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('click', onClick, true);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('visibilitychange', onVisibility);
    window.clearInterval(tick);
  };
}
