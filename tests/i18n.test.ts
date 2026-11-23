import { describe, expect, it } from "vitest";
import { z } from "zod";
import { checkDictionaries, checkOverlay, checkUsage, digits, scanSource } from "@/i18n/check";
import { MESSAGES, makeT, tFor, tk } from "@/i18n/core";
import { AppError, appMsg, translateError } from "@/i18n/errors";
import { fmtDate, fmtMoney, fmtNum, makeFormat } from "@/lib/format";
import { addSpoolEvent } from "@/server/stock";

const HU = { "a.hello": "Szia, {name}!", "a.only": "csak magyar", "a.item_one": "{count} tekercs", "a.item_other": "{count} tekercs", "a.err": "{field}: legalább {min}", "f.sku": "Cikkszám" };
const EN = { "a.hello": "Hi, {name}!", "a.item_one": "{count} spool", "a.item_other": "{count} spools", "a.err": "{field}: at least {min}", "f.sku": "SKU" };

describe("t()", () => {
  const hu = makeT("hu", HU, HU);
  const en = makeT("en", EN, HU);

  it("helyettesíti a {paramétereket}, az ismeretlent érintetlenül hagyja", () => {
    expect(hu("a.hello", { name: "Anna" })).toBe("Szia, Anna!");
    expect(en("a.hello", { name: "Anna" })).toBe("Hi, Anna!");
    expect(en("a.hello")).toBe("Hi, {name}!");
  });

  it("többes szám: a count dönt (_one / _other)", () => {
    expect(en("a.item", { count: 1 })).toBe("1 spool");
    expect(en("a.item", { count: 0 })).toBe("0 spools");
    expect(en("a.item", { count: 5 })).toBe("5 spools");
    expect(hu("a.item", { count: 1 })).toBe("1 tekercs");
  });

  it("kulcs-paraméter (tk) is lefordul", () => {
    expect(en("a.err", { field: tk("f.sku"), min: 3 })).toBe("SKU: at least 3");
    expect(hu("a.err", { field: tk("f.sku"), min: 3 })).toBe("Cikkszám: legalább 3");
  });

  it("fallback: hiányzó EN → HU, hiányzó HU → a kulcs", () => {
    expect(en("a.only")).toBe("csak magyar");
    expect(en("a.nope")).toBe("a.nope");
    expect(hu("a.nope")).toBe("a.nope");
  });

  it("a valódi szótárakkal is működik", () => {
    expect(tFor("hu")("nav.catalog")).toBe("Katalógus");
    expect(tFor("en")("nav.catalog")).toBe("Catalog");
    expect(tFor("en")("dash.spools", { count: 1 })).toBe("1 spool");
    expect(tFor("hu")("validation.min", { field: tk("field.netWeightG"), min: 1 })).toBe("Nettó filamenttömeg: legalább 1");
  });
});

describe("hibák fordítása a határon", () => {
  const en = tFor("en");
  const hu = tFor("hu");

  it("AppError → kulcs + paraméter", () => {
    const e = new AppError("stock.error.unknownProfile", { id: 7 });
    expect(translateError(e, hu)).toEqual(["Ismeretlen anyagprofil: 7"]);
    expect(translateError(e, en)).toEqual(["Unknown material profile: 7"]);
  });

  it("Zod-üzenet appMsg-gel, ismétlődés nélkül", () => {
    const schema = z.object({ a: z.string().refine(() => false, appMsg("validation.invalidDate")), b: z.string().refine(() => false, appMsg("validation.invalidDate")) });
    const r = schema.safeParse({ a: "x", b: "y" });
    expect(r.success).toBe(false);
    if (!r.success) expect(translateError(r.error, en)).toEqual(["Invalid date"]);
  });

  it("a még át nem alakított Error üzenete változatlanul átmegy; nem-hiba → általános üzenet", () => {
    expect(translateError(new Error("Régi magyar üzenet"), en)).toEqual(["Régi magyar üzenet"]);
    expect(translateError("x", en)).toEqual(["Unknown error"]);
  });

  it("a szolgáltatás AppError-t dob, nem beégetett szöveget", () => {
    const blank = { remainingG: null, usedG: null, dryTempC: null, dryHours: null, newStatus: null, note: null };
    const caught = (fn: () => void): unknown => {
      try {
        fn();
      } catch (e) {
        return e;
      }
      return null;
    };
    const notFound = caught(() => addSpoolEvent(999999, { ...blank, type: "note", at: "2025-01-01", note: "x" }));
    expect(notFound).toBeInstanceOf(AppError);
    expect((notFound as AppError).key).toBe("stock.error.spoolNotFound");
    expect(translateError(notFound, hu)).toEqual(["A tekercs nem található"]);
    const invalid = caught(() => addSpoolEvent(999999, { ...blank, type: "measure", at: "2025-01-01" }));
    expect(translateError(invalid, en)).toEqual(["For a measurement, enter the remaining weight"]);
  });
});

