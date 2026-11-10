import { useEffect, useState } from 'react';
import { getDeviceInfo, getSegmentContext, type DeviceInfo } from './context';
import { sampleDevice, sampleSegmentContext } from './sampleData';
import type { Mode } from './store';

// Device details are read again on every render. Resizing the window
// or switching to dark mode triggers one, so the values shown in the
// device section change while the visitor is watching the page.
export function useDevice(mode: Mode): { device: DeviceInfo; context: ReturnType<typeof getSegmentContext> | typeof sampleSegmentContext } {
  const [tick, setTick] = useState(0);
  // Resize and color scheme changes bump a counter in live mode only,
  // which renders the hook again so the device section picks up the new
  // viewport or theme without anything polling the browser for it.
  useEffect(() => {
    if (mode !== 'live') return;
    const bump = () => setTick((t) => t + 1);
    window.addEventListener('resize', bump);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', bump);
    return () => {
      window.removeEventListener('resize', bump);
      mq.removeEventListener('change', bump);
    };
  }, [mode]);
  // The counter is never read for its value. Touching it keeps linters
  // from flagging it as unused, since the render it causes is the only
  // thing it is for, and every render reads the device details afresh.
  void tick;
  // Sample mode returns fixed values and attaches no listeners, so a
  // visitor who declined sees what would be collected without any of
  // it being read from their own browser or sent to the server.
  if (mode === 'sample') return { device: sampleDevice, context: sampleSegmentContext };
  return { device: getDeviceInfo(), context: getSegmentContext() };
}
