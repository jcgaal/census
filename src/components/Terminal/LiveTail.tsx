import { useEffect, useRef } from 'react';
import { compactProps, eventLabel, timeOf, type SegmentEvent } from '../../tracking/events';
import { useT } from '../../i18n/lang';
import { CommandBlock } from './CommandBlock';

// TailLine prints one event as a single line with its time, type and
// label, plus compact properties for track calls, and is highlighted
// when it arrived after the previous render of the live tail.
function TailLine({ e, fresh }: { e: SegmentEvent; fresh: boolean }) {
  return (
    <div className={`tail-line${fresh ? ' tail-line--new' : ''}`}>
      <span className="muted">{timeOf(e.timestamp)}</span>
      {'  '}
      <span className={e.type === 'identify' ? 'green' : 'key'}>{e.type.padEnd(10)}</span>
      <span className="val">{eventLabel(e).padEnd(22)}</span>
      {e.type === 'track' && <span className="key"> {compactProps(e.properties)}</span>}
      {e.userId && e.type !== 'identify' && <span className="green"> · {e.userId}</span>}
    </div>
  );
}

// The live tail runs analytics.on('*') and always comes last, holding
// the cursor. Lines added since the previous render are marked as
// new, so each event stands out at the moment it is recorded.
export function LiveTail({ blockKey, events }: { blockKey: string; events: SegmentEvent[] }) {
  const t = useT().term;
  // The count from the previous render is read before the effect saves
  // the new one, so every event past that count is marked as fresh and
  // the highlight lasts for exactly one render of the event list.
  const seen = useRef<number>(events.length);
  const prev = seen.current;
  useEffect(() => {
    seen.current = events.length;
  }, [events.length]);

  return (
    <CommandBlock
      blockKey={blockKey}
      steps={[
        {
          cmd: "analytics.on('*') --tail",
          output: () => (
            <>
              <pre className="src">{t.streaming(events.length)}</pre>
              {events.map((e, i) => (
                <TailLine key={e.messageId} e={e} fresh={i >= prev} />
              ))}
            </>
          ),
        },
      ]}
      footer={
        <pre className="command command--idle">
          <span className="cursor" />
        </pre>
      }
    />
  );
}
