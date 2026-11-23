import { desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema, type DBX } from "@/db/client";
import { tk } from "@/i18n/core";
import { AppError, appMsg } from "@/i18n/errors";
import { SPOOL_EVENT_TYPES, SPOOL_STATUSES, spoolStatusKey } from "@/lib/fields";
import { audit } from "./audit";
import { reindexProfile } from "./search";
import { storedT } from "./settings";

const emptyToNull = (v: unknown) => (v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? null : v);
const optText = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable());
/** Opcionális szám. Ha `labelKey` van, a hibaüzenet lefordított és megnevezi a mezőt (pl. a „Használtam” űrlapnál). */
const optNum = (min: number, max: number, labelKey?: string) => {
  const field = labelKey ? tk(labelKey) : null;
  const num = z.number(field ? { error: appMsg("validation.number", { field }) } : undefined).finite();
  const ranged = num.min(min, field ? appMsg("validation.min", { field, min }) : undefined).max(max, field ? appMsg("validation.max", { field, max }) : undefined);
  return z.preprocess((v) => (emptyToNull(v) === null ? null : typeof v === "string" ? Number(v.trim().replace(",", ".")) : v), ranged.nullable());
};
const optDate = z.preprocess(emptyToNull, z.string().trim().max(40).refine((v) => !Number.isNaN(Date.parse(v)), appMsg("validation.invalidDate")).nullable());

export function nextSpoolCode(db: DBX): string {
  const row = db.select({ max: sql<number>`coalesce(max(${schema.spools.id}), 0)` }).from(schema.spools).get();
  let n = (row?.max ?? 0) + 1;
  for (;;) {
    const code = `FC-${String(n).padStart(4, "0")}`;
    if (!db.select({ id: schema.spools.id }).from(schema.spools).where(eq(schema.spools.code, code)).get()) return code;
    n++;
  }
}

// ---- vásárlás ---------------------------------------------------------------------------

export const purchaseItemInput = z.object({
  profileId: z.number().int().positive(),
  variant: optText(200),
  quantity: z.preprocess((v) => (typeof v === "string" ? Number(v) : v), z.number().int().min(1).max(200)),
  unitPrice: optNum(0, 1e9),
  shippingShare: optNum(0, 1e9),
  discountShare: optNum(0, 1e9),
});

export const purchaseInput = z.object({
  purchasedAt: optDate,
  seller: optText(200),
  orderReference: optText(200),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, appMsg("validation.currencyCode")).default("HUF"),
  shippingTotal: optNum(0, 1e9),
  discountTotal: optNum(0, 1e9),
  orderTotal: optNum(0, 1e9),
  sourceKind: z.enum(["manual", "purchase_email", "web"]).default("manual"),
  sourceReference: optText(500),
  notes: optText(4000),
  receivedAt: optDate,
  location: optText(200),
  items: z.array(purchaseItemInput).min(1, appMsg("validation.itemRequired")).max(100),
});
export type PurchaseInput = z.input<typeof purchaseInput>;

export interface PurchaseCreated {
  purchaseId: number;
  purchaseItemIds: number[];
  spoolIds: number[];
  spoolCodes: string[];
}

