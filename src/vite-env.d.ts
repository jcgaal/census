/// <reference types="vite/client" />

// Types for the Vite env vars that site.config.ts reads. All of them are
// optional, so a build with no env set still typechecks and falls back
// to the neutral defaults that keep the page free of any branding.
interface ImportMetaEnv {
  readonly VITE_SITE_NAME?: string;
  readonly VITE_OWNER_NAME?: string;
  readonly VITE_LOGO_URL?: string;
  readonly VITE_COOKIE_PREFIX?: string;
  readonly VITE_DEFAULT_LANG?: string;
  readonly VITE_CLOSING_ENABLED?: string;
  readonly VITE_CLOSING_TITLE_EN?: string;
  readonly VITE_CLOSING_BODY_EN?: string;
  readonly VITE_CLOSING_TITLE_ES?: string;
  readonly VITE_CLOSING_BODY_ES?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_LINKEDIN_URL?: string;
  readonly VITE_EXTRA_LINK_LABEL?: string;
  readonly VITE_EXTRA_LINK_LABEL_ES?: string;
  readonly VITE_EXTRA_LINK_URL?: string;
  readonly VITE_REPO_URL?: string;
  readonly VITE_OG_IMAGE_URL?: string;
}

// The outputs the build found enabled, as names and hosts only, and
// whether the visitor's IP is forwarded. Vite replaces this constant
// at build time from the same settings that the server reads.
declare const __CENSUS_OUTPUTS__: { outputs: { name: string; host: string }[]; forwardIp: boolean };
