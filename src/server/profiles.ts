import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema, type DBX } from "@/db/client";
import { tk } from "@/i18n/core";
import { AppError, appMsg } from "@/i18n/errors";
import { FIELDS, FIELD_BY_KEY, ORIGINS, fieldLabelKey, type FieldDef, type Origin, type ProfileFieldKey } from "@/lib/fields";
import { isHttpUrl } from "@/lib/normalize";
import { audit } from "./audit";
import { reindexProfile, removeFromIndex } from "./search";
import { storedT } from "./settings";

const emptyToNull = (v: unknown) => (v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? null : v);

export function fieldSchema(f: FieldDef): z.ZodType {
  // a mezőnév kulcs-paraméterként megy, így a hibaüzenet a határon a felhasználó nyelvén jelenik meg
  const field = tk(fieldLabelKey(f.key));
  let s: z.ZodType;
  switch (f.type) {
    case "number": {
      let n = z.number({ error: appMsg("validation.number", { field }) }).finite();
      if (f.min !== undefined) n = n.min(f.min, appMsg("validation.min", { field, min: f.min }));
      if (f.max !== undefined) n = n.max(f.max, appMsg("validation.max", { field, max: f.max }));
      s = z.preprocess((v) => (typeof v === "string" ? Number(v.trim().replace(",", ".")) : v), n);
      break;
    }
    case "tristate":
      s = z.preprocess((v) => (v === "yes" || v === "true" ? true : v === "no" || v === "false" ? false : v), z.boolean());
      break;
    case "url":
      s = z.string().trim().max(2000).refine(isHttpUrl, appMsg("validation.url", { field }));
      break;
    case "color":
      s = z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, appMsg("validation.hex", { field }));
      break;
    case "select":
      s = z.enum(f.options as [string, ...string[]], { error: appMsg("validation.invalidValue", { field }) });
      break;
    case "textarea":
      s = z.string().trim().max(20000);
      break;
    default:
      s = z.string().trim().max(500);
  }
  return f.required
    ? z.preprocess(emptyToNull, s.refine((v) => v !== null, appMsg("validation.required", { field })) as z.ZodType)
    : z.preprocess(emptyToNull, s.nullable());
}

export const profileInputSchema = z.object(
  Object.fromEntries(FIELDS.map((f) => [f.key, fieldSchema(f)])) as Record<ProfileFieldKey, z.ZodType>,
);

export type ProfileValues = Partial<Record<ProfileFieldKey, string | number | boolean | null>>;
export type ProvenanceMap = Partial<Record<string, { origin: Origin; sourceId?: number | null }>>;

export const specInputSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  value: z.union([z.string().trim().max(500), z.number().finite()]),
  unit: z.string().trim().max(40).nullish(),
  testMethod: z.string().trim().max(120).nullish(),
  origin: z.enum(ORIGINS).nullish(),
});
export type SpecInput = z.infer<typeof specInputSchema>;

function setProvenance(db: DBX, profileId: number, values: ProfileValues, prov: ProvenanceMap) {
  for (const [field, p] of Object.entries(prov)) {
    if (!p || !FIELD_BY_KEY[field]) continue;
    const v = values[field as ProfileFieldKey];
    const where = and(eq(schema.fieldProvenance.profileId, profileId), eq(schema.fieldProvenance.field, field));
    db.delete(schema.fieldProvenance).where(where).run();
    if (v === null || v === undefined) continue; // üres értéknek nincs eredete
    db.insert(schema.fieldProvenance).values({ profileId, field, origin: p.origin, sourceId: p.sourceId ?? null }).run();
  }
}

export function clearProvenance(profileId: number, fields: string[], db: DBX = getDb()) {
  if (!fields.length) return;
  db.delete(schema.fieldProvenance).where(and(eq(schema.fieldProvenance.profileId, profileId), inArray(schema.fieldProvenance.field, fields))).run();
}

export function replaceSpecs(db: DBX, profileId: number, specs: SpecInput[]) {
  db.delete(schema.technicalSpecs).where(eq(schema.technicalSpecs.profileId, profileId)).run();
  for (const s of specs) addSpec(db, profileId, s);
}