/** Vásárlás rögzítése: tranzakció + tételek + tételenként `quantity` darab fizikai tekercs. */
export function createPurchase(input: PurchaseInput, opts: { importId?: number | null; isDemo?: boolean } = {}, db: DBX = getDb()): PurchaseCreated {
  const v = purchaseInput.parse(input);
  const S = schema;
  const run = (tx: DBX): PurchaseCreated => {
    const purchase = tx.insert(S.purchases).values({
      purchasedAt: v.purchasedAt, seller: v.seller, orderReference: v.orderReference, currency: v.currency,
      shippingTotal: v.shippingTotal, discountTotal: v.discountTotal, orderTotal: v.orderTotal,
      sourceKind: v.sourceKind, sourceReference: v.sourceReference, notes: v.notes,
      importId: opts.importId ?? null, isDemo: opts.isDemo ?? false,
    }).returning({ id: S.purchases.id }).get();
    const out: PurchaseCreated = { purchaseId: purchase.id, purchaseItemIds: [], spoolIds: [], spoolCodes: [] };
    for (const it of v.items) {
      const profile = tx.select().from(S.materialProfiles).where(eq(S.materialProfiles.id, it.profileId)).get();
      if (!profile) throw new AppError("stock.error.unknownProfile", { id: it.profileId });
      const item = tx.insert(S.purchaseItems).values({
        purchaseId: purchase.id, profileId: it.profileId, variant: it.variant, quantity: it.quantity,
        unitPrice: it.unitPrice, shippingShare: it.shippingShare, discountShare: it.discountShare,
      }).returning({ id: S.purchaseItems.id }).get();
      out.purchaseItemIds.push(item.id);
      for (let i = 0; i < it.quantity; i++) {
        const code = nextSpoolCode(tx);
        const spool = tx.insert(S.spools).values({
          code, profileId: it.profileId, purchaseItemId: item.id, status: "sealed",
          initialWeightG: profile.netWeightG, remainingG: null, remainingOrigin: null,
          receivedAt: v.receivedAt, location: v.location, isDemo: opts.isDemo ?? false,
        }).returning({ id: S.spools.id }).get();
        out.spoolIds.push(spool.id);
        out.spoolCodes.push(code);
      }
      reindexProfile(it.profileId, tx);
    }
    audit("purchase", purchase.id, "create", (() => { const st = storedT(tx); return st("audit.purchase.create", { seller: v.seller ?? st("audit.purchase.unknownSeller"), count: out.spoolIds.length }); })(), tx);
    return out;
  };
  // ha már tranzakcióban vagyunk (import), abban futunk tovább
  return "rollback" in db ? run(db) : db.transaction((tx) => run(tx));
}

export function deletePurchase(id: number, db: DBX = getDb()) {
  const S = schema;
  const items = db.select().from(S.purchaseItems).where(eq(S.purchaseItems.purchaseId, id)).all();
  const run = (tx: DBX) => {
    if (items.length) tx.delete(S.spools).where(inArray(S.spools.purchaseItemId, items.map((i) => i.id))).run();
    tx.delete(S.purchases).where(eq(S.purchases.id, id)).run();
    for (const pid of new Set(items.map((i) => i.profileId))) reindexProfile(pid, tx);
    audit("purchase", id, "delete", storedT(tx)("audit.purchase.delete"), tx);
  };
  if ("rollback" in db) run(db);
  else db.transaction((tx) => run(tx));
}

// ---- tekercs ----------------------------------------------------------------------------

export const spoolInput = z.object({
  status: z.enum(SPOOL_STATUSES).default("sealed"),
  initialWeightG: optNum(0, 20000),
  remainingG: optNum(0, 20000, "spool.form.remaining"),
  remainingOrigin: z.preprocess(emptyToNull, z.enum(["measured", "estimate"]).nullable()),
  receivedAt: optDate,
  openedAt: optDate,
  location: optText(200),
  storageMethod: optText(200),
  moistureState: optText(200),
  notes: optText(4000),
});

export function addSpool(profileId: number, input: z.input<typeof spoolInput>, opts: { isDemo?: boolean } = {}, db: DBX = getDb()): { id: number; code: string } {
  const v = spoolInput.parse(input);
  if (v.remainingG !== null && !v.remainingOrigin) v.remainingOrigin = "estimate";
  if (v.remainingG === null) v.remainingOrigin = null;
  const code = nextSpoolCode(db);
  const row = db.insert(schema.spools).values({ ...v, code, profileId, isDemo: opts.isDemo ?? false }).returning({ id: schema.spools.id }).get();
  audit("spool", row.id, "create", storedT(db)("audit.spool.create", { code }), db);
  reindexProfile(profileId, db);
  return { id: row.id, code };
}

