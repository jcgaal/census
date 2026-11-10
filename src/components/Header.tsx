import { FORK_URL, MAILTO, site } from '../site.config';
import { useLang } from '../i18n/lang';
import { useAppState, useStoreApi } from '../tracking/store';

// The header holds the brand, the language switch, the fork link and
// the navigation pills. Branded links come from site.config.ts and
// are left out when empty, so a bare fork shows no dead buttons.
export function Header() {
  const s = useAppState();
  const store = useStoreApi();
  const { t, lang, setLang } = useLang();
  const extraLabel = site.extraLink.url && site.extraLink.label[lang];

  // How it works scrolls to the first section when it is on the page
  // and falls back to the consent gate when it is not, so the button
  // always lands somewhere useful whatever mode the page is in.
  const howItWorks = () => {
    const el = document.getElementById('01_identity');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else document.getElementById('consent')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="site-header">
      <div className="wrapper site-header__inner">
        <a className="brand" href={`/?lang=${lang}`}>
          {site.logoUrl && <img className="brand__logo" src={site.logoUrl} alt="" aria-hidden="true" width="22" height="22" />}
          <span className="brand__name">{site.name}:</span>
          <span className="brand__sub">{t.header.sub}</span>
        </a>
        <nav className="site-header__menu">
          <div className="site-header__pills">
            <button type="button" className="pill" onClick={howItWorks}>
              {t.header.how}
            </button>
            {extraLabel && (
              <a className="pill" href={site.extraLink.url}>
                {extraLabel}
              </a>
            )}
            {MAILTO && (
              <a className="pill" href={MAILTO}>
                {t.header.contact}
              </a>
            )}
          </div>
          <button
            type="button"
            className="pill pill--lang pill--keep"
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            aria-label={t.header.switchLabel}
            title={t.header.switchLabel}
          >
            {t.header.switchTo}
          </button>
          <a
            className="pill pill--black pill--keep pill--fork"
            href={FORK_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.header.fork}
          >
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" fill="currentColor">
              <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
            </svg>
            <span className="pill--fork__label">{t.header.fork}</span>
          </a>
          {s.mode !== 'pending' && (
            <button type="button" className="pill pill--nav pill--keep" onClick={() => store.forget()}>
              {t.header.forget}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
