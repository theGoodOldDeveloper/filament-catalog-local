// Számok / dátumok / pénznem a nyelv szerint. Minden segéd utolsó paramétere a nyelv (alapból "hu").
// Szerveroldalon: `const f = makeFormat(await getLocale())`, kliensen: `makeFormat(useLocale())`.
import { INTL_LOCALE, type Locale } from "@/i18n/core";

export function fmtNum(v: number | null | undefined, digits = 0, locale: Locale = "hu"): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: digits }).format(v);
}

export function fmtG(v: number | null | undefined, locale: Locale = "hu"): string {
  if (v === null || v === undefined) return "—";
  return v >= 1000 ? `${fmtNum(v / 1000, 2, locale)} kg` : `${fmtNum(v, 0, locale)} g`;
}

export function fmtMoney(v: number | null | undefined, currency = "HUF", locale: Locale = "hu"): string {
  if (v === null || v === undefined) return "—";
  try {
    return new Intl.NumberFormat(INTL_LOCALE[locale], { style: "currency", currency, maximumFractionDigits: currency === "HUF" ? 0 : 2 }).format(v);
  } catch {
    return `${fmtNum(v, 2, locale)} ${currency}`;
  }
}

export function fmtDate(v: string | null | undefined, locale: Locale = "hu"): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString(INTL_LOCALE[locale], { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function fmtDateTime(v: string | null | undefined, locale: Locale = "hu"): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  // nincs timeZone: a szerver a felhasználó saját gépén fut, így a gép időzónája a helyes
  return d.toLocaleString(INTL_LOCALE[locale], { dateStyle: "medium", timeStyle: "short" });
}

export function fmtRange(min: number | null | undefined, max: number | null | undefined, unit = "", locale: Locale = "hu"): string {
  const u = unit ? ` ${unit}` : "";
  if (min == null && max == null) return "—";
  if (min != null && max != null) return min === max ? `${fmtNum(min, 2, locale)}${u}` : `${fmtNum(min, 2, locale)}–${fmtNum(max, 2, locale)}${u}`;
  return `${fmtNum((min ?? max) as number, 2, locale)}${u}`;
}

/** A nyelvhez kötött formázók (kényelmi csomag). */
export function makeFormat(locale: Locale) {
  return {
    num: (v: number | null | undefined, digits = 0) => fmtNum(v, digits, locale),
    g: (v: number | null | undefined) => fmtG(v, locale),
    money: (v: number | null | undefined, currency = "HUF") => fmtMoney(v, currency, locale),
    date: (v: string | null | undefined) => fmtDate(v, locale),
    dateTime: (v: string | null | undefined) => fmtDateTime(v, locale),
    range: (min: number | null | undefined, max: number | null | undefined, unit = "") => fmtRange(min, max, unit, locale),
  };
}

/** Biztonságos színminta: csak #RGB / #RRGGBB mehet a style-ba. */
export function safeHex(v: string | null | undefined): string | null {
  return v && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : null;
}

export const todayIso = () => new Date().toISOString().slice(0, 10);
