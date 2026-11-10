import { useEffect, useRef, type ReactNode } from 'react';
import { useIsNarrow } from '../useIsNarrow';
import { useAppState, useStoreApi } from '../tracking/store';
import { Terminal } from './Terminal/Terminal';

// A two column table of field names and what each one holds. Cells
// accept JSX, so a row can carry inline code or a link as well as
// plain text, and the header row names both of the two columns.
export interface FieldTable {
  columns: [string, string];
  rows: [ReactNode, ReactNode][];
}

// Props for a page section. Children hold the philosophy text that
// explains the section, fields adds an optional table and feature
// switches on the highlighted style used for the feature sections.
interface Props {
  id: string;
  label: string;
  children: ReactNode;
  fields?: FieldTable;
  extra?: ReactNode;
  feature?: boolean;
}

// A section label, its text and an optional field table. The first time
// its top passes 40% of the viewport, the matching terminal block
// prints and a Section Viewed event is added to the live tail.
export function Section({ id, label, children, fields, extra, feature }: Props) {
  const ref = useRef<HTMLElement>(null);
  const store = useStoreApi();
  const s = useAppState();
  const narrow = useIsNarrow();

  // s.mode is not read inside the effect, but it stays a dependency on
  // purpose: a mode change (consent, sample, forget) must re-arm the
  // observer so the section can be viewed again in the new mode.
  // biome-ignore lint/correctness/useExhaustiveDependencies: s.mode re-arms the observer on mode change
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          store.sectionViewed(id);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -60% 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id, store, s.mode]);

  // On narrow screens there is no terminal in a sidebar, so each section
  // shows its own blocks inline instead, directly below the text that
  // explains what those blocks contain and where they came from.
  const mine = narrow ? s.blocks.filter((b) => b.section === id) : [];

  return (
    <section ref={ref} id={id} className={`section${feature ? ' section--feature' : ''}`}>
      <span className="label">{label}</span>
      <div className="philosophy">{children}</div>
      {fields && (
        <table className="fields">
          <thead>
            <tr>
              <th>{fields.columns[0]}</th>
              <th>{fields.columns[1]}</th>
            </tr>
          </thead>
          <tbody>
            {fields.rows.map((r, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static copy table; cells can be JSX, so there is no text key
              <tr key={i}>
                <td>{r[0]}</td>
                <td>{r[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {extra}
      {mine.length > 0 && <Terminal blocks={mine} showAscii={false} />}
    </section>
  );
}
