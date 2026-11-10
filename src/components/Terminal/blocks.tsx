import { useState } from 'react';
import { useT } from '../../i18n/lang';
import { NOT_EXPOSED } from '../../tracking/context';
import { allDestinations } from '../../destinations';
import { site } from '../../site.config';
import { compactProps, eventLabel, timeOf } from '../../tracking/events';
import { buildProfile, currentCookieString, maskIp, useAppState, type Block, type State } from '../../tracking/store';
import { useDevice } from '../../tracking/useDevice';
import { CommandBlock } from './CommandBlock';
import { JsonView, KeyValues, Source } from './JsonView';

// Whoami prints the consent state as the first block, amber while
// the visitor has not chosen yet and green once they have picked
// either the live mode or the sample mode on the consent gate.
function Whoami({ b, s }: { b: Block; s: State }) {
  const t = useT().term;
  const status = s.mode === 'live' ? t.granted : s.mode === 'sample' ? t.sampleConsent : t.pending;
  return (
    <CommandBlock
      blockKey={b.key}
      steps={[{ cmd: 'whoami', output: () => <KeyValues rows={[['consent', <span key="consent" className={s.mode === 'pending' ? 'amber' : 'green'}>{status}</span>]]} /> }]}
    />
  );
}

// Forget prints a short confirmation after the visitor wipes the
// cookie, the stored events and the profile, so the terminal shows
// that the page has started again from a clean anonymous state.
function Forget({ b }: { b: Block }) {
  const t = useT().term;
  // With outputs on, the line also says that sends have stopped and
  // that what already left lives on in those tools, since erasing
  // this page's state cannot reach data held by another service.
  const names = site.outputs.map((o) => o.name);
  const output = () => (
    <>
      <pre className="green">{t.forgot}</pre>
      {names.length > 0 && <pre className="amber">{t.forgotOutputs(names)}</pre>}
    </>
  );
  return <CommandBlock blockKey={b.key} steps={[{ cmd: 'forget --all', output }]} />;
}

// Sent prints one batch the page posted to /api/collect: the events
// in it, what each output answered and the exact body each one got,
// or a note saying why the outputs were not used during this visit.
function Sent({ b }: { b: Block }) {
  const t = useT().term;
  const { batch, note } = b.sent ?? {};
  // A note block has no batch. It explains that nothing was sent,
  // because the server's outputs did not match the consent screen
  // or the server never answered the /api/context request at all.
  if (!batch) {
    const text = note === 'mismatch' ? t.outputsMismatch : t.outputsUnverified;
    return <CommandBlock blockKey={b.key} steps={[{ cmd: 'outputs --check', output: () => <pre className="amber">{text}</pre> }]} />;
  }
  const output = () => (
    <>
      <pre className="val">{batch.events.map((e) => `${e.type.padEnd(9)}${eventLabel(e)}`).join('\n')}</pre>
      {batch.error !== undefined && <pre className="amber">{batch.error === 'network' ? t.sentNoResponse : t.sentError(String(batch.error))}</pre>}
      {batch.results.map((r) => (
        <div key={r.output} className="dest">
          <pre className={r.status === 'sent' ? 'green' : 'amber'}>{`── ${r.output} (${r.host}) ${r.status}${r.httpStatus ? ` ${r.httpStatus}` : r.status === 'failed' ? ` · ${t.sentNoResponse}` : ''}`}</pre>
          <JsonView value={r.payload} />
        </div>
      ))}
      <Source>{site.forwardIp ? t.sentNoteIp : t.sentNote}</Source>
    </>
  );
  return <CommandBlock blockKey={b.key} steps={[{ cmd: 'POST /api/collect', output }]} />;
}

// Identity shows the anonymous id the cookie assigns on the first
// visit, along with when it was first seen, and flags a returning
// visitor only when an earlier cookie was already found in place.
function Identity({ b, s }: { b: Block; s: State }) {
  const t = useT().term;
  const a = s.anon!;
  return (
    <CommandBlock
      blockKey={b.key}
      steps={[
        {
          cmd: 'analytics.anonymousId()',
          output: () => (
            <>
              <JsonView value={{ anonymousId: a.anonymousId, cookie: a.cookie, firstSeen: a.firstSeen, ...(a.returningVisitor ? { returningVisitor: true } : {}) }} />
              <Source>{s.mode === 'sample' ? t.srcCookieSample : t.srcCookie}</Source>
            </>
          ),
        },
      ]}
    />
  );
}