describe("formázás nyelv szerint", () => {
  const nb = (s: string) => s.replace(/[  ]/g, " ");
  it("számok, pénznem, dátum", () => {
    expect(nb(fmtNum(1234.5, 1, "hu"))).toBe("1234,5");
    expect(fmtNum(1234.5, 1, "en")).toBe("1,234.5");
    expect(nb(fmtMoney(12990, "HUF", "hu"))).toBe("12 990 Ft");
    expect(fmtMoney(12990, "HUF", "en")).toContain("12,990");
    expect(fmtDate("2025-03-09", "hu")).toBe("2025. márc. 9.");
    expect(fmtDate("2025-03-09", "en")).toBe("9 Mar 2025");
    expect(makeFormat("en").g(1500)).toBe("1.5 kg");
    expect(fmtNum(null)).toBe("—");
  });
});

describe("i18n:check szabályok", () => {
  it("a valódi hu/en szótár hibátlan (paritás, többes szám, helyőrzők, számok)", () => {
    expect(checkDictionaries(MESSAGES.hu, MESSAGES.en)).toEqual([]);
  });

  it.each([
    ["hiányzó en kulcs", { "a.x": "x", "a.y": "y" }, { "a.x": "x" }, "parity"],
    ["hiányzó hu kulcs", { "a.x": "x" }, { "a.x": "x", "a.z": "z" }, "parity"],
    ["pont nélküli kulcs", { ax: "x" }, { ax: "x" }, "parity"],
    ["_one _other nélkül", { "a.n_one": "1" }, { "a.n_one": "1" }, "plural"],
    ["_other _one nélkül", { "a.n_other": "1" }, { "a.n_other": "1" }, "plural"],
    ["eltérő helyőrző", { "a.x": "{count} db" }, { "a.x": "{n} pcs" }, "placeholder"],
    ["eltérő szám", { "a.x": "max. 320 °C" }, { "a.x": "max. 330 °C" }, "number"],
    ["kimaradt szám", { "a.x": "4 fej" }, { "a.x": "four heads" }, "number"],
    ["eltérő URL", { "a.x": "https://a.example/x" }, { "a.x": "https://b.example/x" }, "url"],
  ])("%s → %s hiba", (_n, hu, en, rule) => {
    expect(checkDictionaries(hu, en).map((i) => i.rule)).toContain(rule);
  });

  it("számok: tizedesvessző/pont és helyőrző nem számít eltérésnek; kivétellista", () => {
    expect(digits("0,4 mm – {min} °C, 1 000 g")).toBe(digits("0.4 mm – {min} °C, 1,000 g"));
    expect(checkDictionaries({ "a.x": "0,4 mm és {n} db" }, { "a.x": "0.4 mm and {n} pcs" })).toEqual([]);
    expect(checkDictionaries({ "a.x": "2 zóna" }, { "a.x": "dual zone" }, { numbers: ["a.x"] })).toEqual([]);
  });

  it("használat: hiányzó és nem használt kulcs, sablon-előtag, többes szám alapkulcs", () => {
    const scan = scanSource([
      { path: "a.tsx", text: 't("nav.home"); t("nav.typo"); t(`field.${k}`); t("dash.spools", { count }); const x = { titleKey: "nav.title" }; import "x/y.css"; t(`nav.ghost.${k}`)' },
    ]);
    const issues = checkUsage(["nav.home", "nav.title", "nav.unused", "field.sku", "field.sku.hint", "dash.spools_one", "dash.spools_other"], scan);
    expect(issues.filter((i) => i.rule === "missing").map((i) => i.key).sort()).toEqual(["nav.ghost.*", "nav.typo"]);
    expect(issues.filter((i) => i.rule === "unused").map((i) => i.key)).toEqual(["nav.unused"]);
    expect(checkUsage(["nav.home", "nav.unused"], scanSource([{ path: "a.ts", text: 't("nav.home")' }]), { unused: ["nav.unused"] })).toEqual([]);
  });

  it("overlay: ismeretlen kulcs és eltérő szám hiba; hiányzó kulcs csak --full módban", () => {
    const src = { "entry.pla.summary": "Kb. 55 °C fölött lágyul", "entry.pla.name": "PLA" };
    expect(checkOverlay(src, { "entry.pla.summary": "Softens above about 55 °C" })).toEqual({ issues: [], missing: ["entry.pla.name"] });
    expect(checkOverlay(src, { "entry.pla.summary": "Softens above about 60 °C" }).issues.map((i) => i.rule)).toEqual(["number"]);
    expect(checkOverlay(src, { "entry.xyz.name": "?" }).issues.map((i) => i.rule)).toEqual(["overlay"]);
    expect(checkOverlay(src, { "entry.pla.name": "PLA" }, { full: true }).issues.map((i) => i.key)).toEqual(["entry.pla.summary"]);
  });
});
