import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { strings, type Locale, type StringKey } from '../i18n/strings';

export type Params = Record<string, string | number>;

export interface I18n {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: StringKey, params?: Params) => string;
}

const STORAGE_KEY = 'sorting-logic.locale';
export const DEFAULT_LOCALE: Locale = 'fr';

export function translate(locale: Locale, key: StringKey, params?: Params): string {
  const s: string = strings[key][locale];
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

function readStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'fr' || v === 'en') return v;
  } catch {
    /* storage unavailable: fall through */
  }
  return DEFAULT_LOCALE;
}

export const I18nContext = createContext<I18n>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key, params) => translate(DEFAULT_LOCALE, key, params),
});

/** Owns the locale. Call once (in App) and pass the value to I18nContext.Provider. */
export function useLocaleState(): I18n {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);
  const t = useCallback((key: StringKey, params?: Params) => translate(locale, key, params), [locale]);
  return useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}
