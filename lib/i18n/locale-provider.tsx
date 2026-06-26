"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { t, DEFAULT_LOCALE, type TranslationKey, type Locale, LOCALES } from "./translations";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
  locales: readonly Locale[];
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ initialLocale, children }: { initialLocale: string; children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(
    LOCALES.includes(initialLocale as Locale) ? (initialLocale as Locale) : DEFAULT_LOCALE,
  );

  const translate = useCallback((key: TranslationKey) => t(locale, key), [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translate, locales: LOCALES }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useTranslations() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useTranslations must be used within a LocaleProvider");
  return ctx;
}

export function useT() {
  return useTranslations().t;
}