// Origin prints the page event with its campaign and click ids, so
// the visitor sees which UTM tags and ad click ids a platform would
// read from the address they used when they arrived on this page.
function Origin({ b, s }: { b: Block; s: State }) {
  const t = useT().term;
  const p = s.pageEvent!;
  const ctx = p.context as { campaign: unknown; clickIds: unknown };
  return (
    <CommandBlock
      blockKey={b.key}
      steps={[
        {
          cmd: 'analytics.page()',
          output: () => (
            <>
              <JsonView
                value={{
                  type: p.type,
                  anonymousId: p.anonymousId,
                  properties: p.properties,
                  context: { campaign: ctx.campaign, clickIds: ctx.clickIds },
                  timestamp: p.timestamp,
                  messageId: p.messageId,
                }}
              />
              <Source>{t.srcPage}</Source>
            </>
          ),
        },
      ]}
    />
  );
}

// Device lists what the browser exposes without asking, then prints
// the context object a library attaches to every event. Values the
// browser hides are labelled instead of being shown as blank.
function Device({ b, s }: { b: Block; s: State }) {
  const { device: d, context } = useDevice(s.mode);
  const t = useT().term;
  const tr = (v: string) => (v === NOT_EXPOSED ? t.notExposed : v === 'not set' ? t.notSet : v);
  return (
    <CommandBlock
      blockKey={b.key}
      steps={[
        {
          cmd: 'navigator --summary',
          output: () => (
            <KeyValues
              rows={[
                ['browser', d.browser],
                ['os', d.os],
                ['mobile', String(d.mobile)],
                ['language', d.language],
                ['languages', tr(d.languages)],
                ['timezone', d.timezone],
                ['screen', d.screen],
                ['viewport', <>{d.viewport} <span className="muted">({t.live})</span></>],
                ['pixel ratio', String(d.pixelRatio)],
                ['color scheme', d.colorScheme],
                ['reduced motion', d.reducedMotion],
                ['connection', tr(d.connection)],
                ['cookies enabled', String(d.cookiesEnabled)],
                ['do not track', tr(d.doNotTrack)],
                ['global privacy control', tr(d.globalPrivacyControl)],
              ]}
            />
          ),
        },
        {
          cmd: 'cat context.json',
          output: () => (
            <>
              <JsonView value={context} />
              <Source>{t.srcDevice}</Source>
            </>
          ),
        },
      ]}
    />
  );
}

// Location prints what the server reads from the request, with the
// IP masked until the visitor reveals it, so a screen share or a
// screenshot never shows the full address unless they choose to.
function Location({ b, s }: { b: Block; s: State }) {
  const [full, setFull] = useState(false);
  const t = useT().term;
  return (
    <CommandBlock
      blockKey={b.key}
      steps={[
        {
          cmd: 'curl /api/context',
          output: () => {
            if (s.serverStatus === 'loading' || s.serverStatus === 'idle') return <pre className="muted">{t.fetching}</pre>;
            if (s.serverStatus === 'error' || !s.server) return <pre className="amber">{t.fetchError}</pre>;
            const r = s.server;
            return (
              <>
                <JsonView value={{ ...r, ip: full ? r.ip : maskIp(r.ip) }} />
                {r.ip && (
                  <pre className="inline-toggle">
                    <button type="button" className="term-btn" onClick={() => setFull((f) => !f)}>
                      [{full ? t.maskIp : t.showIp}]
                    </button>
                  </pre>
                )}
                {!r.geo && <KeyValues rows={[['geo', <span key="geo" className="amber">{t.geoUnavailable}</span>]]} />}
                <Source>{t.srcLocation}</Source>
              </>
            );
          },
        },
      ]}
    />
  );
}

// Identify prints the identify call, the anonymous events merged
// into the new profile and the hashed email, which is the form ad
// platforms expect when they match a visitor to their own users.
function Identify({ b }: { b: Block }) {
  const d = b.data!;
  const t = useT().term;
  const e = d.identify;
  return (
    <CommandBlock
      blockKey={b.key}
      steps={[
        {
          cmd: 'analytics.identify()',
          output: () => (
            <JsonView value={{ type: e.type, userId: e.userId, anonymousId: e.anonymousId, traits: e.traits, timestamp: e.timestamp, messageId: e.messageId }} />
          ),
        },
        {
          cmd: 'profile.merge(anonymousId → userId)',
          output: () => (
            <>
              {d.merged.map((m) => (
                <div key={m.messageId} className="tail-line green">
                  {`${timeOf(m.timestamp)}  ${m.type.padEnd(10)}${eventLabel(m).padEnd(22)} ${m.userId}`}
                  {m.type === 'track' && <span className="key"> {compactProps(m.properties)}</span>}
                </div>
              ))}
              <pre className="green" style={{ marginTop: 8 }}>
                {t.merged(d.mergedCount, e.userId ?? '')}
              </pre>
            </>
          ),
        },
        {
          cmd: 'sha256(email)',
          output: () => (
            <>
              <KeyValues
                rows={[
                  ['normalized', d.normalizedEmail],
                  ['sha256', d.hash],
                ]}
              />
              <Source>{t.hashNote}</Source>
            </>
          ),
        },
      ]}
    />
  );
}

