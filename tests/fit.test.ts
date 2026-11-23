import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/i18n/core";
import { FIT_ORDER, chamberKind, computeFit, type Fit, type FitDryer, type FitPrinter, type FitRequirements } from "@/lib/fit";

// ── követelmények (tipikus filamenttípusok) ──────────────────────────────────────────────────────────────────
const req = (over: Partial<FitRequirements>): FitRequirements => ({ nozzle: null, bed: null, chamber: null, chamberMode: "off", hardened: false, dryTempC: null, ...over });
const PLA = req({ nozzle: [190, 230], bed: [45, 65], chamberMode: "open", dryTempC: 50 });
const PETG = req({ nozzle: [230, 260], bed: [70, 85], dryTempC: 65 });
const ABS = req({ nozzle: [240, 270], bed: [90, 110], chamber: [55, 65], chamberMode: "required", dryTempC: 80 });
const PA12 = req({ nozzle: [250, 280], bed: [80, 100], chamber: [45, 65], chamberMode: "recommended", dryTempC: 80 });
const PA_CF = req({ nozzle: [270, 300], bed: [80, 100], chamber: [50, 65], chamberMode: "recommended", hardened: true, dryTempC: 85 });
const PEEK = req({ nozzle: [360, 420], bed: [120, 160], chamber: [90, 150], chamberMode: "required", hardened: true, dryTempC: 85 });

// ── gépek ────────────────────────────────────────────────────────────────────────────────────────────────────
/** fűtött kamrás, edzett fúvókás gép */
const FULL: FitPrinter = { maxNozzleC: 320, maxBedC: 120, enclosed: true, heatedChamber: true, maxChamberC: 65, hardenedNozzle: true };
/** zárt, de nem fűtött kamrás gép */
const ENCLOSED: FitPrinter = { maxNozzleC: 300, maxBedC: 110, enclosed: true, heatedChamber: false, hardenedNozzle: false };
/** nyitott vázas gép */
const OPEN: FitPrinter = { maxNozzleC: 260, maxBedC: 100, enclosed: false, heatedChamber: false, hardenedNozzle: false };
/** csak a két alapadat ismert */
const BASIC: FitPrinter = { maxNozzleC: 260, maxBedC: 100 };
const HOT: FitPrinter = { maxNozzleC: 300, maxBedC: 120 };

const keys = (r: { key: string }[]) => r.map((x) => x.key.replace("fit.reason.", ""));

