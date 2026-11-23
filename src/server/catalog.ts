import { desc } from "drizzle-orm";
import { getDb, schema, type DBX } from "@/db/client";
import { LOW_STOCK_G, type SpoolStatus } from "@/lib/fields";
import { norm } from "@/lib/normalize";
import { searchProfileIds } from "./search";
import { spoolCost, type SpoolCost } from "./stock";

export interface SpoolView extends schema.Spool {
  /** készletszámításhoz használt gramm: mért/becsült maradék, bontatlannál névleges tömeg, különben ismeretlen */
  stockG: number | null;
  stockBasis: "measured" | "estimate" | "nominal" | "unknown";
  purchasedAt: string | null;
  seller: string | null;
  cost: SpoolCost | null;
}

export interface CatalogRow {
  profile: schema.MaterialProfile;
  spools: SpoolView[];
  counts: Record<SpoolStatus, number>;
  activeCount: number;
  stockG: number;
  unknownStockCount: number;
  hasEstimate: boolean;
  lastPurchasedAt: string | null;
  sellers: string[];
  rank: number;
}

export function spoolStock(s: schema.Spool): Pick<SpoolView, "stockG" | "stockBasis"> {
  if (s.status === "empty" || s.status === "discarded") return { stockG: 0, stockBasis: "measured" };
  if (s.remainingG !== null) return { stockG: s.remainingG, stockBasis: s.remainingOrigin === "measured" ? "measured" : "estimate" };
  if (s.status === "sealed" && s.initialWeightG !== null) return { stockG: s.initialWeightG, stockBasis: "nominal" };
  return { stockG: null, stockBasis: "unknown" };
}

/** Teljes katalógus betöltése (egyfelhasználós lépték: néhány száz sor) – a szűrés memóriában történik. */
export function loadCatalog(db: DBX = getDb()): CatalogRow[] {
  const S = schema;
  const profiles = db.select().from(S.materialProfiles).orderBy(desc(S.materialProfiles.updatedAt)).all();
  const spools = db.select().from(S.spools).all();
  const items = db.select().from(S.purchaseItems).all();
  const purchases = db.select().from(S.purchases).all();
  const itemById = new Map(items.map((i) => [i.id, i]));
  const purchaseById = new Map(purchases.map((p) => [p.id, p]));
  const itemsByPurchase = new Map<number, schema.PurchaseItem[]>();
  for (const i of items) itemsByPurchase.set(i.purchaseId, [...(itemsByPurchase.get(i.purchaseId) ?? []), i]);

  const byProfile = new Map<number, SpoolView[]>();
  for (const s of spools) {
    const item = s.purchaseItemId ? itemById.get(s.purchaseItemId) : undefined;
    const purchase = item ? purchaseById.get(item.purchaseId) : undefined;
    const view: SpoolView = {
      ...s,
      ...spoolStock(s),
      purchasedAt: purchase?.purchasedAt ?? null,
      seller: purchase?.seller ?? null,
      cost: item && purchase ? spoolCost(item, purchase, itemsByPurchase.get(purchase.id) ?? [item]) : null,
    };
    byProfile.set(s.profileId, [...(byProfile.get(s.profileId) ?? []), view]);
  }

  return profiles.map((profile) => {
    const sp = (byProfile.get(profile.id) ?? []).sort((a, b) => a.code.localeCompare(b.code));
    const counts: Record<SpoolStatus, number> = { sealed: 0, open: 0, empty: 0, discarded: 0 };
    for (const s of sp) counts[s.status as SpoolStatus]++;
    const active = sp.filter((s) => s.status === "sealed" || s.status === "open");
    const dates = sp.map((s) => s.purchasedAt).filter((d): d is string => !!d).sort();
    return {
      profile,
      spools: sp,
      counts,
      activeCount: active.length,
      stockG: active.reduce((a, s) => a + (s.stockG ?? 0), 0),
      unknownStockCount: active.filter((s) => s.stockG === null).length,
      hasEstimate: active.some((s) => s.stockBasis === "estimate"),
      lastPurchasedAt: dates.at(-1) ?? null,
      sellers: [...new Set(sp.map((s) => s.seller).filter((x): x is string => !!x))],
      rank: 0,
    };
  });
}

