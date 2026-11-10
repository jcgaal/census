import { Section } from '../components/Section';
import { useT } from '../i18n/lang';

// Section 04 explains what a network request reveals about location,
// with its field table and copy taken from the current language, so
// the same component serves both English and Spanish without change.
export function LocationSection() {
  const t = useT();
  return (
    <Section id="04_location" label={t.s04.label} fields={{ columns: t.fieldCols, rows: t.s04.rows }}>
      {t.s04.body}
    </Section>
  );
}
