import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { getDb, schema } from "@/db/client";
import { filterCatalog, loadCatalog } from "@/server/catalog";
import { exportJson, exportProfilesCsv, importProfilesCsv, parseCsv } from "@/server/export";
import { addNote, addSource, createProfile, deleteProfile, getProfileFull, updateProfile } from "@/server/profiles";
import { searchProfileIds, toFtsQuery } from "@/server/search";
import { addSpool, addSpoolEvent, createPurchase, deletePurchase, spoolCost } from "@/server/stock";
import { sniffType } from "@/server/uploads";
import { profile } from "./helpers";

let pla: number, petg: number, nylon: number;
const noEv = { remainingG: null, usedG: null, isEstimate: false, dryTempC: null, dryHours: null, newStatus: null, note: null };

beforeAll(() => {
  pla = createProfile(profile({ description: "Általános célú, könnyen nyomtatható anyag", nozzleTempMinC: 195, nozzleTempMaxC: 225, bedTempMinC: 50, dryingTempC: 50 }));
  petg = createProfile(profile({ manufacturer: "Kékfestő Művek", brand: "Kékfestő", productName: "PETG Áttetsző", sku: "KF-PETG-0042", materialFamily: "PETG", materialNameRaw: "PETG", colorName: "Égszínkék", nozzleTempMinC: 235, nozzleTempMaxC: 255, bedTempMinC: 75, dryingTempC: 65 }));
  nylon = createProfile(profile({ manufacturer: "TestCo", productName: "PA12-CF", sku: "T-PA12CF", materialFamily: "Kompozit", materialNameRaw: "PA12-CF15", colorName: "Black", netWeightG: 500, abrasive: true, nozzleTempMinC: 270, nozzleTempMaxC: 300, bedTempMinC: 90, chamberTempMinC: 50, dryingTempC: 80 }));
  addNote(pla, { body: "Zsiráfmintás tesztnyomat sikerült", notedAt: "2026-10-01" });
  addSource(petg, { url: "https://example.com/kekfesto/adatlap", title: "Kékfestő hivatalos adatlap", sourceType: "manufacturer", retrievedAt: "2026-10-01", fields: [], excerpt: "Vízálló és ütésálló" });
});

describe("teljes szöveges keresés", () => {
  const ids = (q: string) => searchProfileIds(q) ?? [];

  it("gyártó, terméknév, SKU, anyag és szín szerint talál", () => {
    expect(ids("Kékfestő")).toEqual([petg]);
    expect(ids("PA12-CF")).toContain(nylon);
    expect(ids("KF-PETG-0042")).toEqual([petg]);
    expect(ids("égszínkék")).toEqual([petg]);
    expect(ids("TestCo").sort()).toEqual([pla, nylon].sort());
  });

  it("leírásban, megjegyzésben és forrásban is keres", () => {
    expect(ids("könnyen nyomtatható")).toEqual([pla]);
    expect(ids("zsiráfmintás")).toEqual([pla]);
    expect(ids("hivatalos adatlap")).toEqual([petg]);
    expect(ids("ütésálló")).toEqual([petg]);
  });

  it("ékezet nélkül, kisbetűvel és szótöredékre is illeszkedik; több szó ÉS kapcsolat", () => {
    expect(ids("kekfesto")).toEqual([petg]);
    expect(ids("egszin")).toEqual([petg]);
    expect(ids("testco pa12")).toEqual([nylon]);
    expect(ids("testco égszínkék")).toEqual([]);
  });

  it("az index követi a módosítást és a törlést", () => {
    updateProfile(pla, profile({ description: "Mostantól borostyánsárga leírás", nozzleTempMinC: 195, nozzleTempMaxC: 225, bedTempMinC: 50, dryingTempC: 50 }));
    expect(ids("borostyánsárga")).toEqual([pla]);
    expect(ids("könnyen nyomtatható")).toEqual([]);
    const tmp = createProfile(profile({ productName: "Ideiglenes Xylofon", sku: "TMP-1", colorName: "Pink" }));
    expect(ids("xylofon")).toEqual([tmp]);
    expect(deleteProfile(tmp).ok).toBe(true);
    expect(ids("xylofon")).toEqual([]);
  });

  it("a felhasználói szöveg nem tud FTS/SQL szintaxist injektálni", () => {
    for (const evil of [`") OR 1=1 --`, `* NEAR(`, `profile_id:1`, `'; DROP TABLE spools; --`, `"`, `AND OR NOT`]) {
      expect(() => searchProfileIds(evil)).not.toThrow();
    }
    expect(toFtsQuery(`foo" OR "bar`)).toBe(`"foo"* AND "or"* AND "bar"*`);
    expect(toFtsQuery("  ---  ")).toBeNull();
    expect(searchProfileIds("")).toBeNull();
    expect(getDb().select().from(schema.spools).all()).toBeDefined(); // a tábla megvan
  });
});