export interface CatalogFilters {
  q?: string;
  manufacturer?: string;
  family?: string;
  color?: string;
  diameter?: string;
  status?: string; // sealed | open | empty | discarded | none | low
  seller?: string;
  location?: string;
  effect?: string;
  from?: string;
  to?: string;
  nozzleMin?: string; // a fúvóka-tartomány tartalmazza-e ezt a hőfokot
  bedMax?: string; // asztal ≤
  dryMax?: string; // szárítás ≤
  chamber?: string; // yes | no
  abrasive?: string; // yes | no
  demo?: string; // hide
  sort?: string;
}

const num = (v: string | undefined) => {
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function isLowStock(s: SpoolView): boolean {
  return s.status === "open" && s.stockG !== null && s.stockG <= LOW_STOCK_G;
}

export function filterCatalog(rows: CatalogRow[], f: CatalogFilters): CatalogRow[] {
  const ids = searchProfileIds(f.q);
  const rank = ids ? new Map(ids.map((id, i) => [id, i])) : null;
  const colorQ = norm(f.color);
  const sellerQ = norm(f.seller);
  const locQ = norm(f.location);
  const effQ = norm(f.effect);
  const nozzle = num(f.nozzleMin), bedMax = num(f.bedMax), dryMax = num(f.dryMax), dia = num(f.diameter);

  let out = rows.filter(({ profile: p, spools, counts, lastPurchasedAt, sellers }) => {
    if (rank && !rank.has(p.id)) return false;
    if (f.manufacturer && norm(p.manufacturer) !== norm(f.manufacturer) && norm(p.brand) !== norm(f.manufacturer)) return false;
    if (f.family && p.materialFamily !== f.family) return false;
    if (colorQ && !norm(`${p.colorName} ${p.colorCode} ${p.colorDescription}`).includes(colorQ)) return false;
    if (effQ && !norm(`${p.effect} ${p.finish} ${p.transparency}`).includes(effQ)) return false;
    if (dia !== null && (p.diameterMm === null || Math.abs(p.diameterMm - dia) > 0.011)) return false;
    if (f.status === "none" && spools.length > 0) return false;
    if (f.status === "low" && !spools.some(isLowStock)) return false;
    if (f.status === "instock" && counts.sealed + counts.open === 0) return false;
    if (f.status && ["sealed", "open", "empty", "discarded"].includes(f.status) && counts[f.status as SpoolStatus] === 0) return false;
    if (sellerQ && !sellers.some((s) => norm(s).includes(sellerQ))) return false;
    if (locQ && !spools.some((s) => norm(`${s.location} ${s.storageMethod}`).includes(locQ))) return false;
    if (f.from && (!lastPurchasedAt || !spools.some((s) => s.purchasedAt && s.purchasedAt.slice(0, 10) >= f.from!))) return false;
    if (f.to && !spools.some((s) => s.purchasedAt && s.purchasedAt.slice(0, 10) <= f.to!)) return false;
    if (nozzle !== null) {
      const lo = p.nozzleTempMinC ?? p.nozzleTempMaxC, hi = p.nozzleTempMaxC ?? p.nozzleTempMinC;
      if (lo === null || hi === null || nozzle < lo || nozzle > hi) return false;
    }
    if (bedMax !== null && ((p.bedTempMinC ?? p.bedTempMaxC) === null || (p.bedTempMinC ?? p.bedTempMaxC)! > bedMax)) return false;
    if (dryMax !== null && (p.dryingTempC === null || p.dryingTempC > dryMax)) return false;
    if (f.chamber === "yes" && p.chamberTempMinC === null && p.chamberTempMaxC === null && !p.enclosure) return false;
    if (f.chamber === "no" && (p.chamberTempMinC !== null || p.chamberTempMaxC !== null)) return false;
    if (f.abrasive === "yes" && p.abrasive !== true) return false;
    if (f.abrasive === "no" && p.abrasive !== false) return false;
    if (f.demo === "hide" && p.isDemo) return false;
    return true;
  });

  if (rank) out = out.map((r) => ({ ...r, rank: rank.get(r.profile.id) ?? 0 }));
  const sort = f.sort || (rank ? "relevance" : "updated");
  const cmpStr = (a: string | null, b: string | null) => (a ?? "￿").localeCompare(b ?? "￿", "hu");
  const sorters: Record<string, (a: CatalogRow, b: CatalogRow) => number> = {
    relevance: (a, b) => a.rank - b.rank,
    updated: (a, b) => b.profile.updatedAt.localeCompare(a.profile.updatedAt),
    name: (a, b) => cmpStr(`${a.profile.manufacturer} ${a.profile.productName}`, `${b.profile.manufacturer} ${b.profile.productName}`),
    material: (a, b) => cmpStr(a.profile.materialFamily, b.profile.materialFamily) || cmpStr(a.profile.productName, b.profile.productName),
    color: (a, b) => cmpStr(a.profile.colorName, b.profile.colorName),
    stock_desc: (a, b) => b.stockG - a.stockG,
    stock_asc: (a, b) => a.stockG - b.stockG,
    purchased: (a, b) => (b.lastPurchasedAt ?? "").localeCompare(a.lastPurchasedAt ?? ""),
    nozzle: (a, b) => (a.profile.nozzleTempMinC ?? 9999) - (b.profile.nozzleTempMinC ?? 9999),
  };
  return out.sort(sorters[sort] ?? sorters.updated);
}

export function catalogFacets(rows: CatalogRow[]) {
  const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "hu"));
  return {
    manufacturers: uniq(rows.flatMap((r) => [r.profile.manufacturer, r.profile.brand])),
    families: uniq(rows.map((r) => r.profile.materialFamily)),
    diameters: [...new Set(rows.map((r) => r.profile.diameterMm).filter((x): x is number => x !== null))].sort(),
    sellers: uniq(rows.flatMap((r) => r.sellers)),
    locations: uniq(rows.flatMap((r) => r.spools.map((s) => s.location))),
  };
}