export function updateSpool(spoolId: number, input: z.input<typeof spoolInput>, db: DBX = getDb()) {
  const before = db.select().from(schema.spools).where(eq(schema.spools.id, spoolId)).get();
  if (!before) throw new AppError("stock.error.spoolNotFound");
  const v = spoolInput.parse(input);
  if (v.remainingG === null) v.remainingOrigin = null;
  else if (!v.remainingOrigin) v.remainingOrigin = "estimate";
  if (v.status === "open" && !v.openedAt && before.status === "sealed") v.openedAt = new Date().toISOString().slice(0, 10);
  db.update(schema.spools).set({ ...v, updatedAt: new Date().toISOString() }).where(eq(schema.spools.id, spoolId)).run();
  if (before.status !== v.status) {
    const st = storedT(db);
    audit("spool", spoolId, "status", st("audit.spool.status", { code: before.code, from: st(spoolStatusKey(before.status)), to: st(spoolStatusKey(v.status)) }), db);
  }
  reindexProfile(before.profileId, db);
}

export function deleteSpool(spoolId: number, db: DBX = getDb()) {
  const s = db.select().from(schema.spools).where(eq(schema.spools.id, spoolId)).get();
  if (!s) return;
  db.delete(schema.spools).where(eq(schema.spools.id, spoolId)).run();
  audit("spool", spoolId, "delete", storedT(db)("audit.spool.delete", { code: s.code }), db);
  reindexProfile(s.profileId, db);
}

export const spoolEventInput = z
  .object({
    type: z.enum(SPOOL_EVENT_TYPES),
    at: z.string().trim().min(8).max(40).refine((v) => !Number.isNaN(Date.parse(v)), appMsg("validation.invalidDate")),
    /** mérésnél: a mért maradék (g) */
    remainingG: optNum(0, 20000, "spool.event.remaining"),
    /** nyomtatásnál: felhasznált mennyiség (g) */
    usedG: optNum(0, 20000, "spool.event.used"),
    isEstimate: z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean()).default(false),
    dryTempC: optNum(20, 200),
    dryHours: optNum(0, 96),
    newStatus: z.preprocess(emptyToNull, z.enum(SPOOL_STATUSES).nullable()),
    note: optText(2000),
  })
  .superRefine((v, ctx) => {
    if (v.type === "measure" && v.remainingG === null) ctx.addIssue({ code: "custom", message: appMsg("validation.needRemaining"), path: ["remainingG"] });
    if (v.type === "print_use" && v.usedG === null) ctx.addIssue({ code: "custom", message: appMsg("validation.needUsed"), path: ["usedG"] });
    if (v.type === "status" && v.newStatus === null) ctx.addIssue({ code: "custom", message: appMsg("validation.needStatus"), path: ["newStatus"] });
  });

/**
 * Tekercsesemény rögzítése. A maradék SOHA nem kitalált érték:
 *  - mérés → mért (vagy kifejezetten becsültnek jelölt) érték;
 *  - nyomtatás → csak akkor számolunk maradékot, ha van kiinduló érték; az eredmény mindig „becslés”.
 */
