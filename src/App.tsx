import { useEffect, useRef } from 'react';
import { ConsentGate } from './components/ConsentGate';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Terminal } from './components/Terminal/Terminal';
import { IdentitySection } from './sections/01-Identity';
import { OriginSection } from './sections/02-Origin';
import { DeviceSection } from './sections/03-Device';
import { LocationSection } from './sections/04-Location';
import { BehaviorSection } from './sections/05-Behavior';
import { IdentityResolutionSection } from './sections/06-IdentityResolution';
import { DestinationsSection } from './sections/07-Destinations';
import { LimitsSection } from './sections/08-Limits';
import { ClosingSection } from './sections/09-Closing';
import { site } from './site.config';
import { attachListeners } from './tracking/listeners';
import { useAppState, useStoreApi } from './tracking/store';
import { useIsNarrow } from './useIsNarrow';

// The page shell renders the header, either the consent gate or the
// numbered sections, the terminal on wide screens and the footer, and
// it owns the effects that tie tracking and scrolling to the mode.
export default function App() {
  const store = useStoreApi();
  const s = useAppState();
  const narrow = useIsNarrow();

  // On mount the store resumes a saved consent or starts the sample run
  // for ?sample=1, so a returning visitor goes straight to the sections
  // and a first visitor sees the gate with nothing collected yet.
  useEffect(() => store.init(), [store]);

  // Behavior listeners attach only in live mode, after consent, and the
  // cleanup runs whenever the mode changes, so Forget me removes them
  // and stops collection before the consent gate comes back on screen.
  useEffect(() => {
    if (s.mode !== 'live') return;
    return attachListeners(store);
  }, [s.mode, store]);

  // Forget me sends the visitor back to the top. After a resumed load,
  // such as Reload as if from a LinkedIn ad, the #hash in the URL is
  // honored once, as soon as the section it points to exists.
  const hashHandled = useRef(false);
  useEffect(() => {
    if (s.mode === 'pending') {
      window.scrollTo({ top: 0 });
      return;
    }
    if (hashHandled.current) return;
    hashHandled.current = true;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }, [s.mode]);

  return (
    <>
      <Header />
      <main className="wrapper layout">
        <div className="layout__left">
          {s.mode === 'pending' ? (
            <ConsentGate />
          ) : (
            <>
              <IdentitySection />
              <OriginSection />
              <DeviceSection />
              <LocationSection />
              <BehaviorSection />
              <IdentityResolutionSection />
              <DestinationsSection />
              <LimitsSection />
              {site.closing.enabled && <ClosingSection />}
            </>
          )}
        </div>
        {!narrow && (
          <aside className="layout__right">
            <Terminal blocks={s.blocks} />
          </aside>
        )}
      </main>
      <Footer />
    </>
  );
}