describe("computeFit – nyomtató", () => {
  const cases: [string, FitRequirements, FitPrinter | null, Fit | null, string[]][] = [
    ["PLA fűtött kamrás gépen", PLA, FULL, "ideal", ["nozzle.ok", "bed.ok"]],
    ["PLA nyitott gépen", PLA, OPEN, "ideal", ["nozzle.ok", "bed.ok"]],
    ["PETG 260 °C-os gépen: megvan, de nincs tartalék", PETG, OPEN, "ok", ["nozzle.tight", "bed.ok"]],
    ["PETG: pontosan +10 °C tartalék már ideális", PETG, { maxNozzleC: 270, maxBedC: 95 }, "ideal", ["nozzle.ok", "bed.ok"]],
    ["PETG: +9 °C tartalék még csak ok", PETG, { maxNozzleC: 269, maxBedC: 95 }, "ok", ["nozzle.tight", "bed.ok"]],
    ["PETG: asztal +9 °C", PETG, { maxNozzleC: 300, maxBedC: 94 }, "ok", ["nozzle.ok", "bed.tight"]],
    ["ABS fűtött kamrás gépen", ABS, FULL, "ideal", ["nozzle.ok", "bed.ok", "chamber.activeOk"]],
    ["ABS zárt, fűtetlen gépen: határeset", ABS, ENCLOSED, "limit", ["nozzle.ok", "bed.tight", "chamber.passive.required"]],
    ["ABS nyitott gépen: nem megy", ABS, OPEN, "no", ["nozzle.most", "bed.most", "chamber.open.required"]],
    ["ABS 100 °C-os asztalon, zárt gépben: a tartomány közepe megvan", ABS, { ...ENCLOSED, maxBedC: 100 }, "limit", ["nozzle.ok", "bed.most", "chamber.passive.required"]],
    ["a tartomány közepe pontosan elérhető → ok", req({ nozzle: [240, 270], bed: [90, 110] }), { maxNozzleC: 255, maxBedC: 100 }, "ok", ["nozzle.most", "bed.most"]],
    ["a tartomány közepe alatt → limit", req({ nozzle: [240, 270], bed: [90, 110] }), { maxNozzleC: 254, maxBedC: 120 }, "limit", ["nozzle.partial", "bed.ok"]],
    ["pontosan a minimum → limit (nem no)", req({ nozzle: [240, 270] }), { maxNozzleC: 240, maxBedC: 60 }, "limit", ["nozzle.partial"]],
    ["egy fokkal a minimum alatt → no", req({ nozzle: [240, 270] }), { maxNozzleC: 239, maxBedC: 60 }, "no", ["nozzle.tooLow"]],
    ["kényes anyag (nyomtathatóság 2/5) a legjobb gépen is legfeljebb ok", { ...PLA, ease: 2 }, FULL, "ok", ["nozzle.ok", "bed.ok", "difficulty"]],
    ["közepesen könnyű anyag (3/5) lehet ideális", { ...PLA, ease: 3 }, FULL, "ideal", ["nozzle.ok", "bed.ok"]],
    ["a nehézség nem javít a rossz ítéleten", { ...PEEK, ease: 1 }, OPEN, "no", ["nozzle.tooLow", "bed.tooLow", "chamber.open.required", "hardened.missing", "difficulty"]],
    ["ABS, a kamráról semmit nem tudunk", ABS, HOT, "limit", ["nozzle.ok", "bed.ok", "chamber.unknown.required"]],
    ["ABS, fűtetlen, zártság ismeretlen", ABS, { ...HOT, heatedChamber: false }, "limit", ["nozzle.ok", "bed.ok", "chamber.unheated.required"]],
    ["ABS, fűtött kamra ismeretlen hőfokkal", ABS, { ...HOT, heatedChamber: true }, "ok", ["nozzle.ok", "bed.ok", "chamber.activeUnknownMax"]],
    ["ABS, a fűtött kamra hidegebb a javasoltnál", ABS, { ...HOT, heatedChamber: true, maxChamberC: 50 }, "limit", ["nozzle.ok", "bed.ok", "chamber.activeLow"]],
    ["ABS, megadott kamrahőfok = fűtött kamra", ABS, { ...HOT, maxChamberC: 60 }, "ideal", ["nozzle.ok", "bed.ok", "chamber.activeOk"]],
    ["ABS, az asztal a minimumot sem éri el", ABS, { ...FULL, maxBedC: 80 }, "no", ["nozzle.ok", "bed.tooLow", "chamber.activeOk"]],
    ["ABS, a fúvóka csak a tartomány alsó felét éri el", ABS, { ...FULL, maxNozzleC: 250 }, "limit", ["nozzle.partial", "bed.ok", "chamber.activeOk"]],
    ["PA-CF fűtött kamrás, edzett fúvókás gépen", PA_CF, FULL, "ideal", ["nozzle.ok", "bed.ok", "chamber.activeOk", "hardened.ok"]],
    ["PA-CF, nincs edzett fúvóka", PA_CF, { ...FULL, hardenedNozzle: false }, "limit", ["nozzle.ok", "bed.ok", "chamber.activeOk", "hardened.missing"]],
    ["PA-CF, a fúvóka anyaga ismeretlen", PA_CF, { ...FULL, hardenedNozzle: null }, "limit", ["nozzle.ok", "bed.ok", "chamber.activeOk", "hardened.unknown"]],
    ["PA-CF zárt gépen, edzett fúvókával", PA_CF, { ...ENCLOSED, hardenedNozzle: true }, "ok", ["nozzle.tight", "bed.ok", "chamber.passive.recommended", "hardened.ok"]],
    ["ajánlott kamra, nyitott gép", PA12, { ...HOT, enclosed: false }, "limit", ["nozzle.ok", "bed.ok", "chamber.open.recommended"]],
    ["ajánlott kamra, semmit nem tudunk", PA12, HOT, "ok", ["nozzle.ok", "bed.ok", "chamber.unknown.recommended"]],
    ["ajánlott kamra, fűtetlen, zártság ismeretlen", PA12, { ...HOT, heatedChamber: false }, "limit", ["nozzle.ok", "bed.ok", "chamber.unheated.recommended"]],
    ["ajánlott kamra, hidegebb fűtött kamra", PA12, { ...HOT, heatedChamber: true, maxChamberC: 40 }, "ok", ["nozzle.ok", "bed.ok", "chamber.activeLow"]],
    ["ajánlott kamra, fűtött kamra ismeretlen hőfokkal", PA12, { ...HOT, heatedChamber: true }, "ideal", ["nozzle.ok", "bed.ok", "chamber.activeUnknownMax"]],
    ["PEEK: a gép nem éri el", PEEK, FULL, "no", ["nozzle.tooLow", "bed.partial", "chamber.activeLow", "hardened.ok"]],
    ["PEEK forró fúvókával is határeset a hideg kamra és asztal miatt", PEEK, { ...FULL, maxNozzleC: 450 }, "limit", ["nozzle.ok", "bed.partial", "chamber.activeLow", "hardened.ok"]],
    ["ismeretlen fúvókahőfok: legfeljebb ok", PLA, { maxBedC: 100 }, "ok", ["nozzle.unknown", "bed.ok"]],
    ["ismeretlen asztalhőfok: legfeljebb ok", PLA, { maxNozzleC: 300 }, "ok", ["nozzle.ok", "bed.unknown"]],
    ["sem fúvóka, sem asztal: nincs címke", PLA, { enclosed: true, hardenedNozzle: true }, null, ["insufficient"]],
    ["üres nyomtatóprofil: nincs címke", ABS, {}, null, ["insufficient"]],
    ["nincs nyomtató: nincs címke", ABS, null, null, []],
    ["követelmény nélküli bejegyzés", req({}), BASIC, "ideal", []],
    ["opcionális kamra nem számít", req({ nozzle: [240, 270], bed: [70, 110], chamber: [0, 65], chamberMode: "optional" }), { ...HOT, enclosed: false }, "ideal", ["nozzle.ok", "bed.ok"]],
  ];

  it.each(cases)("%s", (_name, r, printer, fit, reasonKeys) => {
    const res = computeFit(r, { printer });
    expect(res.fit).toBe(fit);
    expect(keys(res.reasons)).toEqual(reasonKeys);
    expect(res.dryerWarnings).toEqual([]);
  });

  it("felszerelés nélkül (null / undefined / üres) nincs címke", () => {
    for (const eq of [null, undefined, {}, { printer: null, dryer: null }]) expect(computeFit(ABS, eq)).toEqual({ fit: null, reasons: [], dryerWarnings: [] });
  });

  it("a végső ítélet a legrosszabb részítélet; az ismeretlen adat jelölve van", () => {
    const res = computeFit(PA_CF, { printer: { maxNozzleC: 320, maxBedC: 120 } });
    expect(res.reasons.map((r) => [r.key.replace("fit.reason.", ""), r.fit, r.unknown])).toEqual([
      ["nozzle.ok", "ideal", false],
      ["bed.ok", "ideal", false],
      ["chamber.unknown.recommended", "ok", true],
      ["hardened.unknown", "limit", true],
    ]);
    expect(res.fit).toBe("limit");
  });

  it("az indok paraméterei a tényleges számok", () => {
    const [n, b, c] = computeFit(ABS, { printer: { ...HOT, heatedChamber: true, maxChamberC: 50 } }).reasons;
    expect(n.params).toEqual({ lo: 240, hi: 270, max: 300 });
    expect(b.params).toEqual({ lo: 90, hi: 110, max: 120 });
    expect(c.params).toEqual({ lo: 55, max: 50 });
  });

  it.each([
    [{ heatedChamber: true }, "active"],
    [{ maxChamberC: 60 }, "active"],
    [{ heatedChamber: false, enclosed: true }, "passive"],
    [{ enclosed: true }, "passive"],
    [{ heatedChamber: false, enclosed: false }, "open"],
    [{ enclosed: false }, "open"],
    [{ heatedChamber: false }, "unheated"],
    [{}, "unknown"],
  ] as [FitPrinter, string][])("kamra besorolása %j → %s", (p, kind) => {
    expect(chamberKind(p)).toBe(kind);
  });
});

