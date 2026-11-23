// Illeszkedés-algoritmus: mennyire nyomtatható egy filamenttípus A FELHASZNÁLÓ gépén.
// Tiszta függvény (nincs DB, nincs nyelv): a szöveget a felület adja a `reasons` kulcsaiból – t(r.key, r.params).
// Tesztek (táblázatos esetek): tests/fit.test.ts. Ha itt szabályt változtatsz, a teszteket és ezt a leírást is frissítsd,
// mert a laikus felhasználó ebben a címkében bízik.
//
// ── EREDMÉNY ────────────────────────────────────────────────────────────────────────────────────────────────
//   ideal  „Ideális a géphez”  minden követelmény tartalékkal teljesül
//   ok     „Jól megy”          nyomtatható, de valami nem kényelmes vagy nem ismert
//   limit  „Határeset”         csak kompromisszummal megy
//   no     „Nem nyomtatható”   a gép objektíven nem tudja
//   null   nincs címke         nincs megadva nyomtató, vagy sem a fúvóka, sem az asztal max. hőfoka nem ismert
// A végső `fit` a legrosszabb részítélet. Minden vizsgálat egy indokot ad (`reasons`), a jókat is.
//
// ── SZABÁLYOK ───────────────────────────────────────────────────────────────────────────────────────────────
// Fúvóka és asztal (a bejegyzés javasolt tartománya [min, max], közepe K, a gép maximuma M) – külön-külön:
//   M < min                 → no     a gép a tartomány alját sem éri el
//   min ≤ M < K             → limit  csak a tartomány alsó fele érhető el
//   K ≤ M < max             → ok     a tartomány nagy része megvan, a teteje nem
//   max ≤ M < max + 10 °C   → ok     a teljes tartomány megvan, de a gép a határán jár (RESERVE_C)
//   M ≥ max + 10 °C         → ideal
//   M ismeretlen            → ok, „ismeretlen” jelzéssel
// (A javasolt tartományok a márkák közti szórást is lefedik, ezért a közepét elérő gép a legtöbb tekerccsel megbirkózik.)
//
// Kamra (a bejegyzés módja szerint; `open` / `off` / `optional` módnál nincs vizsgálat).
// A gép kamrája: AKTÍV (fűtött kamra), PASSZÍV (zárt tér fűtés nélkül), NYITOTT (nem zárt), vagy ismeretlen.
//                              required (kötelező)         recommended (ajánlott)
//   aktív, max ≥ javasolt min  ideal                       ideal
//   aktív, max < javasolt min  limit                       ok
//   aktív, max ismeretlen      ok (ismeretlen)             ideal
//   passzív (zárt, fűtetlen)   limit                       ok
//   nyitott                    no                          limit
//   fűtetlen, zártság ismeretlen  limit (ismeretlen)       limit (ismeretlen)
//   semmi nem ismert           limit (ismeretlen)          ok (ismeretlen)
//
// Edzett fúvóka (ha a bejegyzés abrazív):  van → ideal · nincs → limit · ismeretlen → limit (ismeretlen)
//
// Nehézség: ha a bejegyzés nyomtathatósága 5-ből legfeljebb 2 (HARD_EASE), az ítélet legfeljebb `ok` –
// kényes anyag a legjobb gépen sem „ideális”. (Ez az egyetlen szabály, amely nem a gép adatain múlik.)
//
// Ismeretlen (NULL) adatot SOHA nem találunk ki: az indok `unknown: true` jelzést kap, és az ítélet legfeljebb `ok`;
// ha egy KÖTELEZŐ képesség (kötelező kamra, edzett fúvóka) ismeretlen, akkor `limit`.
//
// Szárító: NEM rontja a `fit`-et (az a nyomtatóról szól), külön `dryerWarnings` listába kerül:
//   a javasolt szárítási hőfok a szárító maximuma fölött van · a minimuma alatt van · a szárító tartománya ismeretlen.
//
// ── ELTÉRÉS AZ EREDETI VÁZLATTÓL (szándékos) ────────────────────────────────────────────────────────────────
//  • „max. 10 °C tartalék” nem `limit`, hanem `ok`: különben pl. a PETG „határeset” lenne minden 260 °C-os gépen.
//  • A tartomány közepét elérő gép `ok`, nem `limit`: az ABS-hez a 100 °C-os asztal a bevett gyakorlat.
//  • A fűtetlen, de zárt gép (a legelterjedtebb típus) kötelező kamránál `limit`, nem `no`: az ABS zárt térben megy.
//    Ehhez a nyomtatóprofil kapott egy `enclosed` (zárt tér) mezőt.
//  • A túl hideg szárító nem `limit`: a legtöbb szárító 50–70 °C-os, így minden mérnöki anyag „határeset” lenne.

export type Fit = "ideal" | "ok" | "limit" | "no";
export type ChamberMode = "open" | "off" | "optional" | "recommended" | "required";
export type Range = readonly [number, number];

/** Egy filamenttípus követelményei (a Tuttirial-bejegyzésből: `requirementsOf`). */
export interface FitRequirements {
  nozzle: Range | null;
  bed: Range | null;
  /** javasolt kamrahőfok; csak `recommended` / `required` módnál számít */
  chamber: Range | null;
  chamberMode: ChamberMode;
  /** abrazív: edzett fúvóka kell */
  hardened: boolean;
  /** javasolt szárítási hőfok (°C); null = nem kell szárítani */
  dryTempC: number | null;
  /** könnyű nyomtathatóság 1–5 (5 = legkönnyebb); elhagyható */
  ease?: number | null;
}