// ---- dashboard --------------------------------------------------------------------------

export function dashboardStats(db: DBX = getDb()) {
  const rows = loadCatalog(db);
  const allSpools = rows.flatMap((r) => r.spools.map((s) => ({ ...s, profile: r.profile })));
  const active = allSpools.filter((s) => s.status === "sealed" || s.status === "open");
  const byFamily = new Map<string, { family: string; spools: number; grams: number }>();
  for (const s of active) {
    const e = byFamily.get(s.profile.materialFamily) ?? { family: s.profile.materialFamily, spools: 0, grams: 0 };
    e.spools++;
    e.grams += s.stockG ?? 0;
    byFamily.set(s.profile.materialFamily, e);
  }
  const S = schema;
  const purchases = db.select().from(S.purchases).orderBy(desc(S.purchases.purchasedAt), desc(S.purchases.id)).limit(6).all();
  const items = db.select().from(S.purchaseItems).all();
  const profileById = new Map(rows.map((r) => [r.profile.id, r.profile]));
  return {
    profileCount: rows.length,
    spoolCount: allSpools.length,
    activeCount: active.length,
    sealedCount: active.filter((s) => s.status === "sealed").length,
    openCount: active.filter((s) => s.status === "open").length,
    emptyCount: allSpools.filter((s) => s.status === "empty").length,
    stockG: active.reduce((a, s) => a + (s.stockG ?? 0), 0),
    measuredG: active.filter((s) => s.stockBasis === "measured").reduce((a, s) => a + (s.stockG ?? 0), 0),
    estimateG: active.filter((s) => s.stockBasis === "estimate").reduce((a, s) => a + (s.stockG ?? 0), 0),
    nominalG: active.filter((s) => s.stockBasis === "nominal").reduce((a, s) => a + (s.stockG ?? 0), 0),
    unknownCount: active.filter((s) => s.stockG === null).length,
    byFamily: [...byFamily.values()].sort((a, b) => b.grams - a.grams),
    openSpools: active.filter((s) => s.status === "open").sort((a, b) => (a.stockG ?? 1e9) - (b.stockG ?? 1e9)),
    lowSpools: active.filter(isLowStock).sort((a, b) => (a.stockG ?? 0) - (b.stockG ?? 0)),
    recentPurchases: purchases.map((p) => {
      const its = items.filter((i) => i.purchaseId === p.id);
      return {
        ...p,
        spoolCount: its.reduce((a, i) => a + i.quantity, 0),
        itemsValue: its.every((i) => i.unitPrice !== null) && its.length ? its.reduce((a, i) => a + (i.unitPrice as number) * i.quantity, 0) : null,
        labels: its.map((i) => {
          const pr = profileById.get(i.profileId);
          return pr ? `${pr.manufacturer} ${pr.productName}${pr.colorName ? ` – ${pr.colorName}` : ""}` : `#${i.profileId}`;
        }),
      };
    }),
    hasDemo: rows.some((r) => r.profile.isDemo),
  };
}
