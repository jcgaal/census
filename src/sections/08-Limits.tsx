import { Section } from '../components/Section';
import { useT } from '../i18n/lang';

// Section 08 sets what a CDP can know against what it cannot, laid out
// as a two-column grid of paired cells rather than the field table so
// each limit reads directly across from its counterpart on one row.
export function LimitsSection() {
  const t = useT();
  return (
    <Section
      id="08_limits"
      label={t.s08.label}
      extra={
        <div className="limits">
          <div>
            <span className="label">{t.s08.cols[0]}</span>
          </div>
          <div>
            <span className="label">{t.s08.cols[1]}</span>
          </div>
          {t.s08.rows.flatMap(([a, b]) => [<div key={`a:${a}`}>{a}</div>, <div key={`b:${a}`}>{b}</div>])}
        </div>
      }
    >
      {t.s08.body}
    </Section>
  );
}
