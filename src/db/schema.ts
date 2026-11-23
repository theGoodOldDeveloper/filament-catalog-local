import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;
const id = () => integer("id").primaryKey({ autoIncrement: true });
const createdAt = () => text("created_at").notNull().default(now);
const updatedAt = () => text("updated_at").notNull().default(now);

/** Gyártói anyagprofil – a TÉNYEK. Fizikai tekercset nem tartalmaz. */
export const materialProfiles = sqliteTable(
  "material_profiles",
  {
    id: id(),
    manufacturer: text("manufacturer").notNull(),
    brand: text("brand"),
    productName: text("product_name").notNull(),
    productType: text("product_type"),
    sku: text("sku"),
    materialFamily: text("material_family").notNull(),
    materialNameRaw: text("material_name_raw"),

    colorName: text("color_name"),
    colorCode: text("color_code"),
    colorHex: text("color_hex"),
    colorDescription: text("color_description"),
    transparency: text("transparency"),
    finish: text("finish"),
    effect: text("effect"),

    diameterMm: real("diameter_mm"),
    diameterToleranceMm: real("diameter_tolerance_mm"),
    netWeightG: real("net_weight_g"),
    grossWeightG: real("gross_weight_g"),
    spoolEmptyWeightG: real("spool_empty_weight_g"),
    spoolMaterial: text("spool_material"),
    spoolDimensions: text("spool_dimensions"),
    spoolRecyclable: text("spool_recyclable"),

    description: text("description"),
    features: text("features"),
    useCases: text("use_cases"),
    recommendedUses: text("recommended_uses"),
    notRecommendedUses: text("not_recommended_uses"),

    mechanicalProps: text("mechanical_props"),
    thermalProps: text("thermal_props"),
    chemicalProps: text("chemical_props"),
    uvOutdoorProps: text("uv_outdoor_props"),
    flexibility: text("flexibility"),
    shrinkage: text("shrinkage"),
    impactResistance: text("impact_resistance"),
    layerAdhesion: text("layer_adhesion"),
    surfaceQuality: text("surface_quality"),

    nozzleRequirement: text("nozzle_requirement"),
    abrasive: integer("abrasive", { mode: "boolean" }),
    buildPlate: text("build_plate"),
    adhesive: text("adhesive"),
    enclosure: text("enclosure"),
    ventilationNotes: text("ventilation_notes"),

    nozzleTempMinC: real("nozzle_temp_min_c"),
    nozzleTempMaxC: real("nozzle_temp_max_c"),
    bedTempMinC: real("bed_temp_min_c"),
    bedTempMaxC: real("bed_temp_max_c"),
    chamberTempMinC: real("chamber_temp_min_c"),
    chamberTempMaxC: real("chamber_temp_max_c"),
    printSpeedMinMms: real("print_speed_min_mms"),
    printSpeedMaxMms: real("print_speed_max_mms"),
    flowRatio: real("flow_ratio"),
    fanMinPct: real("fan_min_pct"),
    fanMaxPct: real("fan_max_pct"),
    retractDirectMm: real("retract_direct_mm"),
    retractBowdenMm: real("retract_bowden_mm"),
    retractSpeedMms: real("retract_speed_mms"),
    maxVolumetricFlowMm3s: real("max_volumetric_flow_mm3s"),
    layerHeightMinMm: real("layer_height_min_mm"),
    layerHeightMaxMm: real("layer_height_max_mm"),
    slicerNotes: text("slicer_notes"),

    dryingTempC: real("drying_temp_c"),
    dryingTimeH: real("drying_time_h"),
    storageNotes: text("storage_notes"),

    compatibility: text("compatibility"),
    datasheetUrl: text("datasheet_url"),
    tdsUrl: text("tds_url"),
    sdsUrl: text("sds_url"),

    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("mp_manufacturer_idx").on(t.manufacturer),
    index("mp_family_idx").on(t.materialFamily),
    index("mp_sku_idx").on(t.sku),
    index("mp_name_idx").on(t.productName),
  ],
);

