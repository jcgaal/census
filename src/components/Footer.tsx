import { useLang } from '../i18n/lang';
import { MAILTO, site } from '../site.config';

// The footer lists the page links, the contact details and a privacy
// note. Every branded entry comes from site.config.ts and is hidden
// when its value is empty, so a fork shows only what it configures.
export function Footer() {
  const { t, lang } = useLang();
  const f = t.footer;
  const extraLabel = site.extraLink.url && site.extraLink.label[lang];
  const hasContact = Boolean(site.contactEmail || site.linkedinUrl);
  return (
    <footer className="site-footer">
      <div className="wrapper site-footer__grid">
        <div>
          <h4 className="label">{f.demos}</h4>
          <ul>
            {extraLabel && (
              <li>
                <a href={site.extraLink.url}>{extraLabel}</a>
              </li>
            )}
            <li>
              <a href={`/?lang=${lang}`}>{f.thisPage}</a>
            </li>
            <li>
              <a href={site.repoUrl} target="_blank" rel="noopener noreferrer">
                {f.source}
              </a>
            </li>
          </ul>
        </div>
        {hasContact && (
          <div>
            <h4 className="label">{f.contact}</h4>
            <ul>
              {site.contactEmail && (
                <li>
                  <a href={MAILTO}>{site.contactEmail}</a>
                </li>
              )}
              {site.linkedinUrl && (
                <li>
                  <a href={site.linkedinUrl} target="_blank" rel="noreferrer">
                    LinkedIn
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}
        <div>
          <h4 className="label">{f.privacy}</h4>
          <ul>
            <li>{f.privacyNote}</li>
            {site.owner && <li>© 2026 {site.owner}</li>}
          </ul>
        </div>
      </div>
    </footer>
  );
}
