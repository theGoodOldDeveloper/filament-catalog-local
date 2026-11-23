import { asc } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db/client";
import { DEFAULT_LOCALE, tFor, type TFn } from "@/i18n/core";
import { FIELDS, FIELD_BY_SNAKE, ORIGINS, SPOOL_STATUSES, camelToSnake, type Origin } from "@/lib/fields";
import { translateError } from "@/i18n/errors";
import { audit } from "./audit";
import { loadCatalog } from "./catalog";
import { matchProfile } from "./match";
import { addNote, addSource, addSpec, createProfile, profileInputSchema, savePrintProfile, type ProfileValues, type ProvenanceMap } from "./profiles";
import { reindexProfile } from "./search";
import { storedT } from "./settings";
import { nextSpoolCode } from "./stock";

export const EXPORT_FORMAT = "filament-catalog-export";
export const EXPORT_VERSION = 1;

const UNITS: Record<string, string> = Object.fromEntries(FIELDS.filter((f) => f.unit).map((f) => [camelToSnake(f.key), f.unit as string]));

/**
 * Teljes JSON export: profilok forrásokkal, mezőszintű eredettel, egységekkel; vásárlások; tekercsek eseményekkel.
 * `t`: a `units` leíró szövegeihez (a JSON-kulcsok és a gépi azonosítók mindig angol/gépiek – a visszaolvasás nyelvfüggetlen).
 */
export function exportJson(t: TFn = tFor(DEFAULT_LOCALE)) {
  const db = getDb();
  const S = schema;
  const profiles = db.select().from(S.materialProfiles).orderBy(asc(S.materialProfiles.id)).all();
  const specs = db.select().from(S.technicalSpecs).all();
  const sources = db.select().from(S.sources).all();
  const prov = db.select().from(S.fieldProvenance).all();
  const notes = db.select().from(S.notes).all();
  const pps = db.select().from(S.printProfiles).all();
  const purchases = db.select().from(S.purchases).orderBy(asc(S.purchases.id)).all();
  const items = db.select().from(S.purchaseItems).all();
  const spools = db.select().from(S.spools).orderBy(asc(S.spools.id)).all();
  const events = db.select().from(S.spoolEvents).orderBy(asc(S.spoolEvents.id)).all();

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    units: { ...UNITS, remaining_g: "g", initial_weight_g: "g", unit_price: t("export.unit.purchaseCurrency"), dry_temp_c: "°C", dry_hours: "h" } as Record<string, string>,
    origins: ORIGINS,
    profiles: profiles.map((p) => ({
      ref: p.id,
      is_demo: p.isDemo,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
      fields: Object.fromEntries(FIELDS.map((f) => [camelToSnake(f.key), (p as Record<string, unknown>)[f.key] ?? null])),
      provenance: Object.fromEntries(prov.filter((r) => r.profileId === p.id).map((r) => [camelToSnake(r.field), { origin: r.origin, source_ref: r.sourceId }])),
      technical_specs: specs.filter((s) => s.profileId === p.id).map((s) => ({ key: s.key, label: s.label, value: s.valueNum ?? s.valueText, unit: s.unit, test_method: s.testMethod, origin: s.origin, source_ref: s.sourceId })),
      sources: sources.filter((s) => s.profileId === p.id).map((s) => ({ ref: s.id, url: s.url, title: s.title, source_type: s.sourceType, retrieved_at: s.retrievedAt, fields: s.fields, excerpt: s.excerpt })),
      notes: notes.filter((n) => n.profileId === p.id).map((n) => ({ body: n.body, noted_at: n.notedAt })),
      print_profiles: pps.filter((x) => x.profileId === p.id).map((x) => ({ name: x.name, slicer: x.slicer, printer: x.printer, nozzle_diameter_mm: x.nozzleDiameterMm, nozzle_material: x.nozzleMaterial, version: x.version, settings: x.settings, origin: x.origin, notes: x.notes })),
    })),
    purchases: purchases.map((pu) => ({
      ref: pu.id, is_demo: pu.isDemo, purchased_at: pu.purchasedAt, seller: pu.seller, order_reference: pu.orderReference, currency: pu.currency,
      shipping_total: pu.shippingTotal, discount_total: pu.discountTotal, order_total: pu.orderTotal, source_kind: pu.sourceKind, source_reference: pu.sourceReference, notes: pu.notes,
      items: items.filter((i) => i.purchaseId === pu.id).map((i) => ({ ref: i.id, profile_ref: i.profileId, variant: i.variant, quantity: i.quantity, unit_price: i.unitPrice, shipping_share: i.shippingShare, discount_share: i.discountShare })),
    })),
    spools: spools.map((s) => ({
      code: s.code, profile_ref: s.profileId, purchase_item_ref: s.purchaseItemId, is_demo: s.isDemo, status: s.status,
      initial_weight_g: s.initialWeightG, remaining_g: s.remainingG, remaining_origin: s.remainingOrigin,
      received_at: s.receivedAt, opened_at: s.openedAt, last_measured_at: s.lastMeasuredAt, location: s.location, storage_method: s.storageMethod, moisture_state: s.moistureState, notes: s.notes,
      events: events.filter((e) => e.spoolId === s.id).map((e) => ({ type: e.type, at: e.at, delta_g: e.deltaG, remaining_g: e.remainingG, is_estimate: e.isEstimate, dry_temp_c: e.dryTempC, dry_hours: e.dryHours, note: e.note })),
    })),
  };
}