/** A gép releváns adatai. null/undefined = ismeretlen. (A PrinterProfile szerkezetileg megfelel.) */
export interface FitPrinter {
  maxNozzleC?: number | null;
  maxBedC?: number | null;
  enclosed?: boolean | null;
  heatedChamber?: boolean | null;
  maxChamberC?: number | null;
  hardenedNozzle?: boolean | null;
}
export interface FitDryer { minC?: number | null; maxC?: number | null }
export interface FitEquipment { printer?: FitPrinter | null; dryer?: FitDryer | null }

export interface FitReason {
  /** i18n kulcs: fit.reason.* */
  key: string;
  params: Record<string, number>;
  /** ennek az egy vizsgálatnak az ítélete */
  fit: Fit;
  /** az ítélet egy ismeretlen (meg nem adott) gépadaton múlik */
  unknown: boolean;
}
export interface FitResult { fit: Fit | null; reasons: FitReason[]; dryerWarnings: FitReason[] }

/** Ennyi tartalék kell a gép maximuma és a tartomány teteje között az „ideális”-hoz. */
export const RESERVE_C = 10;
/** Legfeljebb ekkora (1–5) nyomtathatóságnál az anyag „kényes”: az ítélet legfeljebb `ok`. */
export const HARD_EASE = 2;

export const FIT_ORDER: readonly Fit[] = ["ideal", "ok", "limit", "no"];
const worst = (a: Fit, b: Fit): Fit => (FIT_ORDER.indexOf(a) >= FIT_ORDER.indexOf(b) ? a : b);
const known = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const reason = (key: string, fit: Fit, params: Record<string, number> = {}, unknown = false): FitReason => ({ key: `fit.reason.${key}`, params, fit, unknown });

function heat(part: "nozzle" | "bed", need: Range, max: number | null | undefined): FitReason {
  const [lo, hi] = need;
  if (!known(max)) return reason(`${part}.unknown`, "ok", { lo, hi }, true);
  const p = { lo, hi, max };
  if (max < lo) return reason(`${part}.tooLow`, "no", p);
  if (max < (lo + hi) / 2) return reason(`${part}.partial`, "limit", p);
  if (max < hi) return reason(`${part}.most`, "ok", p);
  if (max < hi + RESERVE_C) return reason(`${part}.tight`, "ok", p);
  return reason(`${part}.ok`, "ideal", p);
}

type ChamberKind = "active" | "passive" | "open" | "unheated" | "unknown";
/** A gép kamrájának besorolása a megadott adatokból (kitalálás nélkül). */
export function chamberKind(p: FitPrinter): ChamberKind {
  if (p.heatedChamber === true || (p.heatedChamber == null && known(p.maxChamberC))) return "active";
  if (p.enclosed === false) return "open";
  if (p.enclosed === true) return "passive"; // legalább zárt; ha a fűtés nem ismert, a biztosat vesszük
  return p.heatedChamber === false ? "unheated" : "unknown";
}

function chamber(req: FitRequirements, p: FitPrinter): FitReason | null {
  const mode = req.chamberMode;
  if (mode !== "required" && mode !== "recommended") return null;
  const required = mode === "required";
  const lo = req.chamber?.[0];
  const kind = chamberKind(p);
  if (kind === "active") {
    if (!known(p.maxChamberC)) return reason("chamber.activeUnknownMax", required ? "ok" : "ideal", known(lo) ? { lo } : {}, required);
    if (known(lo) && p.maxChamberC < lo) return reason("chamber.activeLow", required ? "limit" : "ok", { lo, max: p.maxChamberC });
    return reason("chamber.activeOk", "ideal", { max: p.maxChamberC });
  }
  if (kind === "passive") return reason(`chamber.passive.${mode}`, required ? "limit" : "ok");
  if (kind === "open") return reason(`chamber.open.${mode}`, required ? "no" : "limit");
  if (kind === "unheated") return reason(`chamber.unheated.${mode}`, "limit", {}, true);
  return reason(`chamber.unknown.${mode}`, required ? "limit" : "ok", {}, true);
}

function dryer(req: FitRequirements, d: FitDryer | null | undefined): FitReason[] {
  const need = req.dryTempC;
  if (!d || !known(need)) return [];
  if (!known(d.minC) && !known(d.maxC)) return [reason("dryer.unknown", "ok", { need }, true)];
  if (known(d.maxC) && need > d.maxC) return [reason("dryer.tooCool", "limit", { need, max: d.maxC })];
  if (known(d.minC) && need < d.minC) return [reason("dryer.tooHot", "limit", { need, min: d.minC })];
  return [];
}

/** A követelmények és a felszerelés összevetése. A szabályok a fájl tetején. */
export function computeFit(req: FitRequirements, equipment: FitEquipment | null | undefined): FitResult {
  const dryerWarnings = dryer(req, equipment?.dryer);
  const p = equipment?.printer;
  if (!p) return { fit: null, reasons: [], dryerWarnings };
  if (!known(p.maxNozzleC) && !known(p.maxBedC)) return { fit: null, reasons: [reason("insufficient", "ok", {}, true)], dryerWarnings };

  const reasons: FitReason[] = [];
  if (req.nozzle) reasons.push(heat("nozzle", req.nozzle, p.maxNozzleC));
  if (req.bed) reasons.push(heat("bed", req.bed, p.maxBedC));
  const ch = chamber(req, p);
  if (ch) reasons.push(ch);
  if (req.hardened) {
    reasons.push(
      p.hardenedNozzle === true ? reason("hardened.ok", "ideal")
        : p.hardenedNozzle === false ? reason("hardened.missing", "limit")
          : reason("hardened.unknown", "limit", {}, true),
    );
  }
  if (known(req.ease) && req.ease <= HARD_EASE) reasons.push(reason("difficulty", "ok"));
  return { fit: reasons.reduce<Fit>((acc, r) => worst(acc, r.fit), "ideal"), reasons, dryerWarnings };
}
