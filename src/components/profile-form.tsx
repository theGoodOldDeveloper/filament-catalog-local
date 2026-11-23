"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveProfileAction, type FormState } from "@/app/actions";
import { useT } from "@/i18n/client";
import { rich } from "@/i18n/rich";
import { FIELDS, FIELD_GROUPS, ORIGINS, SPEC_PRESETS, familyLabel, fieldHintKey, fieldLabelKey, groupLabelKey, originKey, type FieldDef } from "@/lib/fields";

export interface SpecRow { key: string; label: string; value: string; unit: string; testMethod: string; origin: string }

interface Props {
  id?: number;
  initial: Record<string, string>;
  origins: Record<string, string>;
  specs: SpecRow[];
}

const OPEN_BY_DEFAULT = new Set(["identity", "color", "physical", "print", "drying"]);

export function ProfileForm({ id, initial, origins, specs: initialSpecs }: Props) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfileAction, { errors: [] });
  const [specs, setSpecs] = useState<SpecRow[]>(initialSpecs);
  const [hex, setHex] = useState(initial.colorHex ?? "");
  const val = (k: string) => state.values?.[`f.${k}`] ?? initial[k] ?? "";
  const org = (k: string) => state.values?.[`o.${k}`] ?? origins[k] ?? "";
  const setSpec = (i: number, patch: Partial<SpecRow>) => setSpecs((s) => s.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <form action={action} className="space-y-4" key={state.values ? JSON.stringify(state.errors) : "fresh"}>
      {id && <input type="hidden" name="id" value={id} />}
      <input type="hidden" name="specs" value={JSON.stringify(specs.filter((s) => s.key.trim() && s.value.trim()).map((s) => ({ key: s.key.trim(), label: s.label.trim() || s.key.trim(), value: s.value.trim(), unit: s.unit || null, testMethod: s.testMethod || null, origin: s.origin || null })))} />

      {state.errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <p className="font-medium">{t("profile.form.error")}</p>
          <ul className="mt-1 list-inside list-disc">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <p className="rounded-xl border border-line bg-surface/60 px-4 py-3 text-xs leading-relaxed text-muted">
        {rich(t("profile.form.originNote"), [(c) => <strong className="text-fg">{c}</strong>])}
      </p>

      {FIELD_GROUPS.map((g) => {
        const fields = FIELDS.filter((f) => f.group === g.key);
        const filled = fields.filter((f) => val(f.key) !== "").length;
        return (
          <details key={g.key} className="card !p-0" open={OPEN_BY_DEFAULT.has(g.key) || filled > 0}>
            <summary className="flex items-center justify-between gap-3 px-5 py-4">
              <span className="flex items-center gap-2 text-base font-semibold tracking-tight"><span className="chev text-faint">▸</span>{t(groupLabelKey(g.key))}</span>
              <span className="text-xs text-faint">{t("profile.form.filled", { filled, total: fields.length })}</span>
            </summary>
            <div className="grid gap-x-4 gap-y-4 border-t border-line px-5 py-5 sm:grid-cols-2 xl:grid-cols-3">
              {fields.map((f) => (
                <FieldInput key={f.key} f={f} value={val(f.key)} origin={org(f.key)} hex={f.type === "color" ? hex : undefined} onHex={f.type === "color" ? setHex : undefined} />
              ))}
            </div>
          </details>
        );
      })}

      <details className="card !p-0" open={specs.length > 0}>
        <summary className="flex items-center justify-between gap-3 px-5 py-4">
          <span className="flex items-center gap-2 text-base font-semibold tracking-tight"><span className="chev text-faint">▸</span>{t("profile.form.specsTitle")}</span>
          <span className="text-xs text-faint">{t("common.rows", { count: specs.length })}</span>
        </summary>
        <div className="space-y-3 border-t border-line px-5 py-5">
          {specs.map((s, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-line bg-bg/40 p-3 sm:grid-cols-12">
              <label className="sm:col-span-3"><span className="label">{t("profile.form.specLabel")}</span>
                <input className="input" list="spec-presets" value={s.label} aria-label={t("profile.form.specLabelAria")}
                  onChange={(e) => {
                    const preset = SPEC_PRESETS.find((p) => p.label === e.target.value);
                    setSpec(i, preset ? { label: preset.label, key: preset.key, unit: s.unit || preset.unit } : { label: e.target.value, key: s.key && !SPEC_PRESETS.some((p) => p.key === s.key) ? s.key : slug(e.target.value) });
                  }} />
              </label>
              <label className="sm:col-span-2"><span className="label">{t("specs.col.value")}</span><input className="input" value={s.value} onChange={(e) => setSpec(i, { value: e.target.value })} /></label>
              <label className="sm:col-span-2"><span className="label">{t("profile.form.specUnit")}</span><input className="input" value={s.unit} onChange={(e) => setSpec(i, { unit: e.target.value })} placeholder="MPa, °C…" /></label>
              <label className="sm:col-span-2"><span className="label">{t("specs.col.method")}</span><input className="input" value={s.testMethod} onChange={(e) => setSpec(i, { testMethod: e.target.value })} placeholder="ISO 527…" /></label>
              <label className="sm:col-span-2"><span className="label">{t("specs.col.origin")}</span>
                <select className="input" value={s.origin} onChange={(e) => setSpec(i, { origin: e.target.value })}>
                  <option value="">{t("profile.form.originNone")}</option>
                  {ORIGINS.map((o) => <option key={o} value={o}>{t(originKey(o))}</option>)}
                </select>
              </label>
              <div className="flex items-end sm:col-span-1"><button type="button" className="btn btn-ghost btn-sm w-full" onClick={() => setSpecs((x) => x.filter((_, j) => j !== i))} aria-label={t("profile.form.rowDeleteAria", { label: s.label || t("profile.form.row") })}>✕</button></div>
            </div>
          ))}
          <datalist id="spec-presets">{SPEC_PRESETS.map((p) => <option key={p.key} value={p.label} />)}</datalist>
          <button type="button" className="btn btn-sm" onClick={() => setSpecs((s) => [...s, { key: "", label: "", value: "", unit: "", testMethod: "", origin: "" }])}>{t("profile.form.addSpec")}</button>
        </div>
      </details>

      <div className="sticky bottom-3 z-20 flex items-center justify-end gap-2 rounded-xl border border-line-strong bg-raised/95 px-4 py-3 shadow-2xl backdrop-blur">
        <Link href={id ? `/filaments/${id}` : "/catalog"} className="btn btn-ghost">{t("common.cancel")}</Link>
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? t("common.saving") : id ? t("profile.form.saveChanges") : t("profile.form.create")}</button>
      </div>
    </form>
  );
}

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);