export function addSpec(db: DBX, profileId: number, s: SpecInput, sourceId: number | null = null) {
  const num = typeof s.value === "number" ? s.value : Number(String(s.value).replace(",", "."));
  const isNum = typeof s.value === "number" || (String(s.value).trim() !== "" && Number.isFinite(num));
  db.insert(schema.technicalSpecs)
    .values({
      profileId, key: s.key, label: s.label,
      valueNum: isNum ? num : null, valueText: isNum ? null : String(s.value),
      unit: s.unit || null, testMethod: s.testMethod || null, origin: s.origin ?? null, sourceId,
    })
    .run();
}

export function createProfile(
  values: ProfileValues,
  prov: ProvenanceMap = {},
  opts: { isDemo?: boolean; specs?: SpecInput[]; via?: string } = {},
  db: DBX = getDb(),
): number {
  const parsed = profileInputSchema.parse(values) as ProfileValues;
  const row = db
    .insert(schema.materialProfiles)
    .values({ ...(parsed as object), isDemo: opts.isDemo ?? false } as schema.NewMaterialProfile)
    .returning({ id: schema.materialProfiles.id })
    .get();
  setProvenance(db, row.id, parsed, prov);
  if (opts.specs) replaceSpecs(db, row.id, opts.specs);
  const name = `${parsed.manufacturer} ${parsed.productName}`;
  audit("profile", row.id, "create", storedT(db)(opts.via ? "audit.profile.createVia" : "audit.profile.create", { name, via: opts.via ?? "" }), db);
  reindexProfile(row.id, db);
  return row.id;
}

export function updateProfile(
  id: number,
  values: ProfileValues,
  prov: ProvenanceMap = {},
  opts: { specs?: SpecInput[]; via?: string } = {},
  db: DBX = getDb(),
): void {
  const before = db.select().from(schema.materialProfiles).where(eq(schema.materialProfiles.id, id)).get();
  if (!before) throw new AppError("profile.error.notFound");
  const parsed = profileInputSchema.parse(values) as ProfileValues;
  const changed = FIELDS.filter((f) => (before as Record<string, unknown>)[f.key] !== parsed[f.key]).map((f) => storedT(db)(fieldLabelKey(f.key)));
  db.update(schema.materialProfiles)
    .set({ ...(parsed as object), updatedAt: new Date().toISOString() })
    .where(eq(schema.materialProfiles.id, id))
    .run();
  setProvenance(db, id, parsed, prov);
  if (opts.specs) replaceSpecs(db, id, opts.specs);
  if (changed.length)
    audit("profile", id, "update", storedT(db)(opts.via ? "audit.profile.updateVia" : "audit.profile.update", { fields: `${changed.slice(0, 12).join(", ")}${changed.length > 12 ? "…" : ""}`, via: opts.via ?? "" }), db);
  reindexProfile(id, db);
}

/** Részleges kitöltés (import): csak az eddig üres mezőket tölti ki, meglévőt nem ír felül. */
export function fillProfileFields(
  id: number,
  values: ProfileValues,
  prov: ProvenanceMap,
  db: DBX = getDb(),
): { filled: string[]; skipped: string[] } {
  const before = db.select().from(schema.materialProfiles).where(eq(schema.materialProfiles.id, id)).get() as Record<string, unknown> | undefined;
  if (!before) throw new AppError("profile.error.notFound");
  const set: ProfileValues = {};
  const filled: string[] = [];
  const skipped: string[] = [];
  for (const [k, v] of Object.entries(values)) {
    if (v === null || v === undefined) continue;
    const cur = before[k];
    if (cur === null || cur === undefined || cur === "") {
      set[k as ProfileFieldKey] = v;
      filled.push(k);
    } else if (cur !== v) skipped.push(k);
  }
  if (filled.length) {
    db.update(schema.materialProfiles).set({ ...(set as object), updatedAt: new Date().toISOString() }).where(eq(schema.materialProfiles.id, id)).run();
    setProvenance(db, id, set, Object.fromEntries(filled.filter((k) => prov[k]).map((k) => [k, prov[k]])));
    audit("profile", id, "import-fill", storedT(db)("audit.profile.importFill", { fields: filled.map((k) => storedT(db)(fieldLabelKey(k))).slice(0, 12).join(", ") }), db);
  }
  return { filled, skipped };
}

