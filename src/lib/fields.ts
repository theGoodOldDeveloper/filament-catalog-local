// A material profile mezőinek egyetlen forrása: ebből épül az űrlap, a validáció,
// az adatlap, az összehasonlítás, a CSV export kulcs-leképezése.

export type FieldType = "text" | "textarea" | "number" | "select" | "tristate" | "url" | "color";

export interface FieldDef {
  key: ProfileFieldKey;
  group: FieldGroupKey;
  type: FieldType;
  unit?: string;
  required?: boolean;
  options?: readonly string[];
  min?: number;
  max?: number;
  step?: number;
  /** van súgószöveg: t(`field.${key}.hint`) */
  hint?: boolean;
  /** a mező a szeletelő/nyomtatási ajánlások része (import: print_settings) */
  print?: boolean;
}

export const MATERIAL_FAMILIES = [
  "PLA", "PLA+", "PETG", "PCTG", "ABS", "ASA", "TPU", "TPE", "PA/Nylon", "PC", "PP", "PVA", "HIPS", "PVB", "PET", "PPS", "Kompozit", "Egyéb",
] as const;

export const ORIGINS = ["manufacturer", "seller", "email", "secondary", "own", "estimate"] as const;
export type Origin = (typeof ORIGINS)[number];

/** Az anyagcsalád megjelenített neve. A tárolt érték („Kompozit”, „Egyéb”) nem változik, csak a megjelenítés fordul. */
export const familyLabel = (t: (key: string) => string, family: string): string => (family === "Kompozit" ? t("family.composite") : family === "Egyéb" ? t("family.other") : family);

/** Fordítási kulcsok: a megjelenített szöveg mindig t(kulcs). */
export const fieldLabelKey = (key: string) => `field.${key}`;
export const fieldHintKey = (key: string) => `field.${key}.hint`;
export const groupLabelKey = (key: string) => `fieldgroup.${key}`;
export const originKey = (o: string) => `origin.${o}`;
export const originShortKey = (o: string) => `origin.short.${o}`;
export const spoolStatusKey = (s: string) => `spoolStatus.${s}`;
export const spoolEventKey = (e: string) => `spoolEvent.${e}`;

export const FIELD_GROUPS = [
  { key: "identity" },
  { key: "color" },
  { key: "physical" },
  { key: "description" },
  { key: "properties" },
  { key: "hardware" },
  { key: "print" },
  { key: "drying" },
  { key: "links" },
] as const;
export type FieldGroupKey = (typeof FIELD_GROUPS)[number]["key"];

const T = "text", TA = "textarea", N = "number";

