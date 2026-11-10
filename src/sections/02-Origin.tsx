import { Section } from '../components/Section';
import { useLang } from '../i18n/lang';
import { useAppState } from '../tracking/store';

// Fictional campaign parameters shaped like a LinkedIn ad click, so a
// reload with them shows how a CDP reads attribution from the URL
// without the visitor having to click a real ad to see it happen.
const LINKEDIN = { utm_source: 'linkedin', utm_medium: 'paid_social', utm_campaign: 'spring_launch', li_fat_id: 'demo123' };

// Section 02 explains where a visit came from and offers a reload as
// if from a LinkedIn ad, so the visitor sees the origin fields change
// from their real values to the campaign values in the same session.
export function OriginSection() {
  const s = useAppState();
  const { t, lang } = useLang();
  const reload = () => {
    // Consent and the anonymous ID survive the reload through the cookie
    // and storage, while the sample flag and language ride in the query
    // so the reloaded page comes back in the same mode and language.
    const q = new URLSearchParams(LINKEDIN);
    if (s.mode === 'sample') q.set('sample', '1');
    q.set('lang', lang);
    window.location.href = `${window.location.pathname}?${q}#02_origin`;
  };

  return (
    <Section
      id="02_origin"
      label={t.s02.label}
      fields={{ columns: t.fieldCols, rows: t.s02.rows }}
      extra={
        <div className="pill-row">
          <button type="button" className="pill" onClick={reload}>
            {t.s02.reload}
          </button>
        </div>
      }
    >
      {t.s02.body}
    </Section>
  );
}
