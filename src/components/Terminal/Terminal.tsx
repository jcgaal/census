import { useEffect, useRef, useState } from 'react';
import { useT } from '../../i18n/lang';
import { buildProfile, useAppState, useStoreApi, type Block } from '../../tracking/store';
import { useDevice } from '../../tracking/useDevice';
import { BlockView } from './blocks';
import { LiveTail } from './LiveTail';

// The banner printed at the top of the terminal in the sidebar. The
// inline terminals under each section leave it out, since they show
// only the blocks that belong to the section right above them.
const ASCII = String.raw`  __ ___ _ _  ____  _ ___
 / _/ -_) ' \(_-< || (_-<
 \__\___|_||_/__/\_,_/__/`;

// The terminal stays pinned to the newest output unless the visitor has
// scrolled up to read something. Scrolling back down to the bottom
// pins it again, and from then on it follows each new line.
function useAutoScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // The terminal counts as pinned while the visitor is within 48px
    // of the bottom, so a small scroll or a rounding difference does
    // not stop it from following the output as new lines print.
    const onScroll = () => {
      pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    };
    const mo = new MutationObserver(() => {
      if (pinned.current) el.scrollTop = el.scrollHeight;
    });
    el.addEventListener('scroll', onScroll, { passive: true });
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      mo.disconnect();
    };
  }, []);
  return ref;
}

// The status bar shows the event count, whether the profile is still
// anonymous and the consent state, with copy and forget buttons that
// appear only after the visitor has made a choice on the gate.
function FooterBar() {
  const s = useAppState();
  const store = useStoreApi();
  const { device } = useDevice(s.mode);
  const [copied, setCopied] = useState(false);
  const t = useT().term;
  const consent = s.mode === 'live' ? t.granted : s.mode === 'sample' ? t.consentSample : t.pending;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildProfile(s, device), null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // The clipboard can be blocked by the browser or by a permission
      // policy, and in that case the button simply keeps its label, so
      // there is nothing to report and the error is safely ignored.
    }
  };

  return (
    <div className="terminal__bar terminal__bar--footer">
      <div className="terminal__status">
        <span className={`live-dot${s.mode === 'live' ? '' : ' live-dot--off'}`} />
        <span>
          {t.events}: {s.events.length} · {t.profile}: <span className={s.userId ? 'green' : undefined}>{s.userId ? t.identified : t.anonymous}</span> · {t.consent}: {consent}
        </span>
      </div>
      {s.mode !== 'pending' && (
        <div className="terminal__actions">
          <button type="button" className="term-btn" onClick={copy}>
            {copied ? t.copied : t.copy}
          </button>
          <button type="button" className="term-btn" onClick={() => store.forget()}>
            {t.forget}
          </button>
        </div>
      )}
    </div>
  );
}

// Props for the terminal: the blocks to print, whether to show the
// banner at the top and an extra class name, so the same component
// serves the sidebar, the consent gate and the inline section view.
interface Props {
  blocks: Block[];
  showAscii?: boolean;
  className?: string;
}

// The terminal window: a title bar, the scrolling output and a status
// bar. The live tail always renders last, because it is the one
// block that keeps growing for as long as the visit goes on.
export function Terminal({ blocks, showAscii = true, className }: Props) {
  const s = useAppState();
  const body = useAutoScroll();
  const tail = blocks.find((b) => b.kind === 'tail');
  const title = `${s.mode === 'sample' ? 'sample' : 'visitor'}@${location.hostname}: ~`;

  return (
    <div className={`terminal${className ? ` ${className}` : ''}`}>
      <div className="terminal__bar">
        <div className="terminal__dots">
          <span />
          <span />
          <span />
        </div>
        <div className="terminal__title">{title}</div>
      </div>
      <div className="terminal__body" ref={body}>
        {showAscii && <pre className="ascii">{ASCII}</pre>}
        {blocks
          .filter((b) => b.kind !== 'tail')
          .map((b) => (
            <BlockView key={b.key} b={b} />
          ))}
        {tail ? (
          <LiveTail blockKey={tail.key} events={s.events} />
        ) : (
          <pre className="command command--idle">
            <span className="cursor" />
          </pre>
        )}
      </div>
      <FooterBar />
    </div>
  );
}