describe("computeFit – szárító (nem rontja a fit-et)", () => {
  const cases: [string, FitRequirements, FitDryer | null, string[]][] = [
    ["a szárító nem éri el a javasolt hőfokot", PA_CF, { minC: 45, maxC: 70 }, ["dryer.tooCool"]],
    ["a szárító legkisebb fokozata is melegebb", PLA, { minC: 55, maxC: 85 }, ["dryer.tooHot"]],
    ["a tartományon belül", ABS, { minC: 45, maxC: 85 }, []],
    ["a tartomány szélein (min és max) még jó", req({ dryTempC: 45 }), { minC: 45, maxC: 45 }, []],
    ["a szárító tartománya ismeretlen", ABS, {}, ["dryer.unknown"]],
    ["csak a max ismert, és elég", PLA, { maxC: 70 }, []],
    ["csak a min ismert: a maxról nem állítunk semmit", PA_CF, { minC: 45 }, []],
    ["nem kell szárítani", req({ dryTempC: null }), { minC: 45, maxC: 70 }, []],
    ["nincs szárító", PA_CF, null, []],
  ];
  it.each(cases)("%s", (_name, r, dryer, warningKeys) => {
    const res = computeFit(r, { printer: FULL, dryer });
    expect(keys(res.dryerWarnings)).toEqual(warningKeys);
    expect(res.fit).toBe(computeFit(r, { printer: FULL }).fit);
  });

  it("nyomtató nélkül is ad szárító-figyelmeztetést, címke nélkül", () => {
    const res = computeFit(PA_CF, { dryer: { minC: 45, maxC: 70 } });
    expect(res.fit).toBeNull();
    expect(res.dryerWarnings.map((w) => [w.key, w.params])).toEqual([["fit.reason.dryer.tooCool", { need: 85, max: 70 }]]);
  });
});

