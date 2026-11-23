// Szerveroldali nyelvfeloldás (RSC, Server Action, route handler). Kliens komponensben: useT() / useLocale().

import { cache } from "react";
import { cookies } from "next/headers";
import { getSetting } from "@/server/settings";
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, tFor, type Locale, type TFn } from "./core";

/** Az elmentett alapértelmezett nyelv; null, amíg a felhasználó nem választott (első indítás). */
export function savedLanguage(): Locale | null {
  const s = getSetting("language");
  return isLocale(s) ? s : null;
}

/** süti (`fc_lang`) → beállítás-tábla (`language`) → `hu`. Kérésenként egyszer fut le. */
export const getLocale = cache(async (): Promise<Locale> => {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  return isLocale(c) ? c : (savedLanguage() ?? DEFAULT_LOCALE);
});

/** `const { t, locale } = await getT();` – szerver komponensben és Server Actionben. */
export async function getT(): Promise<{ t: TFn; locale: Locale }> {
  const locale = await getLocale();
  return { t: tFor(locale), locale };
}
