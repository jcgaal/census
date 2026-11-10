// The language comes from ?lang= in the URL, then the browser's own
// language, then VITE_DEFAULT_LANG. It is never read from or saved to
// cookies or storage, so switching language leaves nothing behind.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { site, type Lang } from '../site.config';
import { en } from './en';
import { es } from './es';

export type { Lang };

export type Copy = typeof en;
export type Row = [ReactNode, ReactNode];

const copy: Record<Lang, Copy> = { en, es };

function initialLang(): Lang {
  const q = new URLSearchParams(window.location.search).get('lang');
  if (q === 'es' || q === 'en') return q;
  const nav = navigator.language?.toLowerCase() ?? '';
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('en')) return 'en';
  return site.defaultLang;
}

interface LangValue {
  lang: Lang;
  t: Copy;
  setLang: (l: Lang) => void;
}

const LangContext = createContext<LangValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    const url = new URL(window.location.href);
    url.searchParams.set('lang', l);
    window.history.replaceState(null, '', url);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = copy[lang].meta.title;
  }, [lang]);

  return <LangContext.Provider value={{ lang, t: copy[lang], setLang }}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  const v = useContext(LangContext);
  if (!v) throw new Error('useLang outside LangProvider');
  return v;
}

export const useT = () => useLang().t;
