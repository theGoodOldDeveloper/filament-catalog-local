"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TUTTIRIAL, requirementsOf, type GroupId, type TutEntry } from "@/data/tuttirial";
import { localizeTuttirial, type LocalizedTuttirial } from "@/data/tuttirial-i18n";
import { useLocale, useT } from "@/i18n/client";
import { rich } from "@/i18n/rich";
import type { Equipment } from "@/lib/equipment";
import { FIT_ORDER, chamberKind, computeFit, type Fit, type FitResult } from "@/lib/fit";

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const FIT_CLS: Record<Fit, string> = { ideal: "badge-ok", ok: "badge-teal", limit: "badge-warn", no: "badge-danger" };
const FIT_DOT: Record<Fit, string> = { ideal: "bg-ok", ok: "bg-teal", limit: "bg-warn", no: "bg-danger" };
/** a címke nélküli (nincs felszerelés) bejegyzések a rendezés végére kerülnek */
const fitRank = (x: Fit | null) => (x === null ? FIT_ORDER.length : FIT_ORDER.indexOf(x));
const ALL_TAGS = [...new Set(TUTTIRIAL.flatMap((e) => e.tags))];
const range = (r: [number, number], unit: string) => (r[1] === 0 ? "—" : r[0] === r[1] ? `${r[0]} ${unit}` : `${r[0]}–${r[1]} ${unit}`);

/** Rendezési módok; a címke: tut.sort.<kulcs> */
const SORT_KEYS = ["group", "name", "fit", "ease", "strength", "heat", "flex", "nozzle", "dry"] as const;
type SortKey = (typeof SORT_KEYS)[number];

interface Filters { q: string; group: "" | GroupId; sub: string; fit: "" | Fit | "printable"; hardened: "" | "yes" | "no"; chamber: "" | "none" | "heated"; maxNozzle: number; maxDry: number; tags: string[]; stock: boolean; sort: SortKey; view: "cards" | "table" }
const DEFAULTS: Filters = { q: "", group: "", sub: "", fit: "", hardened: "", chamber: "", maxNozzle: 420, maxDry: 85, tags: [], stock: false, sort: "group", view: "cards" };