export function deleteProfile(id: number, db: DBX = getDb()): { ok: boolean; error?: AppError } {
  const spoolCount = db.select({ id: schema.spools.id }).from(schema.spools).where(eq(schema.spools.profileId, id)).all().length;
  const itemCount = db.select({ id: schema.purchaseItems.id }).from(schema.purchaseItems).where(eq(schema.purchaseItems.profileId, id)).all().length;
  if (spoolCount || itemCount)
    return { ok: false, error: new AppError("profile.error.hasStock", { spools: spoolCount, items: itemCount }) };
  const p = db.select().from(schema.materialProfiles).where(eq(schema.materialProfiles.id, id)).get();
  if (!p) return { ok: false, error: new AppError("profile.error.notFound") };
  db.delete(schema.materialProfiles).where(eq(schema.materialProfiles.id, id)).run();
  removeFromIndex(id);
  audit("profile", id, "delete", storedT(db)("audit.profile.delete", { name: `${p.manufacturer} ${p.productName}` }), db);
  return { ok: true };
}

export function getProfile(id: number, db: DBX = getDb()) {
  return db.select().from(schema.materialProfiles).where(eq(schema.materialProfiles.id, id)).get();
}

export function getProfileFull(id: number, db: DBX = getDb()) {
  const profile = getProfile(id, db);
  if (!profile) return null;
  const S = schema;
  const specs = db.select().from(S.technicalSpecs).where(eq(S.technicalSpecs.profileId, id)).orderBy(asc(S.technicalSpecs.id)).all();
  const sources = db.select().from(S.sources).where(eq(S.sources.profileId, id)).orderBy(desc(S.sources.id)).all();
  const provRows = db.select().from(S.fieldProvenance).where(eq(S.fieldProvenance.profileId, id)).all();
  const provenance: Record<string, { origin: Origin; sourceId: number | null }> = {};
  for (const r of provRows) provenance[r.field] = { origin: r.origin as Origin, sourceId: r.sourceId };
  const notes = db.select().from(S.notes).where(eq(S.notes.profileId, id)).orderBy(desc(S.notes.notedAt), desc(S.notes.id)).all();
  const printProfiles = db.select().from(S.printProfiles).where(eq(S.printProfiles.profileId, id)).orderBy(desc(S.printProfiles.updatedAt)).all();
  const documents = db.select().from(S.documents).where(eq(S.documents.profileId, id)).orderBy(desc(S.documents.id)).all();
  const spools = db.select().from(S.spools).where(eq(S.spools.profileId, id)).orderBy(asc(S.spools.code)).all();
  const events = spools.length
    ? db.select().from(S.spoolEvents).where(inArray(S.spoolEvents.spoolId, spools.map((s) => s.id))).orderBy(desc(S.spoolEvents.at), desc(S.spoolEvents.id)).all()
    : [];
  const items = db.select().from(S.purchaseItems).where(eq(S.purchaseItems.profileId, id)).all();
  const purchaseIds = [...new Set(items.map((i) => i.purchaseId))];
  const purchases = purchaseIds.length
    ? db.select().from(S.purchases).where(inArray(S.purchases.id, purchaseIds)).orderBy(desc(S.purchases.purchasedAt)).all()
    : [];
  const allItems = purchaseIds.length ? db.select().from(S.purchaseItems).where(inArray(S.purchaseItems.purchaseId, purchaseIds)).all() : [];
  const auditTrail = db
    .select().from(S.auditEvents)
    .where(and(eq(S.auditEvents.entity, "profile"), eq(S.auditEvents.entityId, id)))
    .orderBy(desc(S.auditEvents.id)).limit(30).all();
  return { profile, specs, sources, provenance, notes, printProfiles, documents, spools, events, items, purchases, allItems, auditTrail };
}
export type ProfileFull = NonNullable<ReturnType<typeof getProfileFull>>;

// ---- jegyzetek, források, nyomtatási profilok -------------------------------------------

export const noteSchema = z.object({ body: z.string().trim().min(1).max(10000), notedAt: z.string().trim().min(8).max(40) });