// Destinations previews how the latest event would be reshaped for
// GA4, Meta, HubSpot and a warehouse. It is a preview only, so the
// payloads are built in the browser and nothing is ever sent out.
function Destinations({ b, s }: { b: Block; s: State }) {
  const { context } = useDevice(s.mode);
  const t = useT().term;
  // The previews are built once when the block prints, so the payloads
  // stay fixed as a record of that moment instead of changing each
  // time a new event arrives while the visitor reads through them.
  const [previews] = useState(() => {
    const last = [...s.events].reverse().find((e) => e.type !== 'identify') ?? null;
    const identify = [...s.events].reverse().find((e) => e.type === 'identify') ?? null;
    return allDestinations({ event: last, identify, emailHash: s.emailHash, userAgent: context.userAgent }, t.dest);
  });
  return (
    <CommandBlock
      blockKey={b.key}
      steps={[
        {
          cmd: 'destinations --preview',
          output: () => (
            <>
              <pre className="preview-banner">{t.banner}</pre>
              {previews.map((p) => (
                <div key={p.name} className="dest">
                  <pre className="dest__head">── {p.name} ──</pre>
                  <pre className="src">{`// ${p.endpoint}`}</pre>
                  {p.note && <pre className="src">{`// ${p.note}`}</pre>}
                  <JsonView value={p.body} />
                </div>
              ))}
              <Source>{t.srcDest}</Source>
            </>
          ),
        },
      ]}
    />
  );
}

// Limits prints the cookies this page has set, read once when the
// block prints, so the visitor sees exactly what the browser keeps
// for this site and can compare it with the profile built so far.
function Limits({ b, s }: { b: Block; s: State }) {
  const [cookie] = useState(() => currentCookieString(s));
  const t = useT().term;
  return (
    <CommandBlock
      blockKey={b.key}
      steps={[
        {
          cmd: 'document.cookie',
          output: () => (
            <>
              <pre className="val">{cookie ? cookie.split('; ').join('\n') : t.cookieEmpty}</pre>
              <Source>{t.cookieNote}</Source>
            </>
          ),
        },
      ]}
    />
  );
}

// Elapsed formats the time since consent as minutes and seconds and
// returns 0s when there is no start time, so the summary can say how
// long the profile took to build without a separate check first.
export function elapsed(fromIso: string | null): string {
  if (!fromIso) return '0s';
  const secs = Math.max(0, Math.round((Date.now() - Date.parse(fromIso)) / 1000));
  const m = Math.floor(secs / 60);
  return m ? `${m}m ${secs % 60}s` : `${secs}s`;
}

// Summary prints the full profile built during the visit as a single
// snapshot taken when the block prints, together with the time that
// has passed since the visitor first granted consent on the page.
function Summary({ b, s }: { b: Block; s: State }) {
  const { device } = useDevice(s.mode);
  const [snap] = useState(() => ({ profile: buildProfile(s, device), took: elapsed(s.consentAt) }));
  const t = useT().term;
  return (
    <CommandBlock
      blockKey={b.key}
      steps={[
        {
          cmd: 'profile --summary',
          output: () => (
            <>
              <JsonView value={snap.profile} />
              <Source>{t.summary(snap.took)}</Source>
            </>
          ),
        },
      ]}
    />
  );
}

// BlockView renders one printed terminal block by picking the view
// for its kind. The live tail is not handled here, because the
// terminal always renders it on its own as the very last block.
export function BlockView({ b }: { b: Block }) {
  const s = useAppState();
  switch (b.kind) {
    case 'whoami':
      return <Whoami b={b} s={s} />;
    case 'forget':
      return <Forget b={b} />;
    case 'identity':
      return <Identity b={b} s={s} />;
    case 'origin':
      return <Origin b={b} s={s} />;
    case 'device':
      return <Device b={b} s={s} />;
    case 'location':
      return <Location b={b} s={s} />;
    case 'identify':
      return <Identify b={b} />;
    case 'destinations':
      return <Destinations b={b} s={s} />;
    case 'limits':
      return <Limits b={b} s={s} />;
    case 'summary':
      return <Summary b={b} s={s} />;
    case 'sent':
      return <Sent b={b} />;
    default:
      return null;
  }
}
