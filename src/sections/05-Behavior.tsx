import { Section } from '../components/Section';
import { useT } from '../i18n/lang';

// Section 05 explains the behavior events a page records as you read,
// using its own columns because these rows describe events rather than
// fields, and the copy comes from whichever language is active.
export function BehaviorSection() {
  const t = useT();
  return (
    <Section id="05_behavior" label={t.s05.label} fields={{ columns: t.s05.cols, rows: t.s05.rows }}>
      {t.s05.body}
    </Section>
  );
}
