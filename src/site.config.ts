// Everything a deployment can brand lives here, read from Vite env vars
// at build time. The defaults are neutral, so with no env set nothing
// on the page names a company and the optional closing is hidden.

const env = import.meta.env;

// Trims an env value and falls back when it is empty, so a variable
// that is set to blank in a hosting dashboard counts as not set and
// the neutral default still applies to the page that gets built.
const str = (v: string | undefined, fallback = ''): string => (v ?? '').trim() || fallback;

// Lets a single-line env value carry paragraphs: a literal \n typed in
// the value, as hosting dashboards allow, counts as a line break and
// each resulting line later renders as its own paragraph of text.
const multiline = (v: string | undefined): string => str(v).replace(/\\n/g, '\n');

// The two languages the page ships with. Every copy object and every
// localized env value is keyed by these, and the URL carries which
// one is active as ?lang=es so nothing about it is ever stored.
export type Lang = 'en' | 'es';

// The cookie prefix names the first-party cookie and storage keys, and
// it is stripped to safe characters. Changing it orphans the old keys,
// so every returning visitor is treated as a brand new one.
const prefix = str(env.VITE_COOKIE_PREFIX, 'census').replace(/[^A-Za-z0-9_-]/g, '');

// All branding and naming for one deployment, resolved once at build
// time from env. Components read from this object only, so a deploy
// can rebrand the page without touching any of the source code.
export const site = {
  // Product name shown in the header, the page title and the footer,
  // and the only branding the page carries when no env is set at all,
  // which keeps a fresh fork neutral until its deployer renames it.
  name: str(env.VITE_SITE_NAME, 'Census'),
  // Owner named in the footer copyright and on the closing contact
  // button. Empty means no copyright line and a generic button label,
  // so the page never invents an owner that the deployer didn't set.
  owner: str(env.VITE_OWNER_NAME),
  // Optional logo next to the name. It must be served from your own
  // domain because the page loads no third-party resources, so a logo
  // hosted elsewhere would break that promise to every visitor.
  logoUrl: str(env.VITE_LOGO_URL),
  defaultLang: (env.VITE_DEFAULT_LANG === 'es' ? 'es' : 'en') as Lang,
  repoUrl: str(env.VITE_REPO_URL, 'https://github.com/jcgaal/census'),
  contactEmail: str(env.VITE_CONTACT_EMAIL),
  linkedinUrl: str(env.VITE_LINKEDIN_URL),
  // Optional link to something else you run, such as another demo. It
  // appears in the header, footer and closing section only when set,
  // and the Spanish label falls back to the English one when missing.
  extraLink: {
    url: str(env.VITE_EXTRA_LINK_URL),
    label: {
      en: str(env.VITE_EXTRA_LINK_LABEL),
      es: str(env.VITE_EXTRA_LINK_LABEL_ES, str(env.VITE_EXTRA_LINK_LABEL)),
    },
  },
  // Optional section 09, written by the deployer. It stays hidden unless
  // VITE_CLOSING_ENABLED=true, and the Spanish title and body fall back
  // to the English ones so a single-language closing still renders.
  closing: {
    enabled: env.VITE_CLOSING_ENABLED === 'true',
    title: {
      en: str(env.VITE_CLOSING_TITLE_EN),
      es: str(env.VITE_CLOSING_TITLE_ES, str(env.VITE_CLOSING_TITLE_EN)),
    },
    body: {
      en: multiline(env.VITE_CLOSING_BODY_EN),
      es: multiline(env.VITE_CLOSING_BODY_ES) || multiline(env.VITE_CLOSING_BODY_EN),
    },
  },
  // Cookie and storage names are <prefix>_anon_id, <prefix>_profile and
  // <prefix>_consent. They are all first-party, and changing the prefix
  // makes every returning visitor look like a new one to the page.
  cookiePrefix: prefix,
  cookieName: `${prefix}_anon_id`,
  storageKeys: { profile: `${prefix}_profile`, consent: `${prefix}_consent` },
  // The library name that Segment-style events carry in their
  // context.library field, derived from the prefix so a rebranded
  // deployment reports its own name in every event it builds.
  libraryName: `${prefix}-demo`,
};

// Fork link for the repo the page was built from. It backs the fork
// buttons on the page, so a visitor who likes the idea can run their
// own copy under their own name with nothing more than a few env vars.
export const FORK_URL = `${site.repoUrl}/fork`;
// Contact link built from the configured email address. It stays empty
// when no address is set, so every contact button hides itself instead
// of pointing at a mailto link with nobody on the other end of it.
export const MAILTO = site.contactEmail ? `mailto:${site.contactEmail}` : '';

// Browser tab title for one language, the site name followed by a short
// description, so a rebranded deployment shows its own name in the tab
// and in bookmarks without any change to the copy files themselves.
export const pageTitle = (lang: Lang): string =>
  `${site.name} · ${lang === 'es' ? 'Demo de datos de clientes' : 'Customer data demo'}`;
