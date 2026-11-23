import { beforeEach, describe, expect, it } from "vitest";
import { getDb, schema } from "@/db/client";
import { tFor } from "@/i18n/core";
import { translateError } from "@/i18n/errors";
import { loadCatalog } from "@/server/catalog";
import { hasDemo, loadDemo, removeDemo } from "@/server/demo";
import { createProfile } from "@/server/profiles";
import { searchProfileIds } from "@/server/search";
import { addSpool, addSpoolEvent } from "@/server/stock";
import { profile } from "./helpers";

const noEv = { remainingG: null, usedG: null, isEstimate: false, dryTempC: null, dryHours: null, newStatus: null, note: null, at: "2026-11-01" };
const spoolIn = (o: { status: "sealed" | "open"; initialWeightG: number; remainingG: number | null; remainingOrigin: string | null }) => ({ receivedAt: null, openedAt: null, location: null, storageMethod: null, moistureState: null, notes: null, ...o });
const count = (t: { isDemo: unknown }[]) => t.length;

beforeEach(() => removeDemo());

describe("demo adatok betöltése / törlése", () => {
  it("üres adatbázisban betölt, és minden rekord DEMO jelölésű", () => {
    expect(hasDemo()).toBe(false);
    const r = loadDemo();
    expect(r).toMatchObject({ profiles: 7, purchases: 3 });
    expect(r!.spools).toBeGreaterThan(0);
    expect(hasDemo()).toBe(true);
    const db = getDb();
    for (const t of [schema.materialProfiles, schema.spools, schema.purchases]) {
      const rows = db.select().from(t).all();
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((x) => x.isDemo)).toBe(true);
    }
  });

  it("másodszor nem tölt be duplán", () => {
    loadDemo();
    expect(loadDemo()).toBeNull();
    expect(count(getDb().select().from(schema.materialProfiles).all())).toBe(7);
  });

  it("a keresés a demo profilokat is megtalálja (FTS-index épül)", () => {
    loadDemo();
    expect(searchProfileIds("DEMO PETG") ?? []).not.toHaveLength(0);
  });

  it("a törlés a saját adatot érintetlenül hagyja, a demo teljesen eltűnik", () => {
    const own = createProfile(profile({ productName: "Saját PLA", sku: "OWN-1" }));
    const spool = addSpool(own, spoolIn({ status: "open", initialWeightG: 1000, remainingG: 500, remainingOrigin: "measured" })).id;
    loadDemo();
    removeDemo();
    expect(hasDemo()).toBe(false);
    const db = getDb();
    expect(db.select().from(schema.purchases).all()).toHaveLength(0);
    expect(db.select().from(schema.purchaseItems).all()).toHaveLength(0);
    const rows = loadCatalog();
    expect(rows.map((r) => r.profile.id)).toEqual([own]);
    expect(rows[0].spools.map((s) => s.id)).toContain(spool);
    expect(searchProfileIds("DEMO") ?? []).toEqual([]);
  });

  it("törlés után újra betölthető", () => {
    loadDemo();
    removeDemo();
    expect(loadDemo()).not.toBeNull();
  });
});

describe("„Használtam” – print_use esemény", () => {
  it("a bontatlan tekercs bontottra vált, a maradék becslés", () => {
    const p = createProfile(profile({ sku: "USE-1" }));
    const id = addSpool(p, spoolIn({ status: "sealed", initialWeightG: 1000, remainingG: null, remainingOrigin: null })).id;
    addSpoolEvent(id, { ...noEv, type: "print_use", usedG: "42,5" });
    const s = loadCatalog().flatMap((r) => r.spools).find((x) => x.id === id)!;
    expect(s.status).toBe("open");
    expect(s.remainingG).toBe(957.5);
    expect(s.remainingOrigin).toBe("estimate");
    expect(s.stockBasis).toBe("estimate");
  });

  it("hibás érték lefordított, mezőnevet tartalmazó hibát ad (negatív, szöveg, hiányzó)", () => {
    const p = createProfile(profile({ sku: "USE-2" }));
    const id = addSpool(p, spoolIn({ status: "open", initialWeightG: 1000, remainingG: 800, remainingOrigin: "measured" })).id;
    const errs = (usedG: string, lang: "hu" | "en") => {
      try {
        addSpoolEvent(id, { ...noEv, type: "print_use", usedG });
      } catch (e) {
        return translateError(e, tFor(lang)).join(" ");
      }
      return "";
    };
    expect(errs("-5", "hu")).toBe("Felhasznált (g): legalább 0");
    expect(errs("-5", "en")).toBe("Used (g): at least 0");
    expect(errs("sok", "hu")).toBe("Felhasznált (g): számot adj meg");
    expect(errs("sok", "en")).toBe("Used (g): enter a number");
    expect(errs("", "hu")).toBe("Add meg a felhasznált mennyiséget");
    // a hibás beküldés nem változtatja a készletet
    expect(loadCatalog().flatMap((r) => r.spools).find((x) => x.id === id)!.remainingG).toBe(800);
  });
});