export const PROFILE_FIELDS = [
  { key: "manufacturer", group: "identity", type: T, required: true },
  { key: "brand", group: "identity", type: T },
  { key: "productName", group: "identity", type: T, required: true },
  { key: "productType", group: "identity", type: T },
  { key: "sku", group: "identity", type: T },
  { key: "materialFamily", group: "identity", type: "select", options: MATERIAL_FAMILIES, required: true },
  { key: "materialNameRaw", group: "identity", type: T, hint: true },

  { key: "colorName", group: "color", type: T },
  { key: "colorCode", group: "color", type: T },
  { key: "colorHex", group: "color", type: "color", hint: true },
  { key: "colorDescription", group: "color", type: T },
  { key: "transparency", group: "color", type: T, hint: true },
  { key: "finish", group: "color", type: T, hint: true },
  { key: "effect", group: "color", type: T, hint: true },

  { key: "diameterMm", group: "physical", type: N, unit: "mm", min: 1, max: 3.5, step: 0.01 },
  { key: "diameterToleranceMm", group: "physical", type: N, unit: "mm", min: 0, max: 0.5, step: 0.001 },
  { key: "netWeightG", group: "physical", type: N, unit: "g", min: 1, max: 20000 },
  { key: "grossWeightG", group: "physical", type: N, unit: "g", min: 1, max: 25000 },
  { key: "spoolEmptyWeightG", group: "physical", type: N, unit: "g", min: 0, max: 5000 },
  { key: "spoolMaterial", group: "physical", type: T },
  { key: "spoolDimensions", group: "physical", type: T, hint: true },
  { key: "spoolRecyclable", group: "physical", type: T },

  { key: "description", group: "description", type: TA },
  { key: "features", group: "description", type: TA },
  { key: "useCases", group: "description", type: TA },
  { key: "recommendedUses", group: "description", type: TA },
  { key: "notRecommendedUses", group: "description", type: TA },

  { key: "mechanicalProps", group: "properties", type: TA },
  { key: "thermalProps", group: "properties", type: TA },
  { key: "chemicalProps", group: "properties", type: TA },
  { key: "uvOutdoorProps", group: "properties", type: TA },
  { key: "flexibility", group: "properties", type: T },
  { key: "shrinkage", group: "properties", type: T },
  { key: "impactResistance", group: "properties", type: T },
  { key: "layerAdhesion", group: "properties", type: T },
  { key: "surfaceQuality", group: "properties", type: T },

  { key: "nozzleRequirement", group: "hardware", type: T, hint: true },
  { key: "abrasive", group: "hardware", type: "tristate" },
  { key: "buildPlate", group: "hardware", type: T },
  { key: "adhesive", group: "hardware", type: T },
  { key: "enclosure", group: "hardware", type: T },
  { key: "ventilationNotes", group: "hardware", type: TA },

  { key: "nozzleTempMinC", group: "print", type: N, unit: "°C", min: 0, max: 500, print: true },
  { key: "nozzleTempMaxC", group: "print", type: N, unit: "°C", min: 0, max: 500, print: true },
  { key: "bedTempMinC", group: "print", type: N, unit: "°C", min: 0, max: 200, print: true },
  { key: "bedTempMaxC", group: "print", type: N, unit: "°C", min: 0, max: 200, print: true },
  { key: "chamberTempMinC", group: "print", type: N, unit: "°C", min: 0, max: 150, print: true },
  { key: "chamberTempMaxC", group: "print", type: N, unit: "°C", min: 0, max: 150, print: true },
  { key: "printSpeedMinMms", group: "print", type: N, unit: "mm/s", min: 0, max: 2000, print: true },
  { key: "printSpeedMaxMms", group: "print", type: N, unit: "mm/s", min: 0, max: 2000, print: true },
  { key: "flowRatio", group: "print", type: N, min: 0.5, max: 1.5, step: 0.001, print: true },
  { key: "fanMinPct", group: "print", type: N, unit: "%", min: 0, max: 100, print: true },
  { key: "fanMaxPct", group: "print", type: N, unit: "%", min: 0, max: 100, print: true },
  { key: "retractDirectMm", group: "print", type: N, unit: "mm", min: 0, max: 20, step: 0.01, print: true },
  { key: "retractBowdenMm", group: "print", type: N, unit: "mm", min: 0, max: 20, step: 0.01, print: true },
  { key: "retractSpeedMms", group: "print", type: N, unit: "mm/s", min: 0, max: 200, print: true },
  { key: "maxVolumetricFlowMm3s", group: "print", type: N, unit: "mm³/s", min: 0, max: 100, step: 0.1, print: true },
  { key: "layerHeightMinMm", group: "print", type: N, unit: "mm", min: 0.02, max: 2, step: 0.01, print: true },
  { key: "layerHeightMaxMm", group: "print", type: N, unit: "mm", min: 0.02, max: 2, step: 0.01, print: true },
  { key: "slicerNotes", group: "print", type: TA, print: true },

  { key: "dryingTempC", group: "drying", type: N, unit: "°C", min: 20, max: 200, print: true },
  { key: "dryingTimeH", group: "drying", type: N, unit: "h", min: 0, max: 72, step: 0.5, print: true },
  { key: "storageNotes", group: "drying", type: TA, print: true },

  { key: "compatibility", group: "links", type: TA, hint: true },
  { key: "datasheetUrl", group: "links", type: "url" },
  { key: "tdsUrl", group: "links", type: "url" },
  { key: "sdsUrl", group: "links", type: "url" },
] as const satisfies readonly {
  key: string; group: FieldGroupKey; type: FieldType; unit?: string; required?: boolean;
  options?: readonly string[]; min?: number; max?: number; step?: number; hint?: boolean; print?: boolean;
}[];

export type ProfileFieldKey = (typeof PROFILE_FIELDS)[number]["key"];
export const FIELDS: readonly FieldDef[] = PROFILE_FIELDS;
export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(FIELDS.map((f) => [f.key, f]));

export const camelToSnake = (s: string) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()).replace(/(\d+)/g, "$1");
export const FIELD_BY_SNAKE: Record<string, FieldDef> = Object.fromEntries(FIELDS.map((f) => [camelToSnake(f.key), f]));

/** Előre ajánlott műszaki adat kulcsok (technical_specs). Tetszőleges egyéb kulcs is felvehető. */
export const SPEC_PRESETS = [
  { key: "density", label: "Sűrűség", unit: "g/cm³" },
  { key: "tensile_strength", label: "Szakítószilárdság", unit: "MPa" },
  { key: "tensile_modulus", label: "Húzó rugalmassági modulus", unit: "MPa" },
  { key: "elongation_at_break", label: "Szakadási nyúlás", unit: "%" },
  { key: "flexural_strength", label: "Hajlítószilárdság", unit: "MPa" },
  { key: "flexural_modulus", label: "Hajlító modulus", unit: "MPa" },
  { key: "impact_strength", label: "Ütőszilárdság", unit: "kJ/m²" },
  { key: "hdt", label: "Hődeformációs hőmérséklet (HDT)", unit: "°C" },
  { key: "vicat", label: "Vicat lágyuláspont", unit: "°C" },
  { key: "glass_transition", label: "Üvegesedési hőmérséklet (Tg)", unit: "°C" },
  { key: "melt_flow_index", label: "Folyási index (MFI)", unit: "g/10 min" },
  { key: "shore_hardness", label: "Shore keménység", unit: "" },
  { key: "water_absorption", label: "Vízfelvétel", unit: "%" },
] as const;

export const SPOOL_STATUSES = ["sealed", "open", "empty", "discarded"] as const;
export type SpoolStatus = (typeof SPOOL_STATUSES)[number];
export const SPOOL_EVENT_TYPES = ["measure", "dry", "print_use", "status", "note"] as const;
export type SpoolEventType = (typeof SPOOL_EVENT_TYPES)[number];
/** Ez alatt a maradék alatt számít egy tekercs „elfogyóban lévőnek”. */
export const LOW_STOCK_G = 200;