export function TuttirialView({ initialQ, stock, equipment }: { initialQ: string; stock: Record<string, number>; equipment: Equipment }) {
  const t = useT();
  const locale = useLocale();
  // a szöveg a választott nyelven (angol overlay + magyar tartalék); `sub` és `tags` a magyar azonosító marad
  const L = useMemo(() => localizeTuttirial(locale), [locale]);
  const hay = useMemo(() => new Map(L.entries.map((e) => [e.id, fold([e.name, e.aliases.join(" "), e.sub, L.sub(e.sub), e.family, e.summary, e.uses.join(" "), e.props.join(" "), e.cons.join(" "), e.tags.join(" "), e.tags.map(L.tag).join(" "), e.printTips, e.dryTips, e.plate, L.groups.find((g) => g.id === e.group)!.label].join(" "))])), [L]);
  // az illeszkedés SZÁMÍTOTT: a bejegyzés követelményei × a felhasználó felszerelése
  const fits = useMemo(() => new Map(TUTTIRIAL.map((e) => [e.id, computeFit(requirementsOf(e), equipment)])), [equipment]);
  const hasFit = equipment.printer !== null;
  const tags = useMemo(() => [...ALL_TAGS].sort((a, b) => L.tag(a).localeCompare(L.tag(b), locale)), [L, locale]);
  const [f, setF] = useState<Filters>({ ...DEFAULTS, q: initialQ });
  const [open, setOpen] = useState<string | null>(null);
  const set = (patch: Partial<Filters>) => setF((x) => ({ ...x, ...patch }));

  // a nézet és a rendezés megjegyzése (csak kényelmi beállítás)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tuttirial-prefs") ?? "{}") as Partial<Filters>;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setF((x) => ({ ...x, view: saved.view === "table" ? "table" : "cards", sort: saved.sort && SORT_KEYS.includes(saved.sort) ? saved.sort : x.sort }));
    } catch { /* nincs mentett beállítás */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("tuttirial-prefs", JSON.stringify({ view: f.view, sort: f.sort })); } catch { /* privát mód */ }
  }, [f.view, f.sort]);

  const subs = useMemo(() => [...new Set(TUTTIRIAL.filter((e) => !f.group || e.group === f.group).map((e) => e.sub))], [f.group]);

  const list = useMemo(() => {
    const tokens = fold(f.q).split(/\s+/).filter(Boolean);
    const out = L.entries.filter((e) => {
      const fit = fits.get(e.id)!.fit;
      if (tokens.length && !tokens.every((tok) => hay.get(e.id)!.includes(tok))) return false;
      if (f.group && e.group !== f.group) return false;
      if (f.sub && e.sub !== f.sub) return false;
      if (f.fit === "printable" ? fit === "no" : f.fit && fit !== f.fit) return false;
      if (f.hardened === "yes" && !e.hardened) return false;
      if (f.hardened === "no" && e.hardened) return false;
      if (f.chamber === "none" && !(e.chamberMode === "open" || e.chamberMode === "off")) return false;
      if (f.chamber === "heated" && !(e.chamberMode === "recommended" || e.chamberMode === "required")) return false;
      if (e.nozzle[0] > f.maxNozzle) return false;
      if (e.dry[0] > f.maxDry) return false;
      if (f.tags.length && !f.tags.every((x) => e.tags.includes(x))) return false;
      if (f.stock && !(stock[e.family] > 0)) return false;
      return true;
    });
    const by: Record<SortKey, (a: TutEntry, b: TutEntry) => number> = {
      group: () => 0,
      name: (a, b) => a.name.localeCompare(b.name, locale),
      fit: (a, b) => fitRank(fits.get(a.id)!.fit) - fitRank(fits.get(b.id)!.fit) || b.r[0] - a.r[0],
      ease: (a, b) => b.r[0] - a.r[0], strength: (a, b) => b.r[1] - a.r[1], heat: (a, b) => b.r[2] - a.r[2], flex: (a, b) => b.r[3] - a.r[3],
      nozzle: (a, b) => a.nozzle[0] - b.nozzle[0], dry: (a, b) => a.dry[0] - b.dry[0] || a.dry[1] - b.dry[1],
    };
    return f.sort === "group" ? out : [...out].sort(by[f.sort]);
  }, [f, stock, L, hay, fits, locale]);

  const active = (Object.keys(DEFAULTS) as (keyof Filters)[]).filter((k) => !["sort", "view"].includes(k) && JSON.stringify(f[k]) !== JSON.stringify(DEFAULTS[k])).length;
  const grouped = f.sort === "group";

  return (
    <div className="space-y-5">
      {!hasFit && (
        <div role="status" className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm leading-relaxed">
          {rich(t("tut.equipment.banner"), [(c) => <Link className="link font-semibold" href="/equipment">{c}</Link>])}
        </div>
      )}
      <EquipmentCards equipment={equipment} />

      <details className="card !p-0">
        <summary className="flex items-center gap-2 px-5 py-3.5 text-sm font-semibold"><span className="chev text-faint">▸</span> {t("tut.rules.title")}</summary>
        <div className="grid gap-3 border-t border-line p-5 sm:grid-cols-2">
          {L.rules.map((r) => <div key={r.title} className="rounded-xl border border-line bg-bg/40 p-3.5"><h3 className="text-sm font-semibold text-accent-soft">{r.title}</h3><p className="mt-1 text-sm leading-relaxed text-muted">{r.text}</p></div>)}
        </div>
      </details>

      <section className="card !p-4" aria-label={t("tut.filters.aria")}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="min-w-60 flex-1">
            <span className="sr-only">{t("tut.search.label")}</span>
            <input type="search" value={f.q} onChange={(e) => set({ q: e.target.value })} autoFocus={!!initialQ} placeholder={t("tut.search.placeholder")} className="input" />
          </label>
          <select value={f.sort} onChange={(e) => set({ sort: e.target.value as SortKey })} className="input !w-auto" aria-label={t("tut.sort.aria")}>
            {SORT_KEYS.map((k) => <option key={k} value={k}>{t(`tut.sort.${k}`)}</option>)}
          </select>
          <div className="flex rounded-lg border border-line-strong p-0.5" role="group" aria-label={t("catalog.view.aria")}>
            {(["cards", "table"] as const).map((v) => <button key={v} type="button" onClick={() => set({ view: v })} aria-pressed={f.view === v} className={`rounded-md px-3 py-1 text-xs font-medium transition ${f.view === v ? "bg-accent text-[#1a0f05]" : "text-muted hover:text-fg"}`}>{v === "cards" ? t("catalog.view.cards") : t("catalog.view.table")}</button>)}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={t("tut.group.aria")}>
          <button type="button" onClick={() => set({ group: "", sub: "" })} aria-pressed={!f.group} className={`chip ${!f.group ? "chip-on" : ""}`}>{t("tut.group.all")}</button>
          {L.groups.map((g) => (
            <button key={g.id} type="button" onClick={() => set({ group: f.group === g.id ? "" : g.id, sub: "" })} aria-pressed={f.group === g.id} className={`chip ${f.group === g.id ? "chip-on" : ""}`}>
              <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />{g.label} <span className="text-faint">({TUTTIRIAL.filter((e) => e.group === g.id).length})</span>
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={t("tut.sub.aria")}>
          {subs.map((s) => <button key={s} type="button" onClick={() => set({ sub: f.sub === s ? "" : s })} aria-pressed={f.sub === s} className={`chip !py-0.5 !text-[11px] ${f.sub === s ? "chip-on" : ""}`}>{L.sub(s)}</button>)}
        </div>

        <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-5">
          <label><span className="label">{t("tut.filter.fit")}</span>
            <select value={f.fit} onChange={(e) => set({ fit: e.target.value as Filters["fit"] })} className="input" disabled={!hasFit}>
              <option value="">{t("common.all")}</option><option value="printable">{t("tut.filter.printable")}</option>
              {FIT_ORDER.map((k) => <option key={k} value={k}>{t(`fit.label.${k}`)}</option>)}
            </select>
          </label>
          <label><span className="label">{t("tut.col.nozzle")}</span>
            <select value={f.hardened} onChange={(e) => set({ hardened: e.target.value as Filters["hardened"] })} className="input"><option value="">{t("common.any")}</option><option value="no">{t("tut.filter.nozzlePlain")}</option><option value="yes">{t("tut.filter.nozzleHardened")}</option></select>
          </label>
          <label><span className="label">{t("tut.col.chamber")}</span>
            <select value={f.chamber} onChange={(e) => set({ chamber: e.target.value as Filters["chamber"] })} className="input"><option value="">{t("common.any")}</option><option value="none">{t("tut.filter.chamberNone")}</option><option value="heated">{t("tut.filter.chamberHeated")}</option></select>
          </label>
          <label><span className="label">{t("tut.filter.maxNozzle")} <output className="tabular-nums text-fg">{f.maxNozzle >= 420 ? t("tut.filter.anyTemp") : `${f.maxNozzle} °C`}</output></span>
            <input type="range" min={200} max={420} step={10} value={f.maxNozzle} onChange={(e) => set({ maxNozzle: Number(e.target.value) })} className="w-full accent-[var(--color-accent)]" />
          </label>
          <label><span className="label">{t("catalog.filter.dryMax")} <output className="tabular-nums text-fg">{f.maxDry} °C</output></span>
            <input type="range" min={45} max={85} step={5} value={f.maxDry} onChange={(e) => set({ maxDry: Number(e.target.value) })} className="w-full accent-[var(--color-accent)]" />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label={t("tut.tags.aria")}>
          <span className="mr-1 text-xs text-faint">{t("tut.tags.label")}</span>
          {tags.map((tag) => {
            const on = f.tags.includes(tag);
            return <button key={tag} type="button" aria-pressed={on} onClick={() => set({ tags: on ? f.tags.filter((x) => x !== tag) : [...f.tags, tag] })} className={`chip !py-0.5 !text-[11px] ${on ? "chip-on" : ""}`}>{L.tag(tag)}</button>;
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2 text-muted"><input type="checkbox" checked={f.stock} onChange={(e) => set({ stock: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" /> {t("tut.filter.onlyStock")}</label>
          {active > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setF((x) => ({ ...DEFAULTS, sort: x.sort, view: x.view }))}>{t("catalog.filter.clear", { count: active })}</button>}
          <span className="ml-auto text-faint" aria-live="polite">{t("tut.count", { shown: list.length, total: TUTTIRIAL.length })}</span>
        </div>
      </section>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center"><p className="font-medium">{t("tut.empty.title")}</p><p className="mt-1 text-sm text-muted">{t("tut.empty.hint")}</p></div>
      ) : f.view === "table" ? (
        <div className="card overflow-x-auto !p-0">
          <table className="tbl min-w-[1100px]">
            <thead><tr><th>{t("tut.col.filament")}</th><th>{t("tut.col.group")}</th><th>{t("tut.col.fit")}</th><th>{t("tut.col.nozzle")}</th><th>{t("tut.col.bed")}</th><th>{t("tut.col.chamber")}</th><th>{t("tut.col.fan")}</th><th>{t("tut.col.drying")}</th><th>{t("tut.col.nozzleType")}</th><th>{t("tut.col.heat")}</th><th>{t("tut.col.stock")}</th></tr></thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} className="cursor-pointer" onClick={() => { set({ view: "cards", q: e.name }); setOpen(e.id); }}>
                  <td><span className="font-medium">{e.name}</span><span className="block text-xs text-faint">{e.aliases.slice(0, 2).join(", ")}</span></td>
                  <td className="text-xs text-muted">{L.sub(e.sub)}</td>
                  <td>{fits.get(e.id)!.fit ? <FitBadge fit={fits.get(e.id)!.fit} /> : <span className="text-faint">—</span>}</td>
                  <td className="tabular-nums">{range(e.nozzle, "°C")}</td>
                  <td className="tabular-nums">{range(e.bed, "°C")}</td>
                  <td className="tabular-nums text-xs">{e.chamber && e.chamber[1] > 0 ? range([Math.min(e.chamber[0] || e.chamber[1], 999), e.chamber[1]], "°C") : e.chamberMode === "open" ? t("tut.chamber.offOpen") : t("tut.chamber.off")}</td>
                  <td className="tabular-nums">{range(e.fan, "%")}</td>
                  <td className="tabular-nums">{e.dry[2] ? `${e.dry[0]} °C · ${e.dry[1]}–${e.dry[2]} h` : "—"}</td>
                  <td>{e.hardened ? <span className="badge badge-danger">{t("tut.nozzle.hardened")}</span> : <span className="text-faint">{t("tut.nozzle.plain")}</span>}</td>
                  <td className="text-xs tabular-nums text-muted">{e.hdt}</td>
                  <td>{stock[e.family] ? <span className="badge badge-ok">{t("common.spools", { count: stock[e.family] })}</span> : <span className="text-faint">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-8">
          {(grouped ? L.groups.filter((g) => list.some((e) => e.group === g.id)) : [null]).map((g) => {
            const items = g ? list.filter((e) => e.group === g.id) : list;
            const subsHere = g ? [...new Set(items.map((e) => e.sub))] : [null];
            return (
              <section key={g?.id ?? "all"} aria-label={g?.label ?? t("tut.results.aria")}>
                {g && (
                  <header className="mb-4 flex items-start gap-3">
                    <span className="mt-1.5 h-8 w-1.5 shrink-0 rounded-full" style={{ background: g.color }} />
                    <div><h2 className="text-xl font-semibold tracking-tight">{g.label}</h2><p className="text-sm text-muted">{g.blurb}</p></div>
                  </header>
                )}
                {subsHere.map((s) => (
                  <div key={s ?? "x"} className="mb-6">
                    {s && <h3 className="h-eyebrow mb-3">{L.sub(s)}</h3>}
                    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {(s ? items.filter((e) => e.sub === s) : items).map((e) => <EntryCard key={e.id} e={e} open={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} stock={stock[e.family] ?? 0} color={L.groups.find((x) => x.id === e.group)!.color} fit={fits.get(e.id)!} L={L} />)}
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}

      <p className="rounded-xl border border-line bg-surface/60 px-4 py-3 text-xs leading-relaxed text-muted">
        <strong className="text-fg">{t("tut.disclaimer.lead")}</strong> {t("tut.disclaimer.body")}
      </p>
    </div>
  );
}

function Dots({ n, label }: { n: number; label: string }) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]" title={t("tut.dots.title", { label, n })}>
      <span className="text-faint">{label}</span>
      <span className="flex gap-0.5" role="img" aria-label={t("tut.dots.aria", { label, n })}>{[1, 2, 3, 4, 5].map((i) => <span key={i} className={`h-1.5 w-3.5 rounded-full ${i <= n ? "bg-accent" : "bg-line"}`} />)}</span>
    </div>
  );
}

function EntryCard({ e, open, onToggle, stock, color, fit, L }: { e: TutEntry; open: boolean; onToggle: () => void; stock: number; color: string; fit: FitResult; L: LocalizedTuttirial }) {
  const t = useT();
  const chamberOff = t("tut.chamber.off");
  const chamberTxt = e.chamber && e.chamber[1] > 0 && e.chamberMode !== "open" && e.chamberMode !== "off" ? (e.chamber[0] ? `${e.chamber[0]}–${e.chamber[1]} °C` : t("tut.chamber.max", { value: e.chamber[1] })) : chamberOff;
  return (
    <article id={e.id} className={`card relative flex flex-col overflow-hidden !p-0 animate-rise ${fit.fit === "no" ? "opacity-75" : ""} ${open ? "md:col-span-2 2xl:col-span-3 border-accent/40" : ""}`}>
      <span className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <button type="button" onClick={onToggle} aria-expanded={open} className="block w-full p-4 pb-3 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-base font-semibold tracking-tight">{e.name}</h4>
            {e.aliases.length > 0 && <p className="truncate text-[11px] text-faint">{e.aliases.join(" · ")}</p>}
          </div>
          <FitBadge fit={fit.fit} />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">{e.summary}</p>
      </button>

      <dl className="grid grid-cols-4 gap-px border-y border-line bg-line text-center text-xs">
        {[[t("tut.col.nozzle"), range(e.nozzle, "°C")], [t("tut.col.bed"), range(e.bed, "°C")], [t("tut.col.chamber"), chamberTxt], [t("tut.col.drying"), e.dry[2] ? `${e.dry[0]} °C · ${e.dry[1]}–${e.dry[2]} h` : "—"]].map(([k, v]) => (
          <div key={k} className="bg-surface px-1.5 py-2"><dt className="text-[10px] uppercase tracking-wider text-faint">{k}</dt><dd className="mt-0.5 font-semibold tabular-nums">{v}</dd></div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-1.5 px-4 py-3">
        {e.hardened && <span className="badge badge-danger">{t("tut.card.hardened")}</span>}
        <span className={`badge ${e.chamberMode === "required" || e.chamberMode === "recommended" ? "badge-accent" : ""}`}>{L.chamberLabel[e.chamberMode]}</span>
        {stock > 0 && <Link href={`/catalog?family=${encodeURIComponent(e.family)}&status=instock`} className="badge badge-ok hover:underline">{t("tut.card.inStock", { count: stock, family: e.family })}</Link>}
        <button type="button" onClick={onToggle} className="ml-auto text-xs font-medium text-accent-soft hover:underline">{open ? t("tut.card.close") : t("tut.card.details")}</button>
      </div>

      {open && (
        <div className="grid gap-5 border-t border-line p-4 animate-fade lg:grid-cols-3">
          <div>
            <h5 className="h-eyebrow mb-2">{t("field.useCases")}</h5>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted marker:text-accent">{e.uses.map((u) => <li key={u}>{u}</li>)}</ul>
            <h5 className="h-eyebrow mb-2 mt-4">{t("fieldgroup.properties")}</h5>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted marker:text-ok">{e.props.map((u) => <li key={u}>{u}</li>)}</ul>
            <h5 className="h-eyebrow mb-2 mt-4">{t("tut.card.cons")}</h5>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted marker:text-danger">{e.cons.map((u) => <li key={u}>{u}</li>)}</ul>
          </div>
          <div>
            <h5 className="h-eyebrow mb-2">{t("tut.card.params")}</h5>
            <dl className="kv !grid-cols-[8.5rem_minmax(0,1fr)] text-[13px]">
              <dt>{t("tut.param.nozzleTemp")}</dt><dd className="tabular-nums">{range(e.nozzle, "°C")}</dd>
              <dt>{t("tut.param.bedTemp")}</dt><dd className="tabular-nums">{range(e.bed, "°C")}</dd>
              <dt>{t("tut.col.chamber")}</dt><dd>{L.chamberLabel[e.chamberMode]}{chamberTxt !== chamberOff ? ` (${chamberTxt})` : ""}</dd>
              <dt>{t("tut.param.fan")}</dt><dd className="tabular-nums">{range(e.fan, "%")}</dd>
              <dt>{t("tut.param.speed")}</dt><dd>{e.speed}</dd>
              <dt>{t("tut.col.nozzle")}</dt><dd>{e.nozzleDia}</dd>
              <dt>{t("tut.param.plate")}</dt><dd>{e.plate}</dd>
              <dt>{t("tut.param.hdt")}</dt><dd>{e.hdt}</dd>
              <dt>{t("tut.col.drying")}</dt><dd className="tabular-nums">{e.dry[2] ? t("tut.param.dryValue", { temp: e.dry[0], min: e.dry[1], max: e.dry[2] }) : t("tut.param.dryNone")}</dd>
            </dl>
            <div className="mt-4 space-y-1.5">{L.ratingLabels.map((l, i) => <Dots key={l} label={l} n={e.r[i]} />)}</div>
          </div>
          <div className="space-y-3">
            <FitWhy fit={fit} />
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-3.5"><h5 className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent-soft">{t("tut.printTips")}</h5><p className="text-sm leading-relaxed text-muted">{e.printTips}</p></div>
            <div className="rounded-xl border border-teal/30 bg-teal/5 p-3.5">
              <h5 className="mb-1 text-xs font-semibold uppercase tracking-wider text-teal">{t("tut.dryTips")}</h5>
              <p className="text-sm leading-relaxed text-muted">{e.dryTips}</p>
              {fit.dryerWarnings.map((w) => <p key={w.key} className="mt-2 text-sm leading-relaxed text-warn">⚠ {t(w.key, w.params)}</p>)}
            </div>
            <div className="flex flex-wrap gap-1.5">{e.tags.map((tag) => <span key={tag} className="badge">{L.tag(tag)}</span>)}</div>
            <div className="flex flex-wrap gap-2 pt-1 no-print">
              <Link href={`/catalog?family=${encodeURIComponent(e.family)}`} className="btn btn-sm">{t("tut.card.ownFamily", { family: e.family })}</Link>
              <Link href={`/catalog?q=${encodeURIComponent(e.name.split(/[ /(]/)[0])}`} className="btn btn-ghost btn-sm">{t("tut.card.searchStock")}</Link>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function FitBadge({ fit }: { fit: Fit | null }) {
  const t = useT();
  return fit ? <span className={`badge shrink-0 ${FIT_CLS[fit]}`}>{t(`fit.label.${fit}`)}</span> : null;
}

/** „Miért?” – a számított illeszkedés indokai (src/lib/fit.ts). Felszerelés nélkül felszólítás a megadására. */
function FitWhy({ fit }: { fit: FitResult }) {
  const t = useT();
  if (fit.reasons.length === 0 && fit.fit === null) return <p className="rounded-xl border border-dashed border-line-strong p-3.5 text-sm leading-relaxed text-muted">{t("tut.fit.noPrinter")}</p>;
  if (fit.reasons.length === 0) return null;
  return (
    <div className="rounded-xl border border-line bg-bg/40 p-3.5">
      <h5 className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted">{t("fit.why")} <FitBadge fit={fit.fit} /></h5>
      <ul className="space-y-1.5 text-sm leading-relaxed text-muted">
        {fit.reasons.map((r) => (
          <li key={r.key} className="flex gap-2">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${r.unknown ? "bg-line-strong" : FIT_DOT[r.fit]}`} aria-hidden="true" />
            <span>{t(r.key, r.params)}{r.unknown && <span className="badge ml-1.5 !px-1.5 !text-[10px] !leading-4">{t("fit.unknownMark")}</span>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A felhasználó nyomtatója és szárítója – vagy felszólítás a megadásukra (az űrlap a beállítás oldalon lesz). */
function EquipmentCards({ equipment }: { equipment: Equipment }) {
  const t = useT();
  const { printer: p, dryer: d } = equipment;
  const na = t("fit.unknownMark");
  const deg = (v: number | null) => (v === null ? na : `${v} °C`);
  const kind = p ? chamberKind(p) : "unknown";
  const stats = (rows: [string, string][]) => (
    <dl className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4">
      {rows.map(([k, v]) => (
        <div key={k} className="rounded-lg border border-line bg-bg/50 px-2 py-2"><dt className="text-[10px] uppercase tracking-wider text-faint">{k}</dt><dd className="mt-0.5 text-sm font-semibold tabular-nums">{v}</dd></div>
      ))}
    </dl>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card">
        <div className="flex items-center justify-between gap-2"><p className="h-eyebrow">{t("tut.equipment.printer")}</p><Link href="/equipment" className="link text-xs">{t("tut.equipment.edit")}</Link></div>
        {p ? (
          <>
            <h2 className="mt-1 text-lg font-semibold">{p.name ?? t("tut.equipment.unnamed")}</h2>
            {stats([
              [t("tut.equipment.maxNozzle"), deg(p.maxNozzleC)],
              [t("tut.equipment.maxBed"), deg(p.maxBedC)],
              [t("tut.equipment.chamber"), kind === "active" && p.maxChamberC !== null ? `${p.maxChamberC} °C` : t(`tut.equipment.chamber.${kind}`)],
              [t("tut.equipment.toolheads"), p.heatedToolheads === null ? na : String(p.heatedToolheads)],
            ])}
          </>
        ) : <p className="mt-2 text-sm leading-relaxed text-muted">{t("tut.equipment.setupPrinter")}</p>}
      </div>
      <div className="card">
        <div className="flex items-center justify-between gap-2"><p className="h-eyebrow">{t("tut.equipment.dryer")}</p><Link href="/equipment" className="link text-xs">{t("tut.equipment.edit")}</Link></div>
        {d ? (
          <>
            <h2 className="mt-1 text-lg font-semibold">{d.name ?? t("tut.equipment.unnamed")}</h2>
            {stats([
              [t("tut.equipment.range"), d.minC === null && d.maxC === null ? na : `${d.minC ?? "?"}–${d.maxC ?? "?"} °C`],
              [t("tut.equipment.zones"), d.zones === null ? na : String(d.zones)],
              [t("tut.equipment.capacity"), d.capacitySpools === null ? na : t("tut.equipment.capacityValue", { count: d.capacitySpools })],
              [t("tut.equipment.power"), d.powerW === null ? na : `${d.powerW} W`],
            ])}
          </>
        ) : <p className="mt-2 text-sm leading-relaxed text-muted">{t("tut.equipment.setupDryer")}</p>}
      </div>
    </div>
  );
}
