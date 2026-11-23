"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { clearDryerAction, clearPrinterAction, saveDryerAction, savePrinterAction, type EquipmentFormState } from "@/app/equipment-actions";
import { useT } from "@/i18n/client";
import { DRYER_FIELDS, PRINTER_FIELDS, TRISTATE_OPTIONS, equipmentLabelKey, type DryerProfile, type EquipFieldDef, type Equipment, type EquipmentKind, type PrinterProfile } from "@/lib/equipment";

const INITIAL: EquipmentFormState = { ok: false, errors: [] };

/** A mentett érték űrlap-szöveggé (tristate: yes / no / üres). */
function initial(v: unknown, f: EquipFieldDef): string {
  if (v === null || v === undefined) return "";
  if (f.type === "tristate") return v === true ? "yes" : v === false ? "no" : "";
  return String(v);
}

/** A két felszerelés-űrlap (nyomtató, szárító): a mezők a PRINTER_FIELDS / DRYER_FIELDS leírásból épülnek, a validáció a szerveren fut. */
export function EquipmentForms({ equipment }: { equipment: Equipment }) {
  // törlés után (a mentett profil eltűnik) az űrlap üresen újraindul: a `ver` a `key`-ben újrakezdi; mentéskor nem indul újra, így a „Elmentve” üzenet látszik
  const [seen, setSeen] = useState({ p: equipment.printer !== null, d: equipment.dryer !== null, pv: 0, dv: 0 });
  const p = equipment.printer !== null;
  const d = equipment.dryer !== null;
  if (seen.p !== p || seen.d !== d) setSeen({ p, d, pv: seen.pv + (seen.p && !p ? 1 : 0), dv: seen.dv + (seen.d && !d ? 1 : 0) });
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <KindForm key={`p-${seen.pv}`} kind="printer" fields={PRINTER_FIELDS} saved={equipment.printer} save={savePrinterAction} clear={clearPrinterAction} />
      <KindForm key={`d-${seen.dv}`} kind="dryer" fields={DRYER_FIELDS} saved={equipment.dryer} save={saveDryerAction} clear={clearDryerAction} />
    </div>
  );
}

function KindForm({ kind, fields, saved, save, clear }: {
  kind: EquipmentKind;
  fields: readonly EquipFieldDef[];
  saved: PrinterProfile | DryerProfile | null;
  save: (prev: EquipmentFormState, fd: FormData) => Promise<EquipmentFormState>;
  clear: () => Promise<void>;
}) {
  const t = useT();
  const [state, action, pending] = useActionState(save, INITIAL);
  const rec = (saved ?? {}) as unknown as Record<string, unknown>;
  const value = (f: EquipFieldDef) => state.values?.[f.key] ?? initial(rec[f.key], f);
  const id = (k: string) => `eq-${kind}-${k}`;

  return (
    <form action={action} className="card space-y-4" aria-busy={pending}>
      <h2 className="text-lg font-semibold tracking-tight">{t(`equipment.${kind}.title`)}</h2>
      {state.errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <p className="font-medium">{t("equipment.errors")}</p>
          <ul className="mt-1 list-inside list-disc">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      {state.ok && <p role="status" className="rounded-xl border border-ok/35 bg-ok/10 px-4 py-3 text-sm text-ok">{t("equipment.saved")}</p>}
      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.key === "name" || f.key === "buildVolume" ? "sm:col-span-2" : ""}>
            <label htmlFor={id(f.key)} className="label">{t(equipmentLabelKey(kind, f.key))}{f.unit ? <span className="text-faint"> ({f.unit})</span> : null}</label>
            {f.type === "tristate" ? (
              <select id={id(f.key)} name={f.key} className="input" defaultValue={value(f)} aria-describedby={id(`${f.key}-help`)}>
                {TRISTATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
              </select>
            ) : (
              <input id={id(f.key)} name={f.key} className="input" defaultValue={value(f)} autoComplete="off" aria-describedby={id(`${f.key}-help`)}
                inputMode={f.type === "number" ? "decimal" : f.type === "int" ? "numeric" : "text"} />
            )}
            <p id={id(`${f.key}-help`)} className="mt-1 text-xs leading-relaxed text-faint">{t(`equipment.help.${kind}.${f.key}`)}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-faint">{t("equipment.blankHint")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>{t("equipment.save")}</button>
        {saved && <button type="submit" formAction={clear} formNoValidate className="btn btn-ghost" disabled={pending}>{t("equipment.clear")}</button>}
        {state.ok && <Link href="/tuttirial" className="link ml-auto text-sm">{t("equipment.openTuttirial")}</Link>}
      </div>
    </form>
  );
}
