// Az `npm run i18n:check` tiszta logikája (a parancssori rész: scripts/i18n-check.ts). Tesztelve: tests/i18n.test.ts.
//
// Szabályok:
//  parity       hu.json és en.json kulcskészlete pontosan egyezik; minden kulcs pontozott (`ns.nev`)
//  plural       ha van `x_one`, kell `x_other` is (és fordítva)
//  placeholder  egy kulcs hu és en értékében ugyanazok a {helyőrzők}
//  number / url egy kulcs hu és en értékében ugyanazok a számjegy-sorozatok és URL-ek (kivétel: kivétellista)
//  missing      a kódban hivatkozott, de a szótárból hiányzó kulcs
//  unused       a szótárban lévő, de a kódban sehol nem hivatkozott kulcs
//  overlay      fordítási „overlay” (pl. tuttirial.en.json) a magyar forráshoz képest: nincs ismeretlen kulcs,
//               egyeznek a számok; `full` módban hiányzó kulcs sem lehet

export type Messages = Record<string, string>;
export interface Issue { rule: "parity" | "plural" | "placeholder" | "number" | "url" | "missing" | "unused" | "overlay"; key: string; detail: string }
export interface Exceptions {
  /** kulcsok, ahol a számok szándékosan eltérnek a két nyelvben */
  numbers?: string[];
  /** szótárkulcsok, amelyeket a kód nem literálként ér el (ritka; inkább `ns.${x}` sablont használj) */
  unused?: string[];
  /** kulcsnak látszó, de nem fordítási literálok a kódban (pl. "nav.something" fájlnév) */
  notKeys?: string[];
}

const KEY_RE = /^[A-Za-z]\w*(?:\.\w+)+$/;
const PLURAL_RE = /_(zero|one|two|few|many|other)$/;
const pluralBase = (k: string) => k.replace(PLURAL_RE, "");

