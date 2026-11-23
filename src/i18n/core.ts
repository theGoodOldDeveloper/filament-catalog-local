// i18n mag: tiszta függvények, nincs benne Next/React – szerveren, kliensen, szkriptben és tesztben is ugyanez fut.
//
// Szótár      `hu.json` / `en.json`: LAPOS, pontokkal tagolt kulcsok (`nav.catalog`), ábécérendben.
//             A magyar a forrás; a két fájl kulcskészlete pontosan egyezik (`npm run i18n:check`).
// Helyettesítés `{név}` → t("kulcs", { név: 5 }). A nyelvfüggő számformátumot a hívó adja (makeFormat).
// Többes szám `kulcs_one` + `kulcs_other` MINDKÉT fájlban (a magyarban a kettő szövege azonos lehet);
//             a hívás az alapkulccsal megy, a `count` paraméter dönt: t("dash.spools", { count: 3 }).
// Kulcs-paraméter { mező: tk("field.sku") } → a paraméter értéke maga is lefordítódik.
// Fallback    hiányzó EN → HU, hiányzó HU → maga a kulcs; fejlesztői módban hangos figyelmeztetés.

import en from "./en.json";
import hu from "./hu.json";

export const LOCALES = ["hu", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "hu";
export const LANG_COOKIE = "fc_lang";
export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

export type Messages = Record<string, string>;
export type TParam = string | number | { $t: string };
export type Params = Record<string, TParam>;
export type TFn = (key: string, params?: Params) => string;

export const MESSAGES: Record<Locale, Messages> = { hu, en };

/** Az Intl-nek átadott nyelvkód (számok, dátumok, pénznem formátuma). */
export const INTL_LOCALE: Record<Locale, string> = { hu: "hu-HU", en: "en-GB" };

/** Kulcs-paraméter: a helyettesítéskor lefordítjuk (pl. mezőnév egy hibaüzenetben). */
export const tk = (key: string): { $t: string } => ({ $t: key });

const warned = new Set<string>();
function warn(msg: string) {
  if (process.env.NODE_ENV !== "development" || warned.has(msg)) return;
  warned.add(msg);
  console.warn(`\n[i18n] ⚠⚠⚠ ${msg}\n`);
}

/** Fordító készítése egy nyelvhez. A szótárak csak tesztben térnek el az alapértelmezettől. */
export function makeT(locale: Locale, primary: Messages = MESSAGES[locale], fallback: Messages = MESSAGES[DEFAULT_LOCALE]): TFn {
  const rules = new Intl.PluralRules(INTL_LOCALE[locale]);
  const t: TFn = (key, params) => {
    const find = (m: Messages): string | undefined => {
      if (typeof params?.count === "number") {
        const plural = m[`${key}_${rules.select(params.count)}`] ?? m[`${key}_other`];
        if (plural !== undefined) return plural;
      }
      return m[key];
    };
    let raw = find(primary);
    if (raw === undefined) {
      raw = find(fallback);
      if (raw === undefined) {
        warn(`Hiányzó kulcs: "${key}" – vedd fel a src/i18n/hu.json és en.json fájlba.`);
        return key;
      }
      warn(`Hiányzó ${locale} fordítás, a magyar szöveg látszik: "${key}"`);
    }
    return raw.replace(/\{(\w+)\}/g, (whole, name: string) => {
      const v = params?.[name];
      if (v === undefined) return whole;
      return typeof v === "object" ? t(v.$t) : String(v);
    });
  };
  return t;
}

const cached = new Map<Locale, TFn>();
/** Az adott nyelv (megosztott) fordítója az alap szótárakkal. */
export function tFor(locale: Locale): TFn {
  let t = cached.get(locale);
  if (!t) cached.set(locale, (t = makeT(locale)));
  return t;
}