// ---- CSV --------------------------------------------------------------------------------

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "boolean" ? (v ? "true" : "false") : String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`; // táblázatkezelő-képlet injekció ellen
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const toCsv = (rows: unknown[][]) => "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
const head = (f: (typeof FIELDS)[number]) => (f.unit ? `${camelToSnake(f.key)} [${f.unit}]` : camelToSnake(f.key));

export function exportProfilesCsv(): string {
  const db = getDb();
  const sources = db.select().from(schema.sources).all();
  const prov = db.select().from(schema.fieldProvenance).all();
  const specs = db.select().from(schema.technicalSpecs).all();
  const rows = loadCatalog(db).sort((a, b) => a.profile.id - b.profile.id);
  const header = ["id", ...FIELDS.map(head), "technical_specs", "field_origins", "sources", "active_spools", "stock_g [g]", "stock_has_estimate", "is_demo"];
  return toCsv([
    header,
    ...rows.map((r) => [
      r.profile.id,
      ...FIELDS.map((f) => (r.profile as Record<string, unknown>)[f.key]),
      specs.filter((s) => s.profileId === r.profile.id).map((s) => `${s.key}=${s.valueNum ?? s.valueText}${s.unit ? " " + s.unit : ""}${s.testMethod ? ` (${s.testMethod})` : ""}`).join(" | "),
      prov.filter((p) => p.profileId === r.profile.id).map((p) => `${camelToSnake(p.field)}=${p.origin}`).join(" | "),
      sources.filter((s) => s.profileId === r.profile.id).map((s) => `${s.sourceType}: ${s.title ?? ""} ${s.url ?? ""}`.trim()).join(" | "),
      r.activeCount, r.stockG, r.hasEstimate, r.profile.isDemo,
    ]),
  ]);
}

export function exportSpoolsCsv(): string {
  const rows = loadCatalog();
  const header = ["code", "profile_id", "manufacturer", "product_name", "material_family", "color_name", "status", "initial_weight_g [g]", "remaining_g [g]", "remaining_origin", "stock_basis", "purchased_at", "seller", "unit_price", "effective_price", "effective_price_is_computed", "currency", "received_at", "opened_at", "last_measured_at", "location", "storage_method", "moisture_state", "notes"];
  return toCsv([
    header,
    ...rows.flatMap((r) => r.spools.map((s) => [
      s.code, r.profile.id, r.profile.manufacturer, r.profile.productName, r.profile.materialFamily, r.profile.colorName, s.status, s.initialWeightG, s.remainingG, s.remainingOrigin, s.stockBasis,
      s.purchasedAt, s.seller, s.cost?.unitPrice, s.cost?.effective, s.cost?.computed, s.cost?.currency, s.receivedAt, s.openedAt, s.lastMeasuredAt, s.location, s.storageMethod, s.moistureState, s.notes,
    ])),
  ]);
}

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

export interface BulkImportReport { created: number; skipped: number; errors: string[] }

/** CSV → anyagprofilok. Fejléc: a mezők snake_case kulcsai (az exporttal megegyezően, az egység-jelölés elhagyható). */
export function importProfilesCsv(text: string, t: TFn = tFor(DEFAULT_LOCALE)): BulkImportReport {
  const rows = parseCsv(text);
  const report: BulkImportReport = { created: 0, skipped: 0, errors: [] };
  if (rows.length < 2) return { ...report, errors: [t("import.error.noRows")] };
  const cols = rows[0].map((h) => FIELD_BY_SNAKE[h.replace(/\s*\[.*\]\s*$/, "").trim()] ?? null);
  if (!cols.some((c) => c?.key === "productName")) return { ...report, errors: [t("import.error.missingColumn", { column: "product_name" })] };
  const db = getDb();
  rows.slice(1, 2001).forEach((r, idx) => {
    const values: ProfileValues = {};
    cols.forEach((f, i) => {
      if (!f) return;
      const raw = (r[i] ?? "").trim().replace(/^'(?=[=+\-@])/, "");
      values[f.key] = raw === "" ? null : raw;
    });
    const parsed = profileInputSchema.safeParse(values);
    if (!parsed.success) {
      report.errors.push(t("import.error.row", { row: idx + 2, message: translateError(parsed.error, t).slice(0, 3).join("; ") }));
      return;
    }
    const v = parsed.data as ProfileValues;
    const d = matchProfile({ brand: String(v.brand ?? v.manufacturer), manufacturer: String(v.manufacturer), product_name: String(v.productName), sku: v.sku as string | null, material: v.materialNameRaw as string | null, color: v.colorName as string | null, diameter_mm: v.diameterMm as number | null, net_weight_g: v.netWeightG as number | null }, db);
    if (d.kind !== "new") {
      report.skipped++;
      return;
    }
    createProfile(v, {}, { via: storedT(db)("audit.via.csv") }, db);
    report.created++;
  });
  if (report.created) audit("system", null, "csv-import", storedT(db)("audit.import.csv", { created: report.created, skipped: report.skipped }));
  return report;
}

const exportFileSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.literal(EXPORT_VERSION),
  profiles: z.array(z.object({
    ref: z.number(), is_demo: z.boolean().optional(),
    fields: z.record(z.string(), z.unknown()),
    provenance: z.record(z.string(), z.object({ origin: z.string(), source_ref: z.number().nullish() })).default({}),
    technical_specs: z.array(z.object({ key: z.string(), label: z.string(), value: z.union([z.string(), z.number()]).nullable(), unit: z.string().nullish(), test_method: z.string().nullish(), origin: z.string().nullish(), source_ref: z.number().nullish() })).default([]),
    sources: z.array(z.object({ ref: z.number(), url: z.string().nullish(), title: z.string().nullish(), source_type: z.string(), retrieved_at: z.string().nullish(), fields: z.array(z.string()).default([]), excerpt: z.string().nullish() })).default([]),
    notes: z.array(z.object({ body: z.string(), noted_at: z.string() })).default([]),
    print_profiles: z.array(z.object({ name: z.string(), slicer: z.string().nullish(), printer: z.string().nullish(), nozzle_diameter_mm: z.number().nullish(), nozzle_material: z.string().nullish(), version: z.string().nullish(), settings: z.record(z.string(), z.union([z.string(), z.number()])).default({}), origin: z.string().default("own"), notes: z.string().nullish() })).default([]),
  })).max(5000),
  purchases: z.array(z.object({
    ref: z.number(), is_demo: z.boolean().optional(), purchased_at: z.string().nullish(), seller: z.string().nullish(), order_reference: z.string().nullish(), currency: z.string().default("HUF"),
    shipping_total: z.number().nullish(), discount_total: z.number().nullish(), order_total: z.number().nullish(), source_kind: z.string().default("manual"), source_reference: z.string().nullish(), notes: z.string().nullish(),
    items: z.array(z.object({ ref: z.number(), profile_ref: z.number(), variant: z.string().nullish(), quantity: z.number().int().min(1), unit_price: z.number().nullish(), shipping_share: z.number().nullish(), discount_share: z.number().nullish() })),
  })).default([]),
  spools: z.array(z.object({
    code: z.string(), profile_ref: z.number(), purchase_item_ref: z.number().nullish(), is_demo: z.boolean().optional(), status: z.enum(SPOOL_STATUSES),
    initial_weight_g: z.number().nullish(), remaining_g: z.number().nullish(), remaining_origin: z.string().nullish(),
    received_at: z.string().nullish(), opened_at: z.string().nullish(), last_measured_at: z.string().nullish(), location: z.string().nullish(), storage_method: z.string().nullish(), moisture_state: z.string().nullish(), notes: z.string().nullish(),
    events: z.array(z.object({ type: z.string(), at: z.string(), delta_g: z.number().nullish(), remaining_g: z.number().nullish(), is_estimate: z.boolean().default(false), dry_temp_c: z.number().nullish(), dry_hours: z.number().nullish(), note: z.string().nullish() })).default([]),
  })).default([]),
});

/**
 * Saját JSON export visszaolvasása (költöztetés / visszaállítás). Hozzáfűző jellegű:
 * a pontosan egyező meglévő profilokat nem duplikálja, és csak az ÚJ profilokhoz tartozó
 * vásárlásokat/tekercseket hozza létre.
 */
export function importJsonExport(raw: unknown, t: TFn = tFor(DEFAULT_LOCALE)): BulkImportReport & { spools: number; purchases: number } {
  const parsed = exportFileSchema.safeParse(raw);
  if (!parsed.success)
    return { created: 0, skipped: 0, spools: 0, purchases: 0, errors: parsed.error.issues.slice(0, 10).map((i) => `${i.path.join(".")}: ${i.message}`) };
  const data = parsed.data;
  const report = { created: 0, skipped: 0, spools: 0, purchases: 0, errors: [] as string[] };
  const db = getDb();
  const isOrigin = (o: unknown): o is Origin => (ORIGINS as readonly string[]).includes(o as string);

  db.transaction((tx) => {
    const stored = storedT(tx);
    const profileMap = new Map<number, number>();
    for (const p of data.profiles) {
      const values: ProfileValues = {};
      for (const [k, v] of Object.entries(p.fields)) {
        const f = FIELD_BY_SNAKE[k];
        if (f) values[f.key] = v as string | number | boolean | null;
      }
      const check = profileInputSchema.safeParse(values);
      if (!check.success) {
        report.errors.push(t("import.error.profile", { ref: p.ref, message: translateError(check.error, t)[0] ?? "" }));
        continue;
      }
      const v = check.data as ProfileValues;
      const d = matchProfile({ brand: String(v.brand ?? v.manufacturer), manufacturer: String(v.manufacturer), product_name: String(v.productName), sku: v.sku as string | null, material: v.materialNameRaw as string | null, color: v.colorName as string | null, diameter_mm: v.diameterMm as number | null, net_weight_g: v.netWeightG as number | null }, tx);
      if (d.kind === "match") {
        report.skipped++;
        continue;
      }
      const prov: ProvenanceMap = {};
      for (const [k, pv] of Object.entries(p.provenance)) {
        const f = FIELD_BY_SNAKE[k];
        if (f && isOrigin(pv.origin)) prov[f.key] = { origin: pv.origin };
      }
      const id = createProfile(v, prov, { isDemo: p.is_demo, via: stored("audit.via.json") }, tx);
      profileMap.set(p.ref, id);
      const srcMap = new Map<number, number>();
      for (const s of p.sources) {
        const st = ["manufacturer", "seller", "secondary", "email", "own"].includes(s.source_type) ? (s.source_type as "manufacturer") : "secondary";
        try {
          srcMap.set(s.ref, addSource(id, { url: s.url ?? null, title: s.title || stored("import.untitled"), sourceType: st, retrievedAt: s.retrieved_at ?? null, fields: s.fields, excerpt: s.excerpt?.slice(0, 600) ?? null }, null, tx));
        } catch {
          report.errors.push(t("import.error.badSource", { ref: p.ref }));
        }
      }
      for (const s of p.technical_specs)
        if (s.value !== null) addSpec(tx, id, { key: s.key, label: s.label, value: s.value, unit: s.unit, testMethod: s.test_method, origin: isOrigin(s.origin) ? s.origin : null }, s.source_ref ? srcMap.get(s.source_ref) ?? null : null);
      for (const n of p.notes) addNote(id, { body: n.body, notedAt: n.noted_at }, tx);
      for (const x of p.print_profiles)
        savePrintProfile(id, { name: x.name, slicer: x.slicer, printer: x.printer, nozzleDiameterMm: x.nozzle_diameter_mm ?? null, nozzleMaterial: x.nozzle_material, version: x.version, settings: x.settings, origin: isOrigin(x.origin) ? x.origin : "own", notes: x.notes }, undefined, tx);
      reindexProfile(id, tx);
      report.created++;
    }

    const itemMap = new Map<number, number>();
    for (const pu of data.purchases) {
      const its = pu.items.filter((i) => profileMap.has(i.profile_ref));
      if (!its.length) continue;
      const row = tx.insert(schema.purchases).values({
        purchasedAt: pu.purchased_at ?? null, seller: pu.seller ?? null, orderReference: pu.order_reference ?? null, currency: pu.currency,
        shippingTotal: pu.shipping_total ?? null, discountTotal: pu.discount_total ?? null, orderTotal: pu.order_total ?? null,
        sourceKind: pu.source_kind, sourceReference: pu.source_reference ?? null, notes: pu.notes ?? null, isDemo: pu.is_demo ?? false,
      }).returning({ id: schema.purchases.id }).get();
      report.purchases++;
      for (const i of its) {
        const ir = tx.insert(schema.purchaseItems).values({ purchaseId: row.id, profileId: profileMap.get(i.profile_ref) as number, variant: i.variant ?? null, quantity: i.quantity, unitPrice: i.unit_price ?? null, shippingShare: i.shipping_share ?? null, discountShare: i.discount_share ?? null }).returning({ id: schema.purchaseItems.id }).get();
        itemMap.set(i.ref, ir.id);
      }
    }
    const taken = new Set(tx.select({ code: schema.spools.code }).from(schema.spools).all().map((s) => s.code));
    for (const s of data.spools) {
      const profileId = profileMap.get(s.profile_ref);
      if (!profileId) continue;
      const code = taken.has(s.code) ? nextSpoolCode(tx) : s.code;
      taken.add(code);
      const sr = tx.insert(schema.spools).values({
        code, profileId, purchaseItemId: s.purchase_item_ref ? itemMap.get(s.purchase_item_ref) ?? null : null, status: s.status,
        initialWeightG: s.initial_weight_g ?? null, remainingG: s.remaining_g ?? null, remainingOrigin: s.remaining_g == null ? null : s.remaining_origin === "measured" ? "measured" : "estimate",
        receivedAt: s.received_at ?? null, openedAt: s.opened_at ?? null, lastMeasuredAt: s.last_measured_at ?? null, location: s.location ?? null, storageMethod: s.storage_method ?? null, moistureState: s.moisture_state ?? null, notes: s.notes ?? null, isDemo: s.is_demo ?? false,
      }).returning({ id: schema.spools.id }).get();
      for (const e of s.events)
        tx.insert(schema.spoolEvents).values({ spoolId: sr.id, type: e.type, at: e.at, deltaG: e.delta_g ?? null, remainingG: e.remaining_g ?? null, isEstimate: e.is_estimate, dryTempC: e.dry_temp_c ?? null, dryHours: e.dry_hours ?? null, note: e.note ?? null }).run();
      report.spools++;
    }
    for (const id of profileMap.values()) reindexProfile(id, tx);
    audit("system", null, "json-import", stored("audit.import.json", { created: report.created, purchases: report.purchases, spools: report.spools }), tx);
  });
  return report;
}