/** Számszerű / specifikált műszaki adat egységgel és vizsgálati módszerrel. */
export const technicalSpecs = sqliteTable(
  "technical_specs",
  {
    id: id(),
    profileId: integer("profile_id").notNull().references(() => materialProfiles.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    valueNum: real("value_num"),
    valueText: text("value_text"),
    unit: text("unit"),
    testMethod: text("test_method"),
    origin: text("origin"),
    sourceId: integer("source_id").references(() => sources.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("ts_profile_idx").on(t.profileId), index("ts_key_idx").on(t.key)],
);

/** Forrás: honnan származik az adat. */
export const sources = sqliteTable(
  "sources",
  {
    id: id(),
    profileId: integer("profile_id").notNull().references(() => materialProfiles.id, { onDelete: "cascade" }),
    url: text("url"),
    title: text("title"),
    sourceType: text("source_type").notNull(), // manufacturer | seller | secondary | email | own
    retrievedAt: text("retrieved_at"),
    fields: text("fields", { mode: "json" }).$type<string[]>().notNull().default([]),
    excerpt: text("excerpt"),
    importId: integer("import_id"),
    createdAt: createdAt(),
  },
  (t) => [index("src_profile_idx").on(t.profileId)],
);

/** Mezőszintű eredetjelölés. */
export const fieldProvenance = sqliteTable(
  "field_provenance",
  {
    id: id(),
    profileId: integer("profile_id").notNull().references(() => materialProfiles.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    origin: text("origin").notNull(), // manufacturer | seller | email | secondary | own | estimate
    sourceId: integer("source_id").references(() => sources.id, { onDelete: "set null" }),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("fp_profile_field_uq").on(t.profileId, t.field)],
);

export const notes = sqliteTable(
  "notes",
  {
    id: id(),
    profileId: integer("profile_id").notNull().references(() => materialProfiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    notedAt: text("noted_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("notes_profile_idx").on(t.profileId)],
);

export const printProfiles = sqliteTable(
  "print_profiles",
  {
    id: id(),
    profileId: integer("profile_id").notNull().references(() => materialProfiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slicer: text("slicer"),
    printer: text("printer"),
    nozzleDiameterMm: real("nozzle_diameter_mm"),
    nozzleMaterial: text("nozzle_material"),
    version: text("version"),
    /** kulcs → érték (egységgel a kulcsban vagy az értékben), pl. { "nozzle_temp_c": 215 } */
    settings: text("settings", { mode: "json" }).$type<Record<string, string | number>>().notNull().default({}),
    origin: text("origin").notNull().default("own"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("pp_profile_idx").on(t.profileId)],
);

/** Vásárlási tranzakció (több tétellel). */
export const purchases = sqliteTable(
  "purchases",
  {
    id: id(),
    purchasedAt: text("purchased_at"),
    seller: text("seller"),
    orderReference: text("order_reference"),
    currency: text("currency").notNull().default("HUF"),
    shippingTotal: real("shipping_total"),
    discountTotal: real("discount_total"),
    orderTotal: real("order_total"),
    sourceKind: text("source_kind").notNull().default("manual"), // manual | purchase_email | web
    sourceReference: text("source_reference"),
    importId: integer("import_id"),
    notes: text("notes"),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("pu_date_idx").on(t.purchasedAt), index("pu_seller_idx").on(t.seller)],
);

export const purchaseItems = sqliteTable(
  "purchase_items",
  {
    id: id(),
    purchaseId: integer("purchase_id").notNull().references(() => purchases.id, { onDelete: "cascade" }),
    profileId: integer("profile_id").notNull().references(() => materialProfiles.id, { onDelete: "restrict" }),
    variant: text("variant"),
    quantity: integer("quantity").notNull().default(1),
    /** ISMERT adatok – ha nem ismert, null. Számított értéket itt nem tárolunk. */
    unitPrice: real("unit_price"),
    shippingShare: real("shipping_share"),
    discountShare: real("discount_share"),
    createdAt: createdAt(),
  },
  (t) => [index("pi_purchase_idx").on(t.purchaseId), index("pi_profile_idx").on(t.profileId)],
);

/** Fizikai tekercs – a KÉSZLET. */
export const spools = sqliteTable(
  "spools",
  {
    id: id(),
    code: text("code").notNull(),
    profileId: integer("profile_id").notNull().references(() => materialProfiles.id, { onDelete: "restrict" }),
    purchaseItemId: integer("purchase_item_id").references(() => purchaseItems.id, { onDelete: "set null" }),
    status: text("status").notNull().default("sealed"), // sealed | open | empty | discarded
    initialWeightG: real("initial_weight_g"),
    remainingG: real("remaining_g"),
    /** measured | estimate | null (null = soha nem mértem / nem becsültem) */
    remainingOrigin: text("remaining_origin"),
    receivedAt: text("received_at"),
    openedAt: text("opened_at"),
    lastMeasuredAt: text("last_measured_at"),
    location: text("location"),
    storageMethod: text("storage_method"),
    moistureState: text("moisture_state"),
    notes: text("notes"),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("sp_code_uq").on(t.code),
    index("sp_profile_idx").on(t.profileId),
    index("sp_status_idx").on(t.status),
  ],
);

export const spoolEvents = sqliteTable(
  "spool_events",
  {
    id: id(),
    spoolId: integer("spool_id").notNull().references(() => spools.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // measure | dry | print_use | status | note
    at: text("at").notNull(),
    deltaG: real("delta_g"),
    remainingG: real("remaining_g"),
    isEstimate: integer("is_estimate", { mode: "boolean" }).notNull().default(false),
    dryTempC: real("dry_temp_c"),
    dryHours: real("dry_hours"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("se_spool_idx").on(t.spoolId, t.at)],
);

export const documents = sqliteTable(
  "documents",
  {
    id: id(),
    profileId: integer("profile_id").notNull().references(() => materialProfiles.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // photo | tds | sds | other
    originalName: text("original_name").notNull(),
    storedName: text("stored_name").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("doc_profile_idx").on(t.profileId)],
);

/** Import napló (régi; a helyi verzió nem használja). */
export const imports = sqliteTable(
  "imports",
  {
    id: id(),
    idempotencyKey: text("idempotency_key").notNull(),
    schemaVersion: text("schema_version").notNull(),
    payloadHash: text("payload_hash").notNull(),
    status: text("status").notNull(), // applied | needs_review | rejected
    channel: text("channel").notNull().default("api"), // api | admin
    sourceKind: text("source_kind"),
    sourceReference: text("source_reference"),
    confidence: text("confidence"),
    payload: text("payload", { mode: "json" }).$type<unknown>().notNull(),
    issues: text("issues", { mode: "json" }).$type<ImportIssue[]>().notNull().default([]),
    result: text("result", { mode: "json" }).$type<ImportResult | null>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("imp_key_uq").on(t.idempotencyKey), index("imp_status_idx").on(t.status)],
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: id(),
    entity: text("entity").notNull(),
    entityId: integer("entity_id"),
    action: text("action").notNull(),
    summary: text("summary").notNull(),
    at: text("at").notNull().default(now),
  },
  (t) => [index("ae_entity_idx").on(t.entity, t.entityId), index("ae_at_idx").on(t.at)],
);

/** Alkalmazás-beállítások (kulcs/érték). Ismert kulcsok: `language` ("hu" | "en"). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(now),
});

/**
 * Felhasználói nyomtatóprofil. Minden adat opcionális: NULL = ismeretlen (soha nem találunk ki értéket).
 * Egyetlen sor az aktív (`active`); a tábla több gépre is bővíthető.
 */
export const printerProfiles = sqliteTable("printer_profiles", {
  id: id(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  name: text("name"),
  maxNozzleC: real("max_nozzle_c"),
  maxBedC: real("max_bed_c"),
  /** zárt (ajtós/burkolt) nyomtatótér – fűtés nélkül is számít */
  enclosed: integer("enclosed", { mode: "boolean" }),
  heatedChamber: integer("heated_chamber", { mode: "boolean" }),
  maxChamberC: real("max_chamber_c"),
  heatedToolheads: integer("heated_toolheads"),
  hardenedNozzle: integer("hardened_nozzle", { mode: "boolean" }),
  buildVolume: text("build_volume"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Felhasználói szárítóprofil (lásd `printerProfiles`). */
export const dryerProfiles = sqliteTable("dryer_profiles", {
  id: id(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  name: text("name"),
  minC: real("min_c"),
  maxC: real("max_c"),
  zones: integer("zones"),
  capacitySpools: integer("capacity_spools"),
  powerW: real("power_w"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export interface ImportIssue {
  level: "error" | "review" | "warning";
  item_index: number | null;
  code: string;
  message: string;
  candidates?: { profile_id: number; label: string }[];
}

export interface ImportResult {
  purchase_id: number | null;
  profiles: { item_index: number | null; profile_id: number; action: "created" | "matched" | "updated" }[];
  purchase_item_ids: number[];
  spool_ids: number[];
  spool_codes: string[];
  source_ids: number[];
  skipped_fields: { profile_id: number; field: string; reason: string }[];
}

export type MaterialProfile = typeof materialProfiles.$inferSelect;
export type NewMaterialProfile = typeof materialProfiles.$inferInsert;
export type Spool = typeof spools.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type ImportRow = typeof imports.$inferSelect;
