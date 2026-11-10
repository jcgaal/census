import { Section } from '../components/Section';
import { useT } from '../i18n/lang';

// Section 07 lists how each downstream tool would receive the data,
// with a note under the table that this is a preview only, because
// destinations on this page never send anything to anyone at all.
export function DestinationsSection() {
  const t = useT();
  return (
    <Section
      id="07_destinations"
      label={t.s07.label}
      fields={{ columns: t.s07.cols, rows: t.s07.rows }}
      extra={<div className="preview-note">{t.s07.note}</div>}
    >
      {t.s07.body}
    </Section>
  );
}
