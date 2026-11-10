import type { ReactNode } from 'react';
import { Section } from '../components/Section';
import { FORK_URL, MAILTO, site } from '../site.config';
import { useLang } from '../i18n/lang';

// Anchor ID of the closing section, kept in one exported constant so
// links that jump to the closing and the section itself always agree
// on the same fragment in the URL whichever of them changes first.
export const CLOSING_ID = '09_closing';

// Env text renders as plain text where only **bold** becomes a strong
// element. React escapes everything else, so a deployment can never
// inject markup into the page through the closing env variables.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: fragments of one fixed string
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}

// Optional section 09, written by whoever deploys the page. Title and
// body come from the VITE_CLOSING env vars with one paragraph per line,
// and App hides it unless VITE_CLOSING_ENABLED is set to true.
export function ClosingSection() {
  const { t, lang } = useLang();
  const title = site.closing.title[lang];
  const paragraphs = site.closing.body[lang]
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);
  const extra = site.extraLink.url && site.extraLink.label[lang];

  return (
    <Section
      id={CLOSING_ID}
      label={`09 // ${title}`}
      extra={
        <div className="pill-row">
          {MAILTO && (
            <a className="pill pill--black" href={MAILTO}>
              {t.closing.contact}
            </a>
          )}
          <a className="pill" href={FORK_URL} target="_blank" rel="noopener noreferrer">
            {t.closing.fork}
          </a>
          {extra && (
            <a className="pill" href={site.extraLink.url}>
              {extra}
            </a>
          )}
        </div>
      }
    >
      {paragraphs.map((p) => (
        <p key={p}>{inline(p)}</p>
      ))}
    </Section>
  );
}