export function addSpoolEvent(spoolId: number, input: z.input<typeof spoolEventInput>, db: DBX = getDb()) {
  const v = spoolEventInput.parse(input);
  const s = db.select().from(schema.spools).where(eq(schema.spools.id, spoolId)).get();
  if (!s) throw new AppError("stock.error.spoolNotFound");
  const st = storedT(db);
  const set: Partial<typeof schema.spools.$inferInsert> = { updatedAt: new Date().toISOString() };
  let remainingAfter: number | null = null;
  let delta: number | null = null;
  let estimate = v.isEstimate;

  if (v.type === "measure") {
    remainingAfter = v.remainingG;
    set.remainingG = v.remainingG;
    set.remainingOrigin = v.isEstimate ? "estimate" : "measured";
    if (!v.isEstimate) set.lastMeasuredAt = v.at;
    if (s.remainingG !== null && v.remainingG !== null) delta = v.remainingG - s.remainingG;
  } else if (v.type === "print_use") {
    delta = -(v.usedG as number);
    const base = s.remainingG ?? (s.status === "sealed" || s.remainingOrigin === null ? s.initialWeightG : null);
    if (base !== null && base !== undefined) {
      remainingAfter = Math.max(0, base - (v.usedG as number));
      set.remainingG = remainingAfter;
      set.remainingOrigin = "estimate";
    }
    estimate = true;
    if (s.status === "sealed") {
      set.status = "open";
      set.openedAt = s.openedAt ?? v.at.slice(0, 10);
    }
  } else if (v.type === "status" && v.newStatus) {
    set.status = v.newStatus;
    if (v.newStatus === "open" && !s.openedAt) set.openedAt = v.at.slice(0, 10);
    if (v.newStatus === "empty") {
      set.remainingG = 0;
      set.remainingOrigin = "measured";
      remainingAfter = 0;
    }
    audit("spool", spoolId, "status", st("audit.spool.status", { code: s.code, from: st(spoolStatusKey(s.status)), to: st(spoolStatusKey(v.newStatus)) }), db);
  } else if (v.type === "dry") {
    set.moistureState = st("stock.moistureDried", { date: v.at.slice(0, 10) });
  }

  db.insert(schema.spoolEvents).values({
    spoolId, type: v.type, at: v.at, deltaG: delta, remainingG: remainingAfter, isEstimate: estimate,
    dryTempC: v.dryTempC, dryHours: v.dryHours,
    note: v.type === "status" && v.newStatus ? [st(spoolStatusKey(v.newStatus)), v.note].filter(Boolean).join(" – ") : v.note,
  }).run();
  db.update(schema.spools).set(set).where(eq(schema.spools.id, spoolId)).run();
  reindexProfile(s.profileId, db);
}

// ---- költségszámítás: ISMERT vs. SZÁMÍTOTT ----------------------------------------------

export interface SpoolCost {
  /** ismert, rögzített egységár (null = nem ismert) */
  unitPrice: number | null;
  shippingPerSpool: number | null;
  discountPerSpool: number | null;
  /** tényleges tekercsenkénti ár, ha számítható */
  effective: number | null;
  /** igaz, ha az effektív ár bármely összetevője számított (arányosított) érték */
  computed: boolean;
  currency: string;
}

export function spoolCost(
  item: Pick<schema.PurchaseItem, "id" | "quantity" | "unitPrice" | "shippingShare" | "discountShare">,
  purchase: Pick<schema.Purchase, "currency" | "shippingTotal" | "discountTotal">,
  allItems: Pick<schema.PurchaseItem, "quantity" | "unitPrice">[],
): SpoolCost {
  let computed = false;
  const totalQty = allItems.reduce((a, i) => a + i.quantity, 0);
  let ship = item.shippingShare;
  if (ship === null && purchase.shippingTotal !== null && totalQty > 0) {
    ship = purchase.shippingTotal / totalQty;
    computed = true;
  }
  let disc = item.discountShare;
  if (disc === null && purchase.discountTotal !== null && item.unitPrice !== null && allItems.every((i) => i.unitPrice !== null)) {
    const value = allItems.reduce((a, i) => a + (i.unitPrice as number) * i.quantity, 0);
    if (value > 0) {
      disc = (purchase.discountTotal * item.unitPrice) / value;
      computed = true;
    }
  }
  const effective = item.unitPrice === null ? null : item.unitPrice + (ship ?? 0) - (disc ?? 0);
  return { unitPrice: item.unitPrice, shippingPerSpool: ship, discountPerSpool: disc, effective, computed: effective !== null && computed, currency: purchase.currency };
}

export function listPurchases(limit = 100, db: DBX = getDb()) {
  const S = schema;
  const purchases = db.select().from(S.purchases).orderBy(desc(S.purchases.purchasedAt), desc(S.purchases.id)).limit(limit).all();
  const items = purchases.length ? db.select().from(S.purchaseItems).where(inArray(S.purchaseItems.purchaseId, purchases.map((p) => p.id))).all() : [];
  return purchases.map((p) => ({ ...p, items: items.filter((i) => i.purchaseId === p.id) }));
}
