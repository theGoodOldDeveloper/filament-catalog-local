// npm run i18n:check [-- --full]
// A fordítások minőségkapuja: hibánál nem nulla kilépési kód. A szabályok leírása: src/i18n/check.ts.
//   --full   a Tuttirial angol overlay-ben hiányzó kulcs is hiba (a fordítási csomag végén így kell zöldnek lennie)
import fs from "node:fs";
import path from "node:path";
import { checkDictionaries, checkOverlay, checkUsage, scanSource, type Exceptions, type Issue, type Messages } from "@/i18n/check";
import { flattenTuttirial } from "@/data/tuttirial-i18n";

const root = process.cwd();
const json = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8")) as T;
const full = process.argv.includes("--full");

const hu = json<Messages>("src/i18n/hu.json");
const en = json<Messages>("src/i18n/en.json");
const ex = json<Exceptions & { tuttirialNumbers?: string[] }>("src/i18n/check-exceptions.json");

function sources(dir: string, out: { path: string; text: string }[] = []) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) sources(rel, out);
    else if (/\.tsx?$/.test(e.name) && rel !== "src/i18n/check.ts") out.push({ path: rel, text: fs.readFileSync(path.join(root, rel), "utf8") });
  }
  return out;
}

const issues: Issue[] = [
  ...checkDictionaries(hu, en, ex),
  ...checkUsage(Object.keys(hu), scanSource([...sources("src"), ...sources("scripts")]), ex),
];
const tut = checkOverlay(flattenTuttirial(), json<Messages>("src/data/tuttirial.en.json"), { full, numberExceptions: ex.tuttirialNumbers });
issues.push(...tut.issues.map((i) => ({ ...i, key: `tuttirial.en.json › ${i.key}` })));

const TITLE: Record<Issue["rule"], string> = {
  parity: "Kulcs-paritás (hu.json ↔ en.json)",
  plural: "Többes számú kulcspárok (_one / _other)",
  placeholder: "Eltérő {helyőrzők}",
  number: "Eltérő számok (kivétel: src/i18n/check-exceptions.json)",
  url: "Eltérő URL-ek",
  missing: "A kódban használt, de hiányzó kulcsok",
  unused: "Nem használt kulcsok",
  overlay: "Tuttirial angol overlay",
};
for (const rule of Object.keys(TITLE) as Issue["rule"][]) {
  const list = issues.filter((i) => i.rule === rule);
  if (!list.length) continue;
  console.error(`\n✗ ${TITLE[rule]} – ${list.length} db`);
  for (const i of list) console.error(`   ${i.key}\n      ${i.detail}`);
}
const total = Object.keys(flattenTuttirial()).length;
console.log(`\ni18n: ${Object.keys(hu).length} kulcs (hu) / ${Object.keys(en).length} (en) · Tuttirial overlay: ${total - tut.missing.length}/${total} szöveg lefordítva${full ? " (--full)" : ""}`);
if (issues.length) {
  console.error(`\n${issues.length} hiba.`);
  process.exit(1);
}
console.log("✓ i18n rendben.");