describe("tekercs ↔ profil ↔ vásárlás kapcsolatok", () => {
  let purchaseId: number, spoolIds: number[];

  it("a vásárlás tételenként a megadott darabszámú tekercset hozza létre, egyedi azonosítóval", () => {
    const r = createPurchase({ purchasedAt: "2026-10-10", seller: "Teszt Bolt", orderReference: "R-1", currency: "HUF", shippingTotal: 1500, discountTotal: 1000, orderTotal: null, sourceKind: "manual", sourceReference: null, notes: null, receivedAt: null, location: "Polc B",
      items: [{ profileId: pla, variant: null, quantity: 2, unitPrice: 6000, shippingShare: null, discountShare: null }, { profileId: petg, variant: null, quantity: 1, unitPrice: 8000, shippingShare: null, discountShare: null }] });
    purchaseId = r.purchaseId;
    spoolIds = r.spoolIds;
    expect(r.spoolIds).toHaveLength(3);
    expect(new Set(r.spoolCodes).size).toBe(3);
    const full = getProfileFull(pla)!;
    expect(full.spools).toHaveLength(2);
    expect(full.spools.every((s) => s.profileId === pla && s.status === "sealed" && s.initialWeightG === 1000 && s.remainingG === null)).toBe(true);
    expect(full.purchases[0].id).toBe(purchaseId);
    expect(getProfileFull(petg)!.spools).toHaveLength(1);
    expect(getProfileFull(nylon)!.spools).toHaveLength(0);
  });

  it("idegen kulcsok élnek: nem létező profilhoz nem vehető fel tekercs vagy vásárlás", () => {
    expect(() => getDb().insert(schema.spools).values({ code: "X-1", profileId: 99999 }).run()).toThrow(/FOREIGN KEY/);
    expect(() => createPurchase({ purchasedAt: null, seller: null, orderReference: null, currency: "HUF", shippingTotal: null, discountTotal: null, orderTotal: null, sourceKind: "manual", sourceReference: null, notes: null, receivedAt: null, location: null, items: [{ profileId: 99999, variant: null, quantity: 1, unitPrice: null, shippingShare: null, discountShare: null }] })).toThrow();
    expect(getDb().select().from(schema.purchases).all()).toHaveLength(1); // a hibás vásárlás tranzakciója visszagördült
  });

  it("tekerccsel rendelkező profil nem törölhető; a jegyzetek a profillal együtt törlődnek", () => {
    expect(deleteProfile(pla).ok).toBe(false);
    const tmp = createProfile(profile({ productName: "Cascade teszt", sku: "CAS-1", colorName: "Green" }));
    addNote(tmp, { body: "jegyzet", notedAt: "2026-01-01" });
    expect(deleteProfile(tmp).ok).toBe(true);
    expect(getDb().select().from(schema.notes).where(eq(schema.notes.profileId, tmp)).all()).toHaveLength(0);
  });

  it("költség: az ismert egységár és a SZÁMÍTOTT tényleges ár elkülönül", () => {
    const full = getProfileFull(pla)!;
    const item = full.items[0];
    const c = spoolCost(item, full.purchases[0], full.allItems.filter((i) => i.purchaseId === purchaseId));
    expect(c.unitPrice).toBe(6000);
    expect(c.shippingPerSpool).toBe(500); // 1500 / 3 tekercs
    expect(c.discountPerSpool).toBe(300); // 1000 × 6000 / 20000
    expect(c.effective).toBe(6200);
    expect(c.computed).toBe(true);
    const unknown = spoolCost({ ...item, unitPrice: null }, full.purchases[0], [{ quantity: 1, unitPrice: null }]);
    expect(unknown.effective).toBeNull(); // ismeretlen árból nem számolunk
    const exact = spoolCost({ ...item, shippingShare: 0, discountShare: 0 }, full.purchases[0], full.allItems);
    expect(exact).toMatchObject({ effective: 6000, computed: false });
  });

  it("maradék: mérés = mért; nyomtatás = becslés; nem mért nyitott tekercsnél nincs kitalált érték", () => {
    const [a] = spoolIds;
    addSpoolEvent(a, { ...noEv, type: "print_use", at: "2026-10-12", usedG: 250 });
    let s = getProfileFull(pla)!.spools.find((x) => x.id === a)!;
    expect(s).toMatchObject({ status: "open", remainingG: 750, remainingOrigin: "estimate", openedAt: "2026-10-12" });
    addSpoolEvent(a, { ...noEv, type: "measure", at: "2026-10-20", remainingG: 702 });
    s = getProfileFull(pla)!.spools.find((x) => x.id === a)!;
    expect(s).toMatchObject({ remainingG: 702, remainingOrigin: "measured", lastMeasuredAt: "2026-10-20" });

    const loose = addSpool(nylon, { status: "open", initialWeightG: null, remainingG: null, remainingOrigin: null, receivedAt: null, openedAt: null, location: null, storageMethod: null, moistureState: null, notes: null });
    addSpoolEvent(loose.id, { ...noEv, type: "print_use", at: "2026-10-21", usedG: 100 });
    const ls = getProfileFull(nylon)!.spools[0];
    expect(ls.remainingG).toBeNull();
    expect(ls.remainingOrigin).toBeNull();
    const row = loadCatalog().find((r) => r.profile.id === nylon)!;
    expect(row.unknownStockCount).toBe(1);
    expect(row.spools[0].stockBasis).toBe("unknown");

    expect(() => addSpoolEvent(a, { ...noEv, type: "measure", at: "2026-10-22" })).toThrow(); // mérés érték nélkül
    addSpoolEvent(a, { ...noEv, type: "dry", at: "2026-10-23", dryTempC: 50, dryHours: 6 });
    expect(getProfileFull(pla)!.events.filter((e) => e.spoolId === a)).toHaveLength(3);
  });

  it("katalógus-szűrők: anyag, állapot, szín, nyomtatási paraméter, kulcsszó", () => {
    const all = loadCatalog();
    const idsOf = (f: Parameters<typeof filterCatalog>[1]) => filterCatalog(all, f).map((r) => r.profile.id).sort();
    expect(idsOf({ family: "PETG" })).toEqual([petg]);
    expect(idsOf({ status: "open" })).toEqual([pla, nylon].sort());
    expect(idsOf({ status: "sealed" })).toEqual([pla, petg].sort());
    expect(idsOf({ color: "egszin" })).toEqual([petg]);
    expect(idsOf({ nozzleMin: "240" })).toEqual([petg]);
    expect(idsOf({ nozzleMin: "280" })).toEqual([nylon]);
    expect(idsOf({ bedMax: "60" })).toEqual([pla]);
    expect(idsOf({ dryMax: "65" })).toEqual([pla, petg].sort());
    expect(idsOf({ abrasive: "yes" })).toEqual([nylon]);
    expect(idsOf({ chamber: "yes" })).toEqual([nylon]);
    expect(idsOf({ manufacturer: "kekfesto muvek" })).toEqual([petg]);
    expect(idsOf({ q: "testco", family: "Kompozit" })).toEqual([nylon]);
    expect(idsOf({ seller: "teszt bolt", from: "2026-10-01", to: "2026-10-31" })).toEqual([pla, petg].sort());
    expect(idsOf({ from: "2027-01-01" })).toEqual([]);
    expect(filterCatalog(all, { sort: "stock_desc" })[0].profile.id).toBe(pla);
  });

  it("vásárlás törlése a tekercseit is törli, a profil megmarad", () => {
    deletePurchase(purchaseId);
    expect(getProfileFull(pla)!.spools).toHaveLength(0);
    expect(getProfileFull(petg)!.spools).toHaveLength(0);
    expect(getProfileFull(pla)).not.toBeNull();
  });
});

