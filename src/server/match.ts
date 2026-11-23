import { schema, type DBX } from "@/db/client";
import { storedT } from "./settings";
import { familyFromMaterial, norm } from "@/lib/normalize";

/** A megkeresett termék azonosító adatai (CSV / JSON visszaolvasáskor a meglévő profilok közti egyezéshez). */
export interface Identity {
  brand: string;
  manufacturer: string;
  product_name: string;
  sku?: string | null;
  material?: string | null;
  color?: string | null;
  diameter_mm?: number | null;
  net_weight_g?: number | null;
}
export type Decision =
  | { kind: "new" }
  | { kind: "match"; profileId: number }
  | { kind: "review"; reason: string; candidates: { profile_id: number; label: string }[] };

const label = (p: schema.MaterialProfile) =>
  [p.manufacturer, p.productName, p.colorName, p.sku ? `[${p.sku}]` : null, p.netWeightG ? `${p.netWeightG} g` : null].filter(Boolean).join(" · ");

type Cmp = "eq" | "diff" | "unknown" | "both_null";
const cmp = (a: string | number | null | undefined, b: string | number | null | undefined): Cmp => {
  const na = a == null || a === "" ? null : typeof a === "number" ? a : norm(a);
  const nb = b == null || b === "" ? null : typeof b === "number" ? b : norm(b);
  if (na === null && nb === null) return "both_null";
  if (na === null || nb === null) return "unknown";
  if (typeof na === "number" && typeof nb === "number") return Math.abs(na - nb) < 0.011 ? "eq" : "diff";
  return na === nb ? "eq" : "diff";
};

/**
 * Egyezéskeresés. Azonos terméknév önmagában NEM egyezés: ha szín / anyag / átmérő / tömeg vagy SKU
 * eltér, az külön termék. Ha egy attribútum csak az egyik oldalon ismert, az bizonytalan → felülvizsgálat.
 */
export function matchProfile(item: Identity, db: DBX): Decision {
  const st = storedT(db);
  const brandKeys = new Set([norm(item.brand), norm(item.manufacturer)].filter(Boolean));
  const all = db.select().from(schema.materialProfiles).all();
  const pool = all.filter((p) => brandKeys.has(norm(p.brand)) || brandKeys.has(norm(p.manufacturer)));
  const matches: schema.MaterialProfile[] = [];
  const review: { p: schema.MaterialProfile; why: string }[] = [];

  for (const p of pool) {
    const sku = cmp(item.sku, p.sku);
    if (sku === "diff") continue;
    const nameEq = norm(item.product_name) === norm(p.productName);
    if (sku !== "eq" && !nameEq) continue;
    const material: Cmp =
      item.material == null ? "unknown"
      : p.materialNameRaw ? cmp(item.material, p.materialNameRaw)
      : familyFromMaterial(item.material) === p.materialFamily ? "eq" : "diff";
    const attrs: [string, Cmp][] = [
      ["match.attr.color", cmp(item.color, p.colorName)],
      ["match.attr.material", material],
      ["match.attr.diameter", cmp(item.diameter_mm, p.diameterMm)],
      ["match.attr.weight", cmp(item.net_weight_g, p.netWeightG)],
    ];
    const diffs = attrs.filter(([, c]) => c === "diff").map(([n]) => st(n));
    const unknowns = attrs.filter(([, c]) => c === "unknown").map(([n]) => st(n));
    if (sku === "eq") {
      if (diffs.length) review.push({ p, why: st("match.why.skuDiffers", { attrs: diffs.join(", ") }) });
      else matches.push(p);
      continue;
    }
    if (diffs.length) continue; // azonos név, de más változat → külön termék
    if (unknowns.length) review.push({ p, why: st("match.why.notComparable", { attrs: unknowns.join(", ") }) });
    else matches.push(p);
  }

  if (matches.length === 1) return { kind: "match", profileId: matches[0].id };
  if (matches.length > 1)
    return { kind: "review", reason: st("match.reason.multiple"), candidates: matches.map((p) => ({ profile_id: p.id, label: label(p) })) };
  if (review.length)
    return { kind: "review", reason: st("match.reason.uncertain", { why: review[0].why }), candidates: review.map(({ p }) => ({ profile_id: p.id, label: label(p) })) };
  return { kind: "new" };
}
