"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useT } from "@/i18n/client";

export interface CompareProfile { id: number; label: string; sub: string; hex: string | null; family: string; search: string }
export interface CompareRow { key: string; label: string; unit: string; group: string; values: Record<number, { text: string; estimate: boolean; origin: string | null } | null> }

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function CompareView({ all, selected, rows }: { all: CompareProfile[]; selected: number[]; rows: CompareRow[] }) {
  const t = useT();
  const router = useRouter();
  const [pick, setPick] = useState("");
  const [rowQ, setRowQ] = useState("");
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(true);
  const cols = selected.map((id) => all.find((p) => p.id === id)).filter((p): p is CompareProfile => !!p);
  const go = (ids: number[]) => router.replace(ids.length ? `/compare?ids=${ids.join(",")}` : "/compare", { scroll: false });
  const toggle = (id: number) => go(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id].slice(0, 6));

  const candidates = useMemo(() => {
    const q = fold(pick).split(/\s+/).filter(Boolean);
    return all.filter((p) => q.every((tok) => p.search.includes(tok))).slice(0, 60);
  }, [all, pick]);

  const visible = useMemo(() => {
    const q = fold(rowQ).split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      if (q.length && !q.every((tok) => fold(`${r.label} ${r.key} ${r.unit} ${r.group} ${cols.map((c) => r.values[c.id]?.text ?? "").join(" ")}`).includes(tok))) return false;
      const vals = cols.map((c) => r.values[c.id]?.text ?? null);
      if (hideEmpty && vals.every((v) => v === null)) return false;
      if (onlyDiff && new Set(vals).size <= 1) return false;
      return true;
    });
  }, [rows, rowQ, onlyDiff, hideEmpty, cols]);

  return (
    <div className="space-y-5">
      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{t("compare.pick.title")} <span className="ml-2 text-sm font-normal text-muted">{cols.length} / 6</span></h2>
          <input type="search" value={pick} onChange={(e) => setPick(e.target.value)} placeholder={t("compare.pick.placeholder")} aria-label={t("compare.pick.aria")} className="input max-w-sm !py-1.5" />
        </div>
        <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
          {candidates.map((p) => {
            const on = selected.includes(p.id);
            return (
              <button key={p.id} type="button" onClick={() => toggle(p.id)} aria-pressed={on} className={`chip ${on ? "chip-on" : ""}`}>
                <span className="h-3 w-3 rounded-full border border-white/20" style={{ background: p.hex ?? "#333" }} />
                {p.label} <span className="text-faint">· {p.sub}</span>
              </button>
            );
          })}
          {candidates.length === 0 && <p className="text-sm text-faint">{t("compare.pick.none")}</p>}
        </div>
      </section>

      {cols.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center text-sm text-muted">{t("compare.empty")}</div>
      ) : (
        <section className="card !p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
            <input type="search" value={rowQ} onChange={(e) => setRowQ(e.target.value)} placeholder={t("compare.rowSearch.placeholder")} aria-label={t("compare.rowSearch.aria")} className="input max-w-md !py-1.5" />
            <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" /> {t("compare.onlyDiff")}</label>
            <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" /> {t("compare.hideEmpty")}</label>
            <span className="ml-auto text-xs text-faint">{t("common.rows", { count: visible.length })}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="min-w-44">{t("compare.col.param")}</th>
                  {cols.map((c) => (
                    <th key={c.id} className="min-w-44 !normal-case !tracking-normal">
                      <Link href={`/filaments/${c.id}`} className="flex items-center gap-2 text-sm font-semibold text-fg hover:text-accent-soft">
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/20" style={{ background: c.hex ?? "#333" }} />{c.label}
                      </Link>
                      <span className="block text-[11px] font-normal text-muted">{c.sub}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r, idx) => {
                  const vals = cols.map((c) => r.values[c.id]?.text ?? null);
                  const differs = cols.length > 1 && new Set(vals).size > 1;
                  const head = idx === 0 || visible[idx - 1].group !== r.group;
                  return [
                    head && <tr key={`g-${r.group}`}><td colSpan={cols.length + 1} className="!bg-raised/50 !py-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">{r.group}</td></tr>,
                    <tr key={r.key}>
                      <td className="text-muted">{r.label}{r.unit && <span className="ml-1 text-faint">({r.unit})</span>}</td>
                      {cols.map((c) => {
                        const v = r.values[c.id];
                        return (
                          <td key={c.id} className={`tabular-nums ${differs && v ? "font-medium text-accent-soft" : ""}`}>
                            {v ? <>{v.estimate ? "≈ " : ""}{v.text}{v.estimate && <span className="badge badge-estimate ml-1.5 !px-1.5 !text-[10px] !leading-4">{t("common.estimate")}</span>}</> : <span className="text-faint">—</span>}
                          </td>
                        );
                      })}
                    </tr>,
                  ];
                })}
                {visible.length === 0 && <tr><td colSpan={cols.length + 1} className="py-8 text-center text-muted">{t("compare.noRows")}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
