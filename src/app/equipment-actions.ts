"use server";

import { revalidatePath } from "next/cache";
import { translateError } from "@/i18n/errors";
import { getT } from "@/i18n/server";
import { DRYER_FIELDS, PRINTER_FIELDS, type EquipFieldDef, type Equipment } from "@/lib/equipment";
import { clearDryer, clearPrinter, getEquipment, saveDryer, savePrinter } from "@/server/equipment";

// Felszerelés-profil Server Action-ök. Az űrlap mezőnevei = a PRINTER_FIELDS / DRYER_FIELDS kulcsai;
// a tristate mező értéke "yes" | "no" | "" (ismeretlen). useActionState-tel:
//   const [state, action] = useActionState(savePrinterAction, { ok: false, errors: [] });

export interface EquipmentFormState {
  ok: boolean;
  errors: string[];
  /** hiba esetén a beküldött nyers értékek, hogy az űrlap ne ürüljön ki */
  values?: Record<string, string>;
}

function read(fd: FormData, fields: readonly EquipFieldDef[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => {
    const v = fd.get(f.key);
    return [f.key, typeof v === "string" ? v : ""];
  }));
}

async function save(fd: FormData, fields: readonly EquipFieldDef[], fn: (v: Record<string, string>) => unknown): Promise<EquipmentFormState> {
  const values = read(fd, fields);
  try {
    fn(values);
  } catch (e) {
    return { ok: false, errors: translateError(e, (await getT()).t), values };
  }
  revalidatePath("/", "layout");
  return { ok: true, errors: [] };
}

export async function getEquipmentAction(): Promise<Equipment> {
  return getEquipment();
}
export async function savePrinterAction(_prev: EquipmentFormState, fd: FormData): Promise<EquipmentFormState> {
  return save(fd, PRINTER_FIELDS, savePrinter);
}
export async function saveDryerAction(_prev: EquipmentFormState, fd: FormData): Promise<EquipmentFormState> {
  return save(fd, DRYER_FIELDS, saveDryer);
}
export async function clearPrinterAction(): Promise<void> {
  clearPrinter();
  revalidatePath("/", "layout");
}
export async function clearDryerAction(): Promise<void> {
  clearDryer();
  revalidatePath("/", "layout");
}
