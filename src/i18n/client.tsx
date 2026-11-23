"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, tFor, type Locale, type TFn } from "./core";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** A gyökér layout adja. A szótárak a kliens-csomag részei, így szerveren és kliensen ugyanaz a t() fut. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = (): Locale => useContext(LocaleContext);
/** Kliens komponensben: `const t = useT();` */
export const useT = (): TFn => tFor(useLocale());
