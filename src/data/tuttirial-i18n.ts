// A Tuttirial nyelvi rétege. A magyar szöveg a forrás (tuttirial.ts); a többi nyelv „overlay”:
// egy LAPOS JSON (src/data/tuttirial.<nyelv>.json), amelynek kulcsai a magyar forrás lapos kulcsai.
//
//   group.<id>.label | .short | .blurb          főcsoport
//   sub.<magyar alcsoportnév>                   alcsoport (a magyar név az azonosító – szűréshez is ez megy)
//   tag.<magyar címke>                          címke (a magyar címke az azonosító)
//   chamber.<mód>                               kamramód felirata
//   rating.<0..4>                               az 5 értékelési szempont
//   rule.<n>.title | .text                      általános szabályok
//   entry.<id>.name | .summary | .speed | .plate | .hdt | .nozzleDia | .printTips | .dryTips
//   entry.<id>.uses.<n> | .props.<n> | .cons.<n>
//
// Számok, hőfokok, azonosítók NEM kerülnek az overlay-be (azok adatok); a szövegben lévő számoknak a fordításban
// is szerepelniük kell – ezt és a kulcsokat az `npm run i18n:check` ellenőrzi (`-- --full`: hiányzó kulcs is hiba).
// Hiányzó overlay-kulcsnál a magyar szöveg látszik. Az `aliases` (keresési szinonimák) nem fordítandó.
// A fordítandó magyar forrás kiírása: `npm run tuttirial:dump`.

import type { Locale } from "@/i18n/core";
import type { ChamberMode } from "@/lib/fit";
import { CHAMBER_LABEL, GENERAL_RULES, GROUPS, RATING_LABELS, TUTTIRIAL, type GroupId, type TutEntry } from "./tuttirial";
import en from "./tuttirial.en.json";

type Flat = Record<string, string>;
const OVERLAYS: Partial<Record<Locale, Flat>> = { en };

const TEXT_FIELDS = ["name", "summary", "speed", "plate", "hdt", "nozzleDia", "printTips", "dryTips"] as const;
const LIST_FIELDS = ["uses", "props", "cons"] as const;

/** A magyar forrás lapos alakja – ez a fordítandó anyag és az overlay-ellenőrzés alapja. */
export function flattenTuttirial(): Flat {
  const out: Flat = {};
  for (const g of GROUPS) {
    out[`group.${g.id}.label`] = g.label;
    out[`group.${g.id}.short`] = g.short;
    out[`group.${g.id}.blurb`] = g.blurb;
  }
  for (const s of new Set(TUTTIRIAL.map((e) => e.sub))) out[`sub.${s}`] = s;
  for (const t of [...new Set(TUTTIRIAL.flatMap((e) => e.tags))].sort()) out[`tag.${t}`] = t;
  for (const [mode, label] of Object.entries(CHAMBER_LABEL)) out[`chamber.${mode}`] = label;
  RATING_LABELS.forEach((l, i) => (out[`rating.${i}`] = l));
  GENERAL_RULES.forEach((r, i) => {
    out[`rule.${i}.title`] = r.title;
    out[`rule.${i}.text`] = r.text;
  });
  for (const e of TUTTIRIAL) {
    for (const f of TEXT_FIELDS) out[`entry.${e.id}.${f}`] = e[f];
    for (const f of LIST_FIELDS) e[f].forEach((v, i) => (out[`entry.${e.id}.${f}.${i}`] = v));
  }
  return out;
}

export interface LocalizedTuttirial {
  /** a bejegyzések a nyelv szerinti szöveggel; `sub` és `tags` továbbra is a magyar azonosító */
  entries: TutEntry[];
  groups: { id: GroupId; label: string; short: string; color: string; blurb: string }[];
  rules: { title: string; text: string }[];
  ratingLabels: string[];
  chamberLabel: Record<ChamberMode, string>;
  /** alcsoport megjelenített neve a magyar azonosítóból */
  sub: (hu: string) => string;
  /** címke megjelenített neve a magyar azonosítóból */
  tag: (hu: string) => string;
}

const cache = new Map<Locale, LocalizedTuttirial>();

/** A Tuttirial a kért nyelven (overlay + magyar tartalék). */
export function localizeTuttirial(locale: Locale): LocalizedTuttirial {
  const hit = cache.get(locale);
  if (hit) return hit;
  const o = OVERLAYS[locale] ?? {};
  const tr = (key: string, hu: string) => o[key] ?? hu;
  const out: LocalizedTuttirial = {
    entries: TUTTIRIAL.map((e) => {
      const x: TutEntry = { ...e };
      for (const f of TEXT_FIELDS) x[f] = tr(`entry.${e.id}.${f}`, e[f]);
      for (const f of LIST_FIELDS) x[f] = e[f].map((v, i) => tr(`entry.${e.id}.${f}.${i}`, v));
      return x;
    }),
    groups: GROUPS.map((g) => ({ id: g.id, color: g.color, label: tr(`group.${g.id}.label`, g.label), short: tr(`group.${g.id}.short`, g.short), blurb: tr(`group.${g.id}.blurb`, g.blurb) })),
    rules: GENERAL_RULES.map((r, i) => ({ title: tr(`rule.${i}.title`, r.title), text: tr(`rule.${i}.text`, r.text) })),
    ratingLabels: RATING_LABELS.map((l, i) => tr(`rating.${i}`, l)),
    chamberLabel: Object.fromEntries(Object.entries(CHAMBER_LABEL).map(([m, l]) => [m, tr(`chamber.${m}`, l)])) as Record<ChamberMode, string>,
    sub: (hu) => tr(`sub.${hu}`, hu),
    tag: (hu) => tr(`tag.${hu}`, hu),
  };
  cache.set(locale, out);
  return out;
}