const placeholders = (v: string) => [...new Set(v.match(/\{\w+\}/g) ?? [])].sort().join(" ");
const urls = (v: string) => (v.match(/https?:\/\/[^\s"'<>)]+/g) ?? []).sort().join(" ");
/** Számjegy-sorozatok a helyőrzők nélkül, rendezve: „0,4 mm (max. 320 °C)” → 0 320 4 */
export const digits = (v: string) => (v.replace(/\{\w+\}/g, "").match(/\d+/g) ?? []).sort().join(" ");

/** 1., 2., 4. szabály: a két szótár egymáshoz képest. */
export function checkDictionaries(hu: Messages, en: Messages, ex: Exceptions = {}): Issue[] {
  const out: Issue[] = [];
  for (const k of Object.keys(hu)) if (!(k in en)) out.push({ rule: "parity", key: k, detail: "hiányzik az en.json-ból" });
  for (const k of Object.keys(en)) if (!(k in hu)) out.push({ rule: "parity", key: k, detail: "hiányzik a hu.json-ból" });
  for (const [name, d] of [["hu", hu], ["en", en]] as const) {
    for (const k of Object.keys(d)) {
      if (!KEY_RE.test(k)) out.push({ rule: "parity", key: k, detail: `${name}.json: a kulcs nem „névtér.név” alakú` });
      const m = k.match(PLURAL_RE);
      if (m && m[1] !== "other" && !(`${pluralBase(k)}_other` in d)) out.push({ rule: "plural", key: k, detail: `${name}.json: hiányzik a(z) ${pluralBase(k)}_other` });
      if (m && m[1] === "other" && !(`${pluralBase(k)}_one` in d)) out.push({ rule: "plural", key: k, detail: `${name}.json: hiányzik a(z) ${pluralBase(k)}_one` });
    }
  }
  for (const k of Object.keys(hu)) {
    if (!(k in en)) continue;
    out.push(...compareValues(k, hu[k], en[k], ex.numbers ?? []));
  }
  return out;
}

function compareValues(key: string, hu: string, en: string, numberExceptions: string[]): Issue[] {
  const out: Issue[] = [];
  if (placeholders(hu) !== placeholders(en)) out.push({ rule: "placeholder", key, detail: `hu: [${placeholders(hu)}]  en: [${placeholders(en)}]` });
  if (urls(hu) !== urls(en)) out.push({ rule: "url", key, detail: `hu: [${urls(hu)}]  en: [${urls(en)}]` });
  if (!numberExceptions.includes(key) && digits(hu) !== digits(en)) out.push({ rule: "number", key, detail: `hu: [${digits(hu)}]  en: [${digits(en)}]` });
  return out;
}

export interface Scan {
  /** kulcs alakú literálok ("nav.catalog") → első előfordulás fájlja */
  literals: Map<string, string>;
  /** sablon-előtagok (`field.${key}` → "field.") → első előfordulás fájlja */
  prefixes: Map<string, string>;
}

/** A forrásfájlok átfésülése kulcs alakú literálok és `ns.${…}` sablonok után. */
export function scanSource(files: { path: string; text: string }[]): Scan {
  const literals = new Map<string, string>();
  const prefixes = new Map<string, string>();
  for (const f of files) {
    for (const m of f.text.matchAll(/["'`]([A-Za-z]\w*(?:\.\w+)+)["'`]/g)) if (!literals.has(m[1])) literals.set(m[1], f.path);
    for (const m of f.text.matchAll(/`([A-Za-z]\w*(?:\.\w+)*\.)\$\{/g)) if (!prefixes.has(m[1])) prefixes.set(m[1], f.path);
  }
  return { literals, prefixes };
}

/** 3. szabály: hiányzó és nem használt kulcsok. A „névtér” a kulcs első tagja (nav, dash, field…). */
export function checkUsage(keys: string[], scan: Scan, ex: Exceptions = {}): Issue[] {
  const out: Issue[] = [];
  const keySet = new Set(keys);
  const bases = new Set(keys.map(pluralBase));
  const namespaces = new Set(keys.map((k) => k.split(".")[0]));
  const notKeys = new Set(ex.notKeys ?? []);
  for (const [lit, file] of scan.literals) {
    if (!namespaces.has(lit.split(".")[0]) || notKeys.has(lit)) continue;
    if (!keySet.has(lit) && !bases.has(lit)) out.push({ rule: "missing", key: lit, detail: `a kód hivatkozik rá (${file}), de nincs a szótárban` });
  }
  for (const [prefix, file] of scan.prefixes) {
    if (!namespaces.has(prefix.split(".")[0])) continue;
    if (!keys.some((k) => k.startsWith(prefix))) out.push({ rule: "missing", key: `${prefix}*`, detail: `sablon-előtag (${file}), amelyhez egyetlen kulcs sem tartozik` });
  }
  const prefixList = [...scan.prefixes.keys()];
  const allowed = new Set(ex.unused ?? []);
  for (const k of keys) {
    if (allowed.has(k) || scan.literals.has(k) || scan.literals.has(pluralBase(k))) continue;
    if (prefixList.some((p) => k.startsWith(p))) continue;
    out.push({ rule: "unused", key: k, detail: "a kód sehol nem hivatkozik rá" });
  }
  return out;
}

/** Overlay-ellenőrzés: `source` a magyar forrás lapos alakja, `overlay` a fordítás (ugyanazokkal a kulcsokkal). */
export function checkOverlay(source: Messages, overlay: Messages, opts: { full?: boolean; numberExceptions?: string[] } = {}): { issues: Issue[]; missing: string[] } {
  const issues: Issue[] = [];
  for (const k of Object.keys(overlay)) {
    if (!(k in source)) { issues.push({ rule: "overlay", key: k, detail: "nincs ilyen kulcs a magyar forrásban" }); continue; }
    if (typeof overlay[k] !== "string" || !overlay[k].trim()) { issues.push({ rule: "overlay", key: k, detail: "üres érték" }); continue; }
    issues.push(...compareValues(k, source[k], overlay[k], opts.numberExceptions ?? []));
  }
  const missing = Object.keys(source).filter((k) => !(k in overlay));
  if (opts.full) for (const k of missing) issues.push({ rule: "overlay", key: k, detail: "hiányzik a fordításból" });
  return { issues, missing };
}
