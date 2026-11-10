import { useState } from 'react';
import { IdentifyForm } from '../components/IdentifyForm';
import { Section } from '../components/Section';
import { useT } from '../i18n/lang';
import { useAppState } from '../tracking/store';

// Section 06 lets the visitor identify with an email and then shows
// what changes. The follow-up note appears only once the form is sent
// and the store holds a user ID, so it never shows ahead of time.
export function IdentityResolutionSection() {
  const s = useAppState();
  const t = useT();
  const [done, setDone] = useState(false);
  const show = done && Boolean(s.userId);

  return (
    <Section
      id="06_identity_resolution"
      label={t.s06.label}
      feature
      extra={
        <>
          <IdentifyForm onIdentified={() => setDone(true)} />
          {show && <div className="philosophy after-identify fadein">{t.s06.after}</div>}
        </>
      }
    >
      {t.s06.body}
    </Section>
  );
}
