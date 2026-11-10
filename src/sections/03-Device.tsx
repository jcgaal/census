import { Section } from '../components/Section';
import { useT } from '../i18n/lang';

// Section 03 explains what the browser reveals about the device, with
// its field table and copy taken from the current language, so the
// same component serves both English and Spanish without change.
export function DeviceSection() {
  const t = useT();
  return (
    <Section id="03_device" label={t.s03.label} fields={{ columns: t.fieldCols, rows: t.s03.rows }}>
      {t.s03.body}
    </Section>
  );
}
