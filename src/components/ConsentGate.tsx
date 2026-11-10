import { useT } from '../i18n/lang';
import { site } from '../site.config';
import { useIsNarrow } from '../useIsNarrow';
import { useAppState, useStoreApi } from '../tracking/store';
import { Terminal } from './Terminal/Terminal';

// The consent gate is the first thing a visitor sees, and nothing on
// the page runs before it: no cookie, no listener and no request to
// the server happens until the visitor presses one of its buttons.
export function ConsentGate() {
  const store = useStoreApi();
  const s = useAppState();
  const t = useT();
  const narrow = useIsNarrow();
  // With outputs on, the second paragraph names each one and its host
  // and says whether the IP goes with the events, so the visitor knows
  // where their data goes before pressing Start on this screen.
  const second = site.outputs.length ? t.consent.bodyOutputs(site.outputs, site.forwardIp) : t.consent.bodyLocal;

  // Start grants consent, sets the cookie and starts the live listeners,
  // while Show sample data runs the page on fictional data, so nothing
  // about the visitor is captured, stored or sent anywhere at all.
  return (
    <section className="consent" id="consent">
      <span className="label" style={{ marginBottom: 40 }}>
        {t.consent.label}
      </span>
      <div className="philosophy">
        <h1>{t.consent.title}</h1>
        {t.consent.body}
        {second}
      </div>
      <div className="pill-row">
        <button
          type="button"
          className="pill pill--black"
          onClick={() => {
            store.grantConsent();
            window.scrollTo({ top: 0 });
          }}
        >
          {t.consent.start}
        </button>
        <button
          type="button"
          className="pill"
          onClick={() => {
            store.startSample();
            window.scrollTo({ top: 0 });
          }}
        >
          {t.consent.sample}
        </button>
      </div>
      {narrow && <Terminal blocks={s.blocks} className="consent__terminal" />}
    </section>
  );
}
