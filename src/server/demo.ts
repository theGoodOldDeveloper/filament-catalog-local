import { eq, inArray } from "drizzle-orm";
import { getDb, schema, type DBX } from "@/db/client";
import { addNote, addSource, createProfile, savePrintProfile, type ProfileValues, type ProvenanceMap } from "./profiles";
import { reindexAll } from "./search";
import { addSpoolEvent, createPurchase, updateSpool } from "./stock";

// DEMO adatok: kitalált gyártók és boltok, example.com hivatkozások. Semmilyen valós vagy személyes adat.
// Minden rekord `isDemo` jelölést kap, így egy lépésben törölhető (removeDemo). A scripts/seed.ts és a felület is ezt hívja.

const S = schema;

/** Vannak-e betöltött DEMO profilok? */
export function hasDemo(db: DBX = getDb()): boolean {
  return db.select({ id: S.materialProfiles.id }).from(S.materialProfiles).where(eq(S.materialProfiles.isDemo, true)).limit(1).all().length > 0;
}

/** Az összes DEMO rekord törlése (tekercsek, vásárlások, profilok). A nem DEMO adathoz nem nyúl. */
export function removeDemo(db: DBX = getDb()): void {
  const run = (tx: DBX) => {
    tx.delete(S.spools).where(eq(S.spools.isDemo, true)).run();
    tx.delete(S.purchases).where(eq(S.purchases.isDemo, true)).run();
    const ids = tx.select({ id: S.materialProfiles.id }).from(S.materialProfiles).where(eq(S.materialProfiles.isDemo, true)).all().map((r) => r.id);
    if (ids.length) {
      tx.delete(S.spools).where(inArray(S.spools.profileId, ids)).run();
      tx.delete(S.purchaseItems).where(inArray(S.purchaseItems.profileId, ids)).run();
      tx.delete(S.materialProfiles).where(inArray(S.materialProfiles.id, ids)).run();
    }
  };
  db.transaction((tx) => run(tx));
  reindexAll(db);
}

const M = "manufacturer" as const;
const mfr = (keys: string[]): ProvenanceMap => Object.fromEntries(keys.map((k) => [k, { origin: M }]));
const src = (slug: string) => `https://example.com/demo/${slug}`;

interface Demo { v: ProfileValues; prov?: ProvenanceMap; specs?: { key: string; label: string; value: number | string; unit?: string; testMethod?: string; origin?: "manufacturer" | "estimate" | "own" }[] }
const base = { diameterMm: 1.75, diameterToleranceMm: 0.02, netWeightG: 1000, spoolMaterial: "Karton", spoolRecyclable: "Papírhulladékként újrahasznosítható" };
const printKeys = ["nozzleTempMinC", "nozzleTempMaxC", "bedTempMinC", "bedTempMaxC", "dryingTempC", "dryingTimeH"];