describe("export / import és feltöltés-ellenőrzés", () => {
  it("a JSON export tartalmazza a forrásokat, az eredetjelölést és az egységeket", () => {
    updateProfile(petg, profile({ manufacturer: "Kékfestő Művek", brand: "Kékfestő", productName: "PETG Áttetsző", sku: "KF-PETG-0042", materialFamily: "PETG", materialNameRaw: "PETG", colorName: "Égszínkék", nozzleTempMinC: 235 }), { nozzleTempMinC: { origin: "estimate" } });
    const x = exportJson();
    expect(x.units.nozzle_temp_min_c).toBe("°C");
    const p = x.profiles.find((r) => r.ref === petg)!;
    expect(p.sources[0].url).toBe("https://example.com/kekfesto/adatlap");
    expect(p.provenance.nozzle_temp_min_c.origin).toBe("estimate");
    expect(p.fields.drying_temp_c).toBeNull(); // ismeretlen érték null marad
  });

  it("CSV: egység a fejlécben, képlet-injekció semlegesítve, visszaolvasható", () => {
    createProfile(profile({ productName: "=HYPERLINK(\"http://evil\")", sku: "CSV-1", colorName: "Formula" }));
    const csv = exportProfilesCsv();
    const rows = parseCsv(csv);
    expect(rows[0]).toContain("nozzle_temp_min_c [°C]");
    expect(rows[0]).toContain("sources");
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    const report = importProfilesCsv("manufacturer;product_name;material_family;color_name;nozzle_temp_min_c [°C]\nCsvCo;Csv PLA;PLA;Lila;205\nCsvCo;;PLA;Zöld;\nTestCo;Test PLA;PLA;Black;200\n");
    expect(report.created).toBe(1);
    expect(report.errors).toHaveLength(1); // hiányzó terméknév
    expect(report.skipped).toBe(1); // már létező, nem duplikáljuk
    expect(searchProfileIds("csvco lila")).toHaveLength(1);
  });

  it("feltöltés: a típust a tartalomból állapítjuk meg, nem a fájlnévből", () => {
    expect(sniffType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))?.mime).toBe("image/png");
    expect(sniffType(Buffer.from("%PDF-1.7 ..."))?.mime).toBe("application/pdf");
    expect(sniffType(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
    expect(sniffType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBeNull();
    expect(sniffType(Buffer.from("MZ\x90\x00"))).toBeNull();
  });
});
