import { inArray } from "drizzle-orm";
import { CompareView, type CompareRow } from "@/components/compare-view";
import { PageHeader } from "@/components/ui";
import { getDb, schema } from "@/db/client";
import { getT } from "@/i18n/server";
import { FIELDS, familyLabel, fieldLabelKey, groupLabelKey } from "@/lib/fields";
import { makeFormat, safeHex } from "@/lib/format";
import { norm } from "@/lib/normalize";
import { loadCatalog } from "@/server/catalog";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("nav.compare") };
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;
  const { t, locale } = await getT();
  const fm = makeFormat(locale);
  const catalog = loadCatalog();
  const known = new Set(catalog.map((r) => r.profile.id));
  const selected = [...new Set((ids ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && known.has(n)))].slice(0, 6);
  const db = getDb();
  const specs = selected.length ? db.select().from(schema.technicalSpecs).where(inArray(schema.technicalSpecs.profileId, selected)).all() : [];
  const prov = selected.length ? db.select().from(schema.fieldProvenance).where(inArray(schema.fieldProvenance.profileId, selected)).all() : [];
  const sel = catalog.filter((r) => selected.includes(r.profile.id));

  const rows: CompareRow[] = [];
  const order = ["print", "drying", "hardware", "physical", "color", "properties", "description", "links", "identity"];
  for (const gk of order) {
    for (const f of FIELDS.filter((x) => x.group === gk && !["manufacturer", "productName", "colorHex"].includes(x.key))) {
      const values: CompareRow["values"] = {};
      for (const r of sel) {
        const v = (r.profile as Record<string, unknown>)[f.key];
        const o = prov.find((p) => p.profileId === r.profile.id && p.field === f.key)?.origin ?? null;
        values[r.profile.id] = v === null || v === undefined || v === "" ? null : { text: typeof v === "boolean" ? (v ? t("common.yes") : t("common.no")) : typeof v === "number" ? fm.num(v, 3) : String(v), estimate: o === "estimate", origin: o };
      }
      rows.push({ key: f.key, label: t(fieldLabelKey(f.key)), unit: f.unit ?? "", group: t(groupLabelKey(gk)), values });
    }
  }
  for (const key of [...new Set(specs.map((s) => s.key))]) {
    const first = specs.find((s) => s.key === key)!;
    const values: CompareRow["values"] = {};
    for (const r of sel) {
      const s = specs.find((x) => x.key === key && x.profileId === r.profile.id);
      values[r.profile.id] = s ? { text: `${s.valueNum != null ? fm.num(s.valueNum, 3) : s.valueText}${s.unit && s.unit !== first.unit ? ` ${s.unit}` : ""}${s.testMethod ? ` · ${s.testMethod}` : ""}`, estimate: s.origin === "estimate", origin: s.origin } : null;
    }
    rows.push({ key: `spec:${key}`, label: first.label, unit: first.unit ?? "", group: t("specs.title"), values });
  }
  const stock: CompareRow["values"] = {};
  for (const r of sel) stock[r.profile.id] = { text: r.activeCount ? (r.unknownStockCount ? t("compare.stock.lineUnknown", { count: r.activeCount, g: fm.g(r.stockG), unknown: r.unknownStockCount }) : t("compare.stock.line", { count: r.activeCount, g: fm.g(r.stockG) })) : t("compare.stock.none"), estimate: r.hasEstimate, origin: null };
  rows.push({ key: "stock", label: t("compare.row.stock"), unit: "", group: t("compare.group.stock"), values: stock });

  return (
    <>
      <PageHeader eyebrow={t("compare.eyebrow")} title={t("compare.title")} sub={t("compare.sub")} />
      <CompareView
        selected={selected}
        rows={rows}
        all={catalog.map(({ profile: p }) => ({
          id: p.id, label: `${p.manufacturer} ${p.productName}`, sub: [p.colorName, p.materialNameRaw ?? familyLabel(t, p.materialFamily)].filter(Boolean).join(" · "), hex: safeHex(p.colorHex), family: p.materialFamily,
          search: norm([p.manufacturer, p.brand, p.productName, p.colorName, p.sku, p.materialFamily, p.materialNameRaw, p.effect].join(" ")),
        }))}
      />
    </>
  );
}
