// Felszerelés-profil (a felhasználó nyomtatója és szárítója): típusok + mezőleírás EGY helyen.
// Ebből épül a validáció (src/server/equipment.ts) és ebből rajzolhat űrlapot a beállítás oldal:
//   címke: t(equipmentLabelKey("printer", f.key)), a tristate értékei: "yes" | "no" | "" (ismeretlen).
// Minden adat elhagyható: null = ismeretlen – soha nem találunk ki értéket.

export type EquipFieldType = "text" | "number" | "int" | "tristate";
export interface EquipFieldDef { key: string; type: EquipFieldType; unit?: string; min?: number; max?: number }

export const PRINTER_FIELDS = [
  { key: "name", type: "text" },
  { key: "maxNozzleC", type: "number", unit: "°C", min: 150, max: 600 },
  { key: "maxBedC", type: "number", unit: "°C", min: 0, max: 250 },
  { key: "enclosed", type: "tristate" },
  { key: "heatedChamber", type: "tristate" },
  { key: "maxChamberC", type: "number", unit: "°C", min: 30, max: 300 },
  { key: "heatedToolheads", type: "int", min: 1, max: 16 },
  { key: "hardenedNozzle", type: "tristate" },
  { key: "buildVolume", type: "text" },
] as const satisfies readonly EquipFieldDef[];

export const DRYER_FIELDS = [
  { key: "name", type: "text" },
  { key: "minC", type: "number", unit: "°C", min: 20, max: 150 },
  { key: "maxC", type: "number", unit: "°C", min: 20, max: 200 },
  { key: "zones", type: "int", min: 1, max: 8 },
  { key: "capacitySpools", type: "int", min: 1, max: 16 },
  { key: "powerW", type: "number", unit: "W", min: 1, max: 5000 },
] as const satisfies readonly EquipFieldDef[];

export interface PrinterProfile {
  name: string | null;
  maxNozzleC: number | null;
  maxBedC: number | null;
  /** zárt (ajtós/burkolt) nyomtatótér */
  enclosed: boolean | null;
  /** aktívan fűtött kamra */
  heatedChamber: boolean | null;
  /** null, ha nincs fűtött kamra vagy nem ismert */
  maxChamberC: number | null;
  heatedToolheads: number | null;
  /** igen / nem / ismeretlen (null) */
  hardenedNozzle: boolean | null;
  buildVolume: string | null;
}

export interface DryerProfile {
  name: string | null;
  minC: number | null;
  maxC: number | null;
  zones: number | null;
  capacitySpools: number | null;
  powerW: number | null;
}

export interface Equipment { printer: PrinterProfile | null; dryer: DryerProfile | null }
export type EquipmentKind = keyof Equipment;

export const equipmentLabelKey = (kind: EquipmentKind, key: string) => `equipment.${kind}.${key}`;

/** A tristate mezők választási lehetőségei az űrlaphoz (érték → címkekulcs). */
export const TRISTATE_OPTIONS = [
  { value: "", labelKey: "equipment.tristate.unknown" },
  { value: "yes", labelKey: "equipment.tristate.yes" },
  { value: "no", labelKey: "equipment.tristate.no" },
] as const;
