import { Section } from '../components/Section';
import { useT } from '../i18n/lang';

// Section 01 explains the anonymous identity a first visit receives,
// with its field table and copy taken from the current language, so
// the same component serves both English and Spanish without change.
export function IdentitySection() {
  const t = useT();
  return (
    <Section id="01_identity" label={t.s01.label} fields={{ columns: t.fieldCols, rows: t.s01.rows }}>
      {t.s01.body}
    </Section>
  );
}
