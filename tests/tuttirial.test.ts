import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TUTTIRIAL, requirementsOf } from "@/data/tuttirial";
import { flattenTuttirial, localizeTuttirial } from "@/data/tuttirial-i18n";
import en from "@/data/tuttirial.en.json";
import { checkOverlay } from "@/i18n/check";
import { computeFit, type Fit, type FitPrinter } from "@/lib/fit";

const byId = (id: string) => TUTTIRIAL.find((e) => e.id === id)!;

describe("Tuttirial adatok", () => {
  it("48 egyedi bejegyzés, értelmes követelményekkel", () => {
    expect(TUTTIRIAL).toHaveLength(48);
    expect(new Set(TUTTIRIAL.map((e) => e.id)).size).toBe(48);
    for (const e of TUTTIRIAL) {
      expect(e.nozzle[0], e.id).toBeLessThanOrEqual(e.nozzle[1]);
      expect(e.bed[0], e.id).toBeLessThanOrEqual(e.bed[1]);
      if (e.chamberMode === "required" || e.chamberMode === "recommended") expect(e.chamber, e.id).not.toBeNull();
      expect(e.printTips.length, e.id).toBeGreaterThan(0);
      expect(e.dryTips.length, e.id).toBeGreaterThan(0);
    }
  });

  it("nincs benne beégetett illeszkedés", () => {
    const src = fs.readFileSync(path.resolve("src/data/tuttirial.ts"), "utf8");
    expect(src).not.toMatch(/^add\([^\n]*"(ideal|ok|limit|no)"/m);
    expect(Object.keys(byId("pla"))).not.toContain("fit");
  });

  it("requirementsOf: a szárítás nélküli bejegyzésnél nincs szárítási követelmény", () => {
    expect(requirementsOf(byId("abs"))).toEqual({ nozzle: [240, 270], bed: [90, 110], chamber: [55, 65], chamberMode: "required", hardened: false, dryTempC: 80, ease: 3 });
    expect(requirementsOf(byId("cleaning")).dryTempC).toBeNull();
  });

  it("a tisztító filament tartománya nem követelmény: gyenge gépen sem határeset", () => {
    expect(requirementsOf(byId("cleaning"))).toMatchObject({ nozzle: null, bed: null });
    const weak: FitPrinter = { maxNozzleC: 230, maxBedC: 60, enclosed: false, heatedChamber: false, hardenedNozzle: false };
    expect(computeFit(requirementsOf(byId("cleaning")), { printer: weak, dryer: null }).fit).toBe("ideal");
  });
});

describe("Tuttirial – számított illeszkedés jellemző gépeken", () => {
  const HEATED: FitPrinter = { maxNozzleC: 320, maxBedC: 120, enclosed: true, heatedChamber: true, maxChamberC: 65, hardenedNozzle: true };
  const ENCLOSED: FitPrinter = { maxNozzleC: 300, maxBedC: 110, enclosed: true, heatedChamber: false, hardenedNozzle: false };
  const OPEN: FitPrinter = { maxNozzleC: 260, maxBedC: 100, enclosed: false, heatedChamber: false, hardenedNozzle: false };
  const fit = (id: string, printer: FitPrinter) => computeFit(requirementsOf(byId(id)), { printer }).fit;

  it.each([
    // bejegyzés   fűtött kamrás  zárt, fűtetlen  nyitott
    ["pla", "ideal", "ideal", "ideal"],
    ["petg", "ideal", "ideal", "ok"],
    ["pla-cf", "ideal", "limit", "limit"],
    ["abs", "ideal", "limit", "no"],
    ["asa", "ideal", "limit", "no"],
    ["pa12", "ideal", "ok", "limit"],
    ["pa-cf", "ideal", "limit", "no"],
    ["pc", "ok", "limit", "no"],
    ["pps-cf", "limit", "no", "no"],
    ["peek", "no", "no", "no"],
    ["tpu-95a", "ideal", "ideal", "ideal"],
    ["tpu-soft", "ok", "ok", "ok"],
  ] as [string, Fit, Fit, Fit][])("%s → %s / %s / %s", (id, heated, enclosed, open) => {
    expect([fit(id, HEATED), fit(id, ENCLOSED), fit(id, OPEN)]).toEqual([heated, enclosed, open]);
  });

  it("felszerelés nélkül egyetlen bejegyzés sem kap címkét", () => {
    for (const e of TUTTIRIAL) expect(computeFit(requirementsOf(e), { printer: null, dryer: null }).fit).toBeNull();
  });

  it("jobb gépen egyetlen bejegyzés sem kap rosszabb címkét", () => {
    const rank = (f: Fit | null) => ["ideal", "ok", "limit", "no"].indexOf(f as Fit);
    for (const e of TUTTIRIAL) {
      expect(rank(fit(e.id, HEATED)), e.id).toBeLessThanOrEqual(rank(fit(e.id, ENCLOSED)));
      expect(rank(fit(e.id, { ...ENCLOSED, hardenedNozzle: true })), e.id).toBeLessThanOrEqual(rank(fit(e.id, ENCLOSED)));
    }
  });
});

describe("Tuttirial – nyelvi overlay", () => {
  const flat = flattenTuttirial();

  it("a lapos magyar forrás minden bejegyzést és listát tartalmaz", () => {
    expect(flat["entry.pla.name"]).toBe("PLA");
    expect(flat["entry.pla.uses.0"]).toBe(byId("pla").uses[0]);
    expect(flat["group.basic.label"]).toBeTypeOf("string");
    expect(flat[`sub.${byId("pla").sub}`]).toBe(byId("pla").sub);
    expect(Object.keys(flat).filter((k) => /^entry\.[^.]+\.name$/.test(k))).toHaveLength(48);
  });

  it("az angol overlay érvényes: nincs ismeretlen kulcs, a számok egyeznek", () => {
    expect(checkOverlay(flat, en).issues).toEqual([]);
  });

  it("a négy mintabejegyzés teljesen le van fordítva", () => {
    const missing = checkOverlay(flat, en).missing.filter((k) => /^entry\.(pla|petg|abs|pa-cf)\./.test(k));
    expect(missing).toEqual([]);
  });

  it("magyarul a forrás változatlan; angolul az overlay, hiány esetén magyar tartalékkal", () => {
    const hu = localizeTuttirial("hu");
    const eng = localizeTuttirial("en");
    expect(hu.entries.find((e) => e.id === "abs")).toEqual(byId("abs"));
    const abs = eng.entries.find((e) => e.id === "abs")!;
    expect(abs.summary).toBe(en["entry.abs.summary"]);
    expect(abs.uses).toEqual([0, 1, 2, 3].map((i) => (en as Record<string, string>)[`entry.abs.uses.${i}`]));
    expect(abs.sub).toBe(byId("abs").sub); // az alcsoport azonosítója magyar marad…
    expect(eng.sub(abs.sub)).toBe("Styrene-based engineering materials"); // …a megjelenített neve fordított
    expect(eng.tag("kezdőbarát")).toBe("beginner-friendly");
    expect(eng.chamberLabel.required).toBe("Heated chamber required");
    expect([abs.nozzle, abs.bed, abs.dry]).toEqual([byId("abs").nozzle, byId("abs").bed, byId("abs").dry]);
    expect(eng.entries.every((e) => e.summary === (en as Record<string, string>)[`entry.${e.id}.summary`])).toBe(true);
    expect(eng.tag("nincs ilyen címke")).toBe("nincs ilyen címke");
  });
});