export function addNote(profileId: number, input: z.input<typeof noteSchema>, db: DBX = getDb()) {
  const v = noteSchema.parse(input);
  db.insert(schema.notes).values({ profileId, ...v }).run();
  reindexProfile(profileId, db);
}

export function deleteNote(profileId: number, noteId: number, db: DBX = getDb()) {
  db.delete(schema.notes).where(and(eq(schema.notes.id, noteId), eq(schema.notes.profileId, profileId))).run();
  reindexProfile(profileId, db);
}

export const sourceSchema = z.object({
  url: z.preprocess(emptyToNull, z.string().trim().max(2000).refine(isHttpUrl, appMsg("validation.url", { field: "URL" })).nullable()),
  title: z.string().trim().min(1).max(300),
  sourceType: z.enum(["manufacturer", "seller", "secondary", "email", "own"]),
  retrievedAt: z.preprocess(emptyToNull, z.string().trim().max(40).nullable()),
  fields: z.array(z.string().trim().max(80)).max(100).default([]),
  excerpt: z.preprocess(emptyToNull, z.string().trim().max(600).nullable()),
});

export function addSource(profileId: number, input: z.input<typeof sourceSchema>, importId: number | null = null, db: DBX = getDb()): number {
  const v = sourceSchema.parse(input);
  const row = db.insert(schema.sources).values({ profileId, ...v, importId }).returning({ id: schema.sources.id }).get();
  reindexProfile(profileId, db);
  return row.id;
}

export function deleteSource(profileId: number, sourceId: number, db: DBX = getDb()) {
  db.delete(schema.sources).where(and(eq(schema.sources.id, sourceId), eq(schema.sources.profileId, profileId))).run();
  reindexProfile(profileId, db);
}

export const printProfileSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slicer: z.preprocess(emptyToNull, z.string().trim().max(120).nullable()),
  printer: z.preprocess(emptyToNull, z.string().trim().max(160).nullable()),
  nozzleDiameterMm: z.preprocess(
    (v) => (emptyToNull(v) === null ? null : Number(String(v).replace(",", "."))),
    z.number().min(0.1).max(2).nullable(),
  ),
  nozzleMaterial: z.preprocess(emptyToNull, z.string().trim().max(120).nullable()),
  version: z.preprocess(emptyToNull, z.string().trim().max(60).nullable()),
  settings: z.record(z.string().trim().min(1).max(80), z.union([z.string().max(300), z.number().finite()])).default({}),
  origin: z.enum(ORIGINS).default("own"),
  notes: z.preprocess(emptyToNull, z.string().trim().max(5000).nullable()),
});

export function savePrintProfile(profileId: number, input: z.input<typeof printProfileSchema>, printProfileId?: number, db: DBX = getDb()): number {
  const v = printProfileSchema.parse(input);
  let id = printProfileId;
  if (id) {
    db.update(schema.printProfiles).set({ ...v, updatedAt: new Date().toISOString() })
      .where(and(eq(schema.printProfiles.id, id), eq(schema.printProfiles.profileId, profileId))).run();
  } else {
    id = db.insert(schema.printProfiles).values({ profileId, ...v }).returning({ id: schema.printProfiles.id }).get().id;
  }
  audit("profile", profileId, "print-profile", storedT(db)("audit.profile.printProfile", { name: v.name }), db);
  reindexProfile(profileId, db);
  return id;
}

export function deletePrintProfile(profileId: number, printProfileId: number, db: DBX = getDb()) {
  db.delete(schema.printProfiles).where(and(eq(schema.printProfiles.id, printProfileId), eq(schema.printProfiles.profileId, profileId))).run();
  reindexProfile(profileId, db);
}

/** "kulcs: érték" sorokból beállítás-objektum (kézi űrlaphoz). */
export function parseSettingsText(text: string): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([^:=]{1,80}?)\s*[:=]\s*(.{1,300})$/);
    if (!m) continue;
    const raw = m[2].trim();
    const n = Number(raw.replace(",", "."));
    out[m[1].trim()] = raw !== "" && Number.isFinite(n) && /^-?[\d.,]+$/.test(raw) ? n : raw;
  }
  return out;
}