function FieldInput({ f, value, origin, hex, onHex }: { f: FieldDef; value: string; origin: string; hex?: string; onHex?: (v: string) => void }) {
  const t = useT();
  const label = t(fieldLabelKey(f.key));
  const name = `f.${f.key}`;
  const wide = f.type === "textarea";
  const common = { id: name, name, defaultValue: value, required: f.required, "aria-describedby": f.hint ? `${name}-hint` : undefined };
  return (
    <div className={wide ? "sm:col-span-2 xl:col-span-3" : ""}>
      <div className="label">
        <label htmlFor={name}>{label}{f.unit && <span className="ml-1 font-normal text-faint">({f.unit})</span>}{f.required && <span className="ml-0.5 text-accent" aria-hidden="true">*</span>}</label>
        <select name={`o.${f.key}`} defaultValue={origin} aria-label={t("profile.form.originAria", { label })} className={`max-w-[8.5rem] cursor-pointer rounded border bg-transparent px-1 py-0.5 text-[10.5px] ${origin === "estimate" ? "border-dashed border-warn/60 text-warn" : "border-line text-faint"} hover:text-fg`}>
          <option value="">{t("profile.form.originPick")}</option>
          {ORIGINS.map((o) => <option key={o} value={o}>{t(originKey(o))}</option>)}
        </select>
      </div>
      {f.type === "textarea" ? (
        <textarea {...common} className="input" rows={3} />
      ) : f.type === "select" ? (
        <select {...common} className="input"><option value="">{t("common.choose")}</option>{f.options!.map((o) => <option key={o} value={o}>{f.key === "materialFamily" ? familyLabel(t, o) : o}</option>)}</select>
      ) : f.type === "tristate" ? (
        <select {...common} className="input"><option value="">{t("common.unknown")}</option><option value="yes">{t("common.yes")}</option><option value="no">{t("common.no")}</option></select>
      ) : f.type === "color" ? (
        <div className="flex gap-2">
          <input type="color" aria-label={t("profile.form.colorPicker")} value={/^#[0-9a-fA-F]{6}$/.test(hex ?? "") ? hex : "#888888"} onChange={(e) => onHex?.(e.target.value)} className="h-[38px] w-12 cursor-pointer rounded-lg border border-line-strong bg-bg p-1" />
          <input id={name} name={name} value={hex} onChange={(e) => onHex?.(e.target.value)} placeholder="#RRGGBB" pattern="#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})" className="input mono" />
        </div>
      ) : (
        <input {...common} className="input" type={f.type === "url" ? "url" : "text"} inputMode={f.type === "number" ? "decimal" : undefined} placeholder={f.type === "url" ? "https://…" : undefined} />
      )}
      {f.hint && <p id={`${name}-hint`} className="mt-1 text-[11px] text-faint">{t(fieldHintKey(f.key))}</p>}
    </div>
  );
}
