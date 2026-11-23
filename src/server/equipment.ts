import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema, type DBX } from "@/db/client";
import { tk } from "@/i18n/core";
import { appMsg } from "@/i18n/errors";
import { DRYER_FIELDS, PRINTER_FIELDS, equipmentLabelKey, type DryerProfile, type EquipFieldDef, type Equipment, type EquipmentKind, type PrinterProfile } from "@/lib/equipment";

// Felszerelés-profil: egyetlen AKTÍV nyomtató és szárító (a táblák több sorra is bővíthetők).
// Minden mező elhagyható (NULL = ismeretlen); a teljesen üres mentés törli a profilt.

const emptyToNull = (v: unknown) => (v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? null : v);

function fieldSchema(kind: EquipmentKind, f: EquipFieldDef): z.ZodType {
  const field = tk(equipmentLabelKey(kind, f.key));
  if (f.type === "text") return z.preprocess(emptyToNull, z.string().trim().max(120).nullable());
  if (f.type === "tristate")
    return z.preprocess((v) => (v === "yes" || v === "true" ? true : v === "no" || v === "false" ? false : emptyToNull(v)), z.boolean({ error: appMsg("validation.invalidValue", { field }) }).nullable());
  let n = z.number({ error: appMsg("validation.number", { field }) }).finite();
  if (f.type === "int") n = n.int(appMsg("validation.integer", { field }));
  if (f.min !== undefined) n = n.min(f.min, appMsg("validation.min", { field, min: f.min }));
  if (f.max !== undefined) n = n.max(f.max, appMsg("validation.max", { field, max: f.max }));
  return z.preprocess((v) => (emptyToNull(v) === null ? null : typeof v === "string" ? Number(v.trim().replace(",", ".")) : v), n.nullable());
}
const shape = (kind: EquipmentKind, fields: readonly EquipFieldDef[]) => Object.fromEntries(fields.map((f) => [f.key, fieldSchema(kind, f).optional()]));
const complete = <T>(raw: Record<string, unknown>, fields: readonly EquipFieldDef[]) => Object.fromEntries(fields.map((f) => [f.key, raw[f.key] ?? null])) as T;

export const printerInput = z.object(shape("printer", PRINTER_FIELDS)).transform((raw): PrinterProfile => {
  const v = complete<PrinterProfile>(raw, PRINTER_FIELDS);
  // következetesség: fűtött kamra nélkül nincs max. kamrahőfok; megadott kamrahőfok fűtött kamrát jelent; a fűtött kamra zárt
  if (v.heatedChamber === false) v.maxChamberC = null;
  else if (v.maxChamberC !== null) v.heatedChamber = true;
  if (v.heatedChamber === true) v.enclosed = true;
  return v;
});

export const dryerInput = z
  .object(shape("dryer", DRYER_FIELDS))
  .transform((raw) => complete<DryerProfile>(raw, DRYER_FIELDS))
  .refine((v) => v.minC === null || v.maxC === null || v.minC <= v.maxC, { message: appMsg("equipment.error.dryerRange"), path: ["maxC"] });

export type PrinterInput = Partial<Record<keyof PrinterProfile, unknown>>;
export type DryerInput = Partial<Record<keyof DryerProfile, unknown>>;

const isBlank = (v: object) => Object.values(v).every((x) => x === null);

/** Az aktív nyomtató és szárító; null, ha nincs megadva. */
export function getEquipment(db: DBX = getDb()): Equipment {
  const p = db.select().from(schema.printerProfiles).where(eq(schema.printerProfiles.active, true)).get();
  const d = db.select().from(schema.dryerProfiles).where(eq(schema.dryerProfiles.active, true)).get();
  return { printer: p ? complete<PrinterProfile>(p, PRINTER_FIELDS) : null, dryer: d ? complete<DryerProfile>(d, DRYER_FIELDS) : null };
}

/** Nyomtató mentése (felülírja az aktívat). ZodError-t dob érvénytelen adatra; a teljesen üres adat törli a profilt. */
export function savePrinter(input: PrinterInput, db: DBX = getDb()): PrinterProfile | null {
  const v = printerInput.parse(input);
  const T = schema.printerProfiles;
  if (isBlank(v)) {
    clearPrinter(db);
    return null;
  }
  const cur = db.select({ id: T.id }).from(T).where(eq(T.active, true)).get();
  if (cur) db.update(T).set({ ...v, updatedAt: new Date().toISOString() }).where(eq(T.id, cur.id)).run();
  else db.insert(T).values({ ...v, active: true }).run();
  return v;
}

/** Szárító mentése (felülírja az aktívat). ZodError-t dob érvénytelen adatra; a teljesen üres adat törli a profilt. */
export function saveDryer(input: DryerInput, db: DBX = getDb()): DryerProfile | null {
  const v = dryerInput.parse(input);
  const T = schema.dryerProfiles;
  if (isBlank(v)) {
    clearDryer(db);
    return null;
  }
  const cur = db.select({ id: T.id }).from(T).where(eq(T.active, true)).get();
  if (cur) db.update(T).set({ ...v, updatedAt: new Date().toISOString() }).where(eq(T.id, cur.id)).run();
  else db.insert(T).values({ ...v, active: true }).run();
  return v;
}

export function clearPrinter(db: DBX = getDb()): void {
  db.delete(schema.printerProfiles).where(eq(schema.printerProfiles.active, true)).run();
}
export function clearDryer(db: DBX = getDb()): void {
  db.delete(schema.dryerProfiles).where(eq(schema.dryerProfiles.active, true)).run();
}
