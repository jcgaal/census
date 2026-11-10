import { useEffect, useState } from 'react';

// The breakpoint below which the terminal panel is dropped from the
// side of the page. It matches the single-column media queries in the
// stylesheets, so layout and panel visibility switch at one width.
const QUERY = '(max-width: 999px)';

// Tracks whether the viewport is under the narrow breakpoint and keeps
// it current on resize, so App renders the terminal panel only when a
// second column fits and the narrow layout never mounts it at all.
export function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}