const demos: Demo[] = [
  {
    v: { ...base, manufacturer: "DEMO Polymers", brand: "DemoFil", productName: "DEMO PLA Basic", sku: "DEMO-PLA-B-BK", materialFamily: "PLA", materialNameRaw: "PLA Basic", colorName: "Éjfekete", colorHex: "#1b1c20", finish: "selyemfényű", grossWeightG: 1180, spoolEmptyWeightG: 180,
      description: "DEMO rekord – általános célú, könnyen nyomtatható PLA.", useCases: "Prototípusok, dísztárgyak, beltéri tartók.", notRecommendedUses: "Tartós hőterhelés 50 °C fölött, kültér.",
      nozzleTempMinC: 195, nozzleTempMaxC: 225, bedTempMinC: 45, bedTempMaxC: 60, fanMinPct: 80, fanMaxPct: 100, printSpeedMaxMms: 250, maxVolumetricFlowMm3s: 18, retractDirectMm: 0.8, dryingTempC: 50, dryingTimeH: 6, abrasive: false, buildPlate: "Texturált PEI", enclosure: "Nem szükséges – nyitott ajtóval", storageNotes: "Zárt dobozban, szilikagéllel.", datasheetUrl: src("pla-basic") },
    prov: mfr([...printKeys, "maxVolumetricFlowMm3s"]),
    specs: [{ key: "density", label: "Sűrűség", value: 1.24, unit: "g/cm³", testMethod: "ISO 1183", origin: "manufacturer" }, { key: "tensile_strength", label: "Szakítószilárdság", value: 50, unit: "MPa", testMethod: "ISO 527", origin: "manufacturer" }, { key: "hdt", label: "Hődeformációs hőmérséklet (HDT)", value: 55, unit: "°C", origin: "estimate" }],
  },
  {
    v: { ...base, manufacturer: "DEMO Polymers", brand: "DemoFil", productName: "DEMO PLA Silk", sku: "DEMO-PLA-S-GD", materialFamily: "PLA", materialNameRaw: "PLA Silk", colorName: "Antik arany", colorHex: "#c9a24b", finish: "magasfényű", effect: "silk",
      description: "DEMO rekord – selyemfényű dekor PLA.", useCases: "Vázák, figurák, ajándéktárgyak.", layerAdhesion: "Gyengébb, mint a sima PLA",
      nozzleTempMinC: 205, nozzleTempMaxC: 230, bedTempMinC: 50, bedTempMaxC: 60, fanMinPct: 60, fanMaxPct: 100, printSpeedMaxMms: 120, dryingTempC: 50, dryingTimeH: 6, abrasive: false, datasheetUrl: src("pla-silk") },
    prov: mfr(printKeys),
  },
  {
    v: { ...base, manufacturer: "DEMO Polymers", brand: "DemoFil", productName: "DEMO PETG", sku: "DEMO-PETG-TR-BL", materialFamily: "PETG", materialNameRaw: "PETG", colorName: "Áttetsző kék", colorHex: "#3d7fd6", transparency: "áttetsző",
      description: "DEMO rekord – szívós, vegyszerálló PETG.", useCases: "Funkcionális alkatrészek, tartók, kültéri kisebb elemek.", chemicalProps: "Jó ellenállás híg savakkal, lúgokkal szemben",
      nozzleTempMinC: 230, nozzleTempMaxC: 255, bedTempMinC: 70, bedTempMaxC: 85, fanMinPct: 30, fanMaxPct: 60, printSpeedMaxMms: 180, maxVolumetricFlowMm3s: 12, dryingTempC: 65, dryingTimeH: 6, abrasive: false, buildPlate: "Texturált PEI (sima PEI-re leválasztóval)", adhesive: "Sima PEI-n ragasztóstift leválasztóként", datasheetUrl: src("petg") },
    prov: mfr(printKeys),
    specs: [{ key: "density", label: "Sűrűség", value: 1.27, unit: "g/cm³", origin: "manufacturer" }, { key: "hdt", label: "Hődeformációs hőmérséklet (HDT)", value: 68, unit: "°C", testMethod: "ISO 75, 0,45 MPa", origin: "manufacturer" }],
  },
  {
    v: { ...base, manufacturer: "DEMO Engineering Materials", brand: "DemoTech", productName: "DEMO ASA", sku: "DEMO-ASA-GY", materialFamily: "ASA", materialNameRaw: "ASA", colorName: "Betonszürke", colorHex: "#8a8d91", finish: "matt",
      description: "DEMO rekord – UV-álló kültéri anyag.", useCases: "Kültéri burkolatok, autós alkatrészek.", uvOutdoorProps: "Kiváló UV- és időjárásállóság", shrinkage: "Közepes – zárt, fűtött kamra ajánlott",
      nozzleTempMinC: 240, nozzleTempMaxC: 270, bedTempMinC: 90, bedTempMaxC: 105, chamberTempMinC: 45, chamberTempMaxC: 60, fanMinPct: 0, fanMaxPct: 30, dryingTempC: 80, dryingTimeH: 6, abrasive: false, enclosure: "Zárt, fűtött kamra", ventilationNotes: "Sztirol-emisszió – szűrővel / szellőztetéssel nyomtatandó.", datasheetUrl: src("asa") },
    prov: mfr([...printKeys, "chamberTempMinC", "chamberTempMaxC"]),
  },
  {
    v: { ...base, manufacturer: "DEMO Engineering Materials", brand: "DemoTech", productName: "DEMO PA12-CF", sku: "DEMO-PA12CF-BK", materialFamily: "Kompozit", materialNameRaw: "PA12-CF15", colorName: "Fekete", colorHex: "#111214", finish: "matt", netWeightG: 500,
      description: "DEMO rekord – szénszálas nylon, merev mérnöki anyag.", useCases: "Szerszámok, befogók, terhelt gépalkatrészek.", mechanicalProps: "Nagy merevség, jó hőállóság", notRecommendedUses: "Rugalmasságot igénylő alkatrészek.",
      nozzleTempMinC: 270, nozzleTempMaxC: 300, bedTempMinC: 80, bedTempMaxC: 100, chamberTempMinC: 50, chamberTempMaxC: 65, fanMinPct: 0, fanMaxPct: 30, dryingTempC: 80, dryingTimeH: 12, abrasive: true, nozzleRequirement: "Edzett acél, min. 0,4 mm (ajánlott 0,6 mm)", enclosure: "Zárt, fűtött kamra", storageNotes: "Erősen nedvszívó – szárítóból nyomtatva.", datasheetUrl: src("pa12-cf") },
    prov: mfr([...printKeys, "abrasive", "nozzleRequirement"]),
    specs: [{ key: "tensile_strength", label: "Szakítószilárdság", value: 100, unit: "MPa", testMethod: "ISO 527", origin: "manufacturer" }, { key: "hdt", label: "Hődeformációs hőmérséklet (HDT)", value: 150, unit: "°C", testMethod: "ISO 75, 0,45 MPa", origin: "manufacturer" }],
  },
  {
    v: { ...base, manufacturer: "DEMO Flex Labs", brand: "DemoFlex", productName: "DEMO TPU 95A", sku: "DEMO-TPU95-RD", materialFamily: "TPU", materialNameRaw: "TPU 95A", colorName: "Jelzőpiros", colorHex: "#d23b34",
      description: "DEMO rekord – rugalmas, kopásálló TPU.", useCases: "Tömítések, lengéscsillapítók, tokok.", flexibility: "Shore 95A",
      nozzleTempMinC: 215, nozzleTempMaxC: 240, bedTempMinC: 30, bedTempMaxC: 50, fanMinPct: 50, fanMaxPct: 100, printSpeedMaxMms: 60, maxVolumetricFlowMm3s: 4, retractDirectMm: 0.6, dryingTempC: 70, dryingTimeH: 8, abrasive: false, datasheetUrl: src("tpu-95a") },
    prov: mfr(printKeys),
    specs: [{ key: "shore_hardness", label: "Shore keménység", value: "95A", origin: "manufacturer" }],
  },
  {
    v: { ...base, manufacturer: "DEMO Polymers", brand: "DemoFil", productName: "DEMO PLA Matte", sku: "DEMO-PLA-M-WH", materialFamily: "PLA", materialNameRaw: "PLA Matte", colorName: "Krétafehér", colorHex: "#eceae4", finish: "matt", effect: "matte",
      description: "DEMO rekord – matt felületű PLA, a rétegvonalakat jól elrejti.", nozzleTempMinC: 200, nozzleTempMaxC: 230, bedTempMinC: 45, bedTempMaxC: 60, dryingTempC: 50, dryingTimeH: 6, abrasive: false, datasheetUrl: src("pla-matte") },
    prov: mfr(printKeys),
  },
];

