import { Section } from '../components/Section';
import { useT } from '../i18n/lang';
import { site } from '../site.config';

// Section 07 lists how each downstream tool would receive the data,
// with a note under the table that the previews never send, and one
// line for each output this site does send events to on its server.
export function DestinationsSection() {
  const t = useT();
  return (
    <Section
      id="07_destinations"
      label={t.s07.label}
      fields={{ columns: t.s07.cols, rows: t.s07.rows }}
      extra={
        <>
          <div className="preview-note">{t.s07.note}</div>
          {site.outputs.map((o) => (
            <div key={o.name} className="preview-note">
              {t.s07.alsoSent(o.name, o.host)}
            </div>
          ))}
        </>
      }
    >
      {t.s07.body}
    </Section>
  );
}