describe("computeFit – tulajdonságok a teljes bemeneti térben", () => {
  const tri = [true, false, null];
  const printers: FitPrinter[] = [];
  for (const maxNozzleC of [null, 240, 260, 300, 320, 450])
    for (const maxBedC of [null, 60, 100, 120, 160])
      for (const enclosed of tri) for (const heatedChamber of tri) for (const maxChamberC of [null, 50, 65, 100]) for (const hardenedNozzle of tri)
        printers.push({ maxNozzleC, maxBedC, enclosed, heatedChamber, maxChamberC, hardenedNozzle });
  const dryers: (FitDryer | null)[] = [null, {}, { minC: 45, maxC: 70 }, { minC: 60, maxC: 110 }];
  const reqs = [PLA, PETG, ABS, PA12, PA_CF, PEEK, { ...PA12, ease: 1 }];
  const rank = (f: Fit | null) => (f === null ? -1 : FIT_ORDER.indexOf(f));

  it("minden indok kulcsa létezik mindkét szótárban, és minden fit.reason.* kulcs elő is áll", () => {
    const seen = new Set<string>();
    for (const r of reqs) for (const printer of printers) for (const dryer of dryers) {
      const res = computeFit(r, { printer, dryer });
      for (const x of [...res.reasons, ...res.dryerWarnings]) seen.add(x.key);
    }
    for (const k of seen) {
      expect(MESSAGES.hu[k], k).toBeTypeOf("string");
      expect(MESSAGES.en[k], k).toBeTypeOf("string");
    }
    expect(Object.keys(MESSAGES.hu).filter((k) => k.startsWith("fit.reason.")).sort()).toEqual([...seen].sort());
  });

  it("az indok paraméterei lefedik a szöveg helyőrzőit", () => {
    for (const r of reqs) for (const printer of printers) {
      for (const x of computeFit(r, { printer, dryer: { minC: 60, maxC: 70 } }).reasons) {
        const needed = (MESSAGES.hu[x.key].match(/\{(\w+)\}/g) ?? []).map((s) => s.slice(1, -1));
        for (const n of needed) expect(x.params[n], `${x.key} {${n}}`).toBeTypeOf("number");
      }
    }
  });

  it("melegebb fúvóka vagy asztal soha nem ront az ítéleten", () => {
    for (const r of reqs) for (const p of printers) {
      if (p.maxNozzleC == null || p.maxBedC == null) continue;
      const base = rank(computeFit(r, { printer: p }).fit);
      expect(rank(computeFit(r, { printer: { ...p, maxNozzleC: p.maxNozzleC + 40 } }).fit)).toBeLessThanOrEqual(base);
      expect(rank(computeFit(r, { printer: { ...p, maxBedC: p.maxBedC + 40 } }).fit)).toBeLessThanOrEqual(base);
    }
  });

  it("ismeretlen adat mellett soha nem „ideális”", () => {
    for (const r of reqs) for (const p of printers) {
      const res = computeFit(r, { printer: p });
      if (res.reasons.some((x) => x.unknown)) expect(res.fit).not.toBe("ideal");
    }
  });
});