export interface DemoSummary { profiles: number; spools: number; purchases: number }

/** DEMO adatok betöltése. Ha már be vannak töltve, nem csinál semmit (null). */
export function loadDemo(db: DBX = getDb()): DemoSummary | null {
  if (hasDemo(db)) return null;
  const ids = db.transaction((tx) =>
    demos.map((d) => {
      const id = createProfile(d.v, d.prov ?? {}, { isDemo: true, specs: d.specs, via: "DEMO seed" }, tx);
      addSource(id, { url: String(d.v.datasheetUrl), title: `${d.v.productName} – DEMO termékoldal`, sourceType: "manufacturer", retrievedAt: "2026-10-01T10:00:00Z", fields: ["nozzle_temp_min_c", "nozzle_temp_max_c", "bed_temp_min_c", "bed_temp_max_c", "drying_temp_c"], excerpt: "DEMO kivonat – kitalált forrás, csak a felület bemutatására." }, null, tx);
      return id;
    }),
  );
  const [plaBasic, plaSilk, petg, asa, pacf, tpu, plaMatte] = ids;
  
  const p1 = createPurchase({ purchasedAt: "2026-09-14", seller: "DEMO Filament Bolt", orderReference: "DEMO-1001", currency: "HUF", shippingTotal: 1990, discountTotal: 1500, orderTotal: 27460, sourceKind: "manual", sourceReference: null, notes: "DEMO vásárlás", receivedAt: "2026-09-17", location: "Polc A / 1. doboz",
    items: [{ profileId: plaBasic, variant: null, quantity: 2, unitPrice: 6490, shippingShare: null, discountShare: null }, { profileId: petg, variant: null, quantity: 1, unitPrice: 6990, shippingShare: null, discountShare: null }, { profileId: plaSilk, variant: null, quantity: 1, unitPrice: 7490, shippingShare: null, discountShare: null }] }, { isDemo: true }, db);
  const p2 = createPurchase({ purchasedAt: "2026-10-22", seller: "DEMO Mérnöki Anyagok Kft.", orderReference: "DEMO-2040", currency: "EUR", shippingTotal: 6.9, discountTotal: null, orderTotal: null, sourceKind: "manual", sourceReference: null, notes: "DEMO vásárlás – a rendelés végösszege nem ismert", receivedAt: "2026-10-27", location: "Szárazdoboz 2",
    items: [{ profileId: asa, variant: null, quantity: 1, unitPrice: 24.9, shippingShare: null, discountShare: null }, { profileId: pacf, variant: "0,5 kg", quantity: 1, unitPrice: 39.9, shippingShare: null, discountShare: null }, { profileId: tpu, variant: null, quantity: 1, unitPrice: null, shippingShare: null, discountShare: null }] }, { isDemo: true }, db);
  const p3 = createPurchase({ purchasedAt: "2026-11-05", seller: "DEMO Filament Bolt", orderReference: "DEMO-1042", currency: "HUF", shippingTotal: 0, discountTotal: null, orderTotal: 13980, sourceKind: "manual", sourceReference: null, notes: "DEMO vásárlás", receivedAt: "2026-11-08", location: "Polc A / 2. doboz",
    items: [{ profileId: plaMatte, variant: null, quantity: 2, unitPrice: 6990, shippingShare: null, discountShare: null }] }, { isDemo: true }, db);
  
  // tekercsesemények: mérés, szárítás, nyomtatás – a nem mért tekercsek maradéka szándékosan üres marad
  const [basic1, basic2, petg1, silk1] = p1.spoolIds;
  const [asa1, pacf1, tpu1] = p2.spoolIds;
  addSpoolEvent(basic1, { type: "status", at: "2026-09-20", newStatus: "open", note: null, remainingG: null, usedG: null, isEstimate: false, dryTempC: null, dryHours: null }, db);
  addSpoolEvent(basic1, { type: "print_use", at: "2026-09-28", usedG: 310, note: "DEMO: szeletelő szerinti fogyás", remainingG: null, isEstimate: false, dryTempC: null, dryHours: null, newStatus: null }, db);
  addSpoolEvent(basic1, { type: "measure", at: "2026-10-30", remainingG: 142, note: "DEMO: mérlegen mérve, tekercs tömege levonva", usedG: null, isEstimate: false, dryTempC: null, dryHours: null, newStatus: null }, db);
  addSpoolEvent(petg1, { type: "dry", at: "2026-10-02", dryTempC: 65, dryHours: 6, note: "DEMO: szárító, A zóna", remainingG: null, usedG: null, isEstimate: false, newStatus: null }, db);
  addSpoolEvent(petg1, { type: "print_use", at: "2026-10-03", usedG: 420, note: null, remainingG: null, isEstimate: false, dryTempC: null, dryHours: null, newStatus: null }, db);
  addSpoolEvent(silk1, { type: "status", at: "2026-10-10", newStatus: "open", note: null, remainingG: null, usedG: null, isEstimate: false, dryTempC: null, dryHours: null }, db);
  addSpoolEvent(silk1, { type: "measure", at: "2026-10-18", remainingG: 0, note: "DEMO: elfogyott", usedG: null, isEstimate: false, dryTempC: null, dryHours: null, newStatus: null }, db);
  addSpoolEvent(silk1, { type: "status", at: "2026-10-18", newStatus: "empty", note: null, remainingG: null, usedG: null, isEstimate: false, dryTempC: null, dryHours: null }, db);
  addSpoolEvent(pacf1, { type: "dry", at: "2026-10-28", dryTempC: 80, dryHours: 12, note: "DEMO: első felbontás előtt", remainingG: null, usedG: null, isEstimate: false, newStatus: null }, db);
  addSpoolEvent(pacf1, { type: "print_use", at: "2026-10-29", usedG: 180, note: null, remainingG: null, isEstimate: false, dryTempC: null, dryHours: null, newStatus: null }, db);
  // nyitott, de soha nem mért tekercs → a maradék ismeretlen marad
  updateSpool(tpu1, { status: "open", initialWeightG: 1000, remainingG: null, remainingOrigin: null, receivedAt: "2026-10-27", openedAt: "2026-11-01", location: "Szárazdoboz 2", storageMethod: "Szárazdoboz szilikagéllel", moistureState: null, notes: "DEMO: még nem mértem" }, db);
  void basic2; void asa1; void p3;
  
  savePrintProfile(plaBasic, { name: "DEMO – 0,20 mm minőségi", slicer: "Orca Slicer", printer: "DEMO nyomtató", nozzleDiameterMm: 0.4, nozzleMaterial: "Edzett acél", version: "v1", settings: { nozzle_temp_c: 215, bed_temp_c: 55, chamber: "ki, ajtó nyitva", fan_pct: 100, outer_wall_speed_mms: 120, flow_ratio: 0.98, pressure_advance: 0.022 }, origin: "own", notes: "DEMO profil – saját hangolás mintája." }, undefined, db);
  savePrintProfile(petg, { name: "DEMO – szívós funkcionális", slicer: "Orca Slicer", printer: "DEMO nyomtató", nozzleDiameterMm: 0.4, nozzleMaterial: "Edzett acél", version: "v2", settings: { nozzle_temp_c: 245, bed_temp_c: 80, chamber_temp_c: 35, fan_pct: 40, max_volumetric_flow_mm3s: 11 }, origin: "own", notes: null }, undefined, db);
  addNote(plaBasic, { body: "DEMO megjegyzés: 215 °C-on a legszebb a felület, 225 fölött szálazik.", notedAt: "2026-10-05" }, db);
  addNote(pacf, { body: "DEMO megjegyzés: szárítás nélkül pattog és gyenge a rétegtapadás.", notedAt: "2026-10-29" }, db);
  
  reindexAll(db);
  return {
    profiles: db.select().from(S.materialProfiles).where(eq(S.materialProfiles.isDemo, true)).all().length,
    spools: db.select().from(S.spools).where(eq(S.spools.isDemo, true)).all().length,
    purchases: db.select().from(S.purchases).where(eq(S.purchases.isDemo, true)).all().length,
  };
}
