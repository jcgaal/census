// The anonymous ID lives in a first-party cookie, so it is only sent
// to this domain. Local storage keeps the details the page shows,
// such as when the ID was first set and when consent was given.
import { site } from '../site.config';

// Cookie and storage names come from site.config.ts, which builds them
// from VITE_COOKIE_PREFIX, so a fork renames them all in one place and
// Forget me always knows exactly which keys this page may have written.
export const COOKIE_NAME = site.cookieName;
export const LS_PROFILE = site.storageKeys.profile;
export const LS_CONSENT = site.storageKeys.consent;
const APP_KEYS = [LS_PROFILE, LS_CONSENT];
const DAYS = 365;

// What the page knows about the anonymous ID: the value, how its cookie
// was set and when it was first seen. returningVisitor is true when an
// earlier visit had already set the cookie before this page load began.
export interface AnonInfo {
  anonymousId: string;
  cookie: { name: string; domain: string; expires: string; sameSite: 'Lax' };
  firstSeen: string;
  returningVisitor?: boolean;
}

// Reads one cookie by name from document.cookie and decodes its value,
// returning null when it is missing, so a cleared cookie is treated the
// same way as a visitor who has never been to this page before.
export function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

// The ID cookie is first party, so only this domain receives it, and it
// is Secure on HTTPS. SameSite=Lax keeps it off cross-site subrequests
// but sends it on arrival from an ad click, as analytics cookies do.
function writeCookie(name: string, value: string, expires: Date) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secure}`;
}

// Local storage can throw in private windows or when a browser blocks
// site data. Every read and write is wrapped, so the cookie alone
// is enough to keep the page working when storage is refused.
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Writes go through the same guard. A refused write is ignored, since
// the cookie still carries the ID and the page only loses the extra
// details it would otherwise show, such as the time of the first visit.
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage is blocked or full. The cookie alone still identifies the
    // visitor, so the write is dropped and the page carries on without the
    // stored details rather than failing in the middle of granting consent.
  }
}

// Called only after consent. An existing cookie is reused so that a
// returning visitor keeps their ID, and the expiry and first visit come
// from storage only while the stored ID still matches the cookie value.
export function ensureAnonymousId(): AnonInfo {
  const existing = readCookie(COOKIE_NAME);
  // The stored profile is parsed defensively, since an older version or
  // a manual edit may have left text there that is not valid JSON, and a
  // bad value should read as missing rather than break the whole page.
  const stored = (() => {
    try {
      return JSON.parse(safeGet(LS_PROFILE) ?? 'null') as AnonInfo | null;
    } catch {
      return null;
    }
  })();

  if (existing) {
    const info: AnonInfo = {
      anonymousId: existing,
      cookie: {
        name: COOKIE_NAME,
        domain: location.hostname,
        expires: stored?.anonymousId === existing ? stored.cookie.expires : 'unknown (set on an earlier visit)',
        sameSite: 'Lax',
      },
      firstSeen: stored?.anonymousId === existing ? stored.firstSeen : 'unknown (set on an earlier visit)',
      returningVisitor: true,
    };
    // Storage that holds a different ID, or none, is rewritten to match the
    // cookie, so the next load can read the details back from it instead
    // of reporting them as set on an earlier visit over and over again.
    if (stored?.anonymousId !== existing) safeSet(LS_PROFILE, JSON.stringify({ ...info, returningVisitor: undefined }));
    return info;
  }

  // A first visit gets a random UUID that expires in 365 days, the same
  // lifetime analytics libraries usually give their anonymous IDs, and
  // nothing about the visitor is encoded anywhere in the ID itself.
  const now = new Date();
  const expires = new Date(now.getTime() + DAYS * 864e5);
  const anonymousId = crypto.randomUUID();
  writeCookie(COOKIE_NAME, anonymousId, expires);
  const info: AnonInfo = {
    anonymousId,
    cookie: { name: COOKIE_NAME, domain: location.hostname, expires: expires.toISOString(), sameSite: 'Lax' },
    firstSeen: now.toISOString(),
  };
  safeSet(LS_PROFILE, JSON.stringify(info));
  return info;
}

// Consent is stored with the time it was given, so a reload resumes in
// live mode and the page can show the visitor exactly when they agreed
// to be recorded, next to the cookie that was set at that moment.
export function recordConsent(at: string) {
  safeSet(LS_CONSENT, JSON.stringify({ granted: true, at }));
}

// Consent counts only while the cookie still exists. If the visitor
// cleared their cookies, the page asks again rather than trusting a
// stored flag that has outlived the anonymous ID it was given for.
export function storedConsent(): string | null {
  if (!readCookie(COOKIE_NAME)) return null;
  try {
    const c = JSON.parse(safeGet(LS_CONSENT) ?? 'null') as { granted: boolean; at: string } | null;
    return c?.granted ? c.at : null;
  } catch {
    return null;
  }
}

// Forget me expires the cookie and removes every key this page wrote.
// Language lives in the URL, so once this runs nothing from the visit
// is left on the device, neither in cookies nor in local storage.
export function forgetAll() {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  for (const k of APP_KEYS) {
    try {
      localStorage.removeItem(k);
    } catch {
      // Storage is blocked, which means nothing could have been written to
      // it either, so there is no key left to remove and expiring the cookie
      // above is all that Forget me needs to do to finish erasing the visit.
    }
  }
}
