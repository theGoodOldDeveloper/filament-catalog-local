import Link from "next/link";
import { Gauge, familyColor } from "@/components/charts";
import { FilterForm } from "@/components/filter-form";
import { EmptyStart } from "@/components/empty-start";
import { UsedForm } from "@/components/used-form";
import { DemoBadge, Empty, Flash, PageHeader, StatusBadge, StockValue, Swatch } from "@/components/ui";
import type { TFn } from "@/i18n/core";
import { getT } from "@/i18n/server";
import { rich } from "@/i18n/rich";
import { MATERIAL_FAMILIES, familyLabel } from "@/lib/fields";
import { makeFormat } from "@/lib/format";
import { catalogFacets, filterCatalog, loadCatalog, type CatalogFilters, type CatalogRow } from "@/server/catalog";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("nav.catalog") };
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

type Fmt = ReturnType<typeof makeFormat>;
const countsText = (t: TFn, c: { sealed: number; open: number; empty: number }) =>
  c.empty ? t("catalog.counts.withEmpty", { sealed: c.sealed, open: c.open, empty: c.empty }) : t("catalog.counts", { sealed: c.sealed, open: c.open });

/** A rendezési módok értékei; a címke: catalog.sort.<érték> (az alapértelmezett: catalog.sort.default). */
const SORTS = ["", "relevance", "updated", "name", "material", "color", "stock_desc", "stock_asc", "purchased", "nozzle"] as const;

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const fm = makeFormat(locale);
  const f: CatalogFilters = Object.fromEntries(
    ["q", "manufacturer", "family", "color", "diameter", "status", "seller", "location", "effect", "from", "to", "nozzleMin", "bedMax", "dryMax", "chamber", "abrasive", "demo", "sort"].map((k) => [k, one(sp[k])]),
  );
  const view = ["cards", "table", "spools"].includes(one(sp.view)) ? one(sp.view) : "cards";
  const all = loadCatalog();
  const facets = catalogFacets(all);
  const rows = filterCatalog(all, f);
  const activeFilters = Object.entries(f).filter(([k, v]) => v && k !== "sort");
  const advancedOn = ["seller", "location", "effect", "from", "to", "nozzleMin", "bedMax", "dryMax", "chamber", "abrasive", "demo"].some((k) => f[k as keyof CatalogFilters]);
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, view, ...patch })) if (v) p.set(k, v);
    return `/catalog?${p.toString()}`;
  };
  const spoolRows = rows.flatMap((r) =>
    r.spools
      .filter((s) => !f.status || !["sealed", "open", "empty", "discarded"].includes(f.status) || s.status === f.status)
      .map((s) => ({ s, p: r.profile })),
  );

  return (
    <>
      <PageHeader eyebrow={t("catalog.eyebrow")} title={t("nav.catalog")} sub={t("catalog.sub", { shown: rows.length, total: all.length, spools: rows.reduce((a, r) => a + r.activeCount, 0), stock: fm.g(rows.reduce((a, r) => a + r.stockG, 0)) })}>
        <div className="flex rounded-lg border border-line-strong p-0.5" role="group" aria-label={t("catalog.view.aria")}>
          {(["cards", "table", "spools"] as const).map((v) => (
            <Link key={v} href={qs({ view: v })} aria-current={view === v ? "true" : undefined} className={`rounded-md px-3 py-1 text-xs font-medium transition ${view === v ? "bg-accent text-[#1a0f05]" : "text-muted hover:text-fg"}`}>{t(`catalog.view.${v}`)}</Link>
          ))}
        </div>
        <Link href="/filaments/new" className="btn btn-primary">{t("nav.newFilament")}</Link>
      </PageHeader>
      <Flash ok={one(sp.ok)} err={one(sp.err)} />

      <FilterForm action="/catalog" className="card mb-5 !p-4">
        <input type="hidden" name="view" value={view} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="sm:col-span-2 lg:col-span-2">
            <span className="label">{t("catalog.filter.search")} <span className="font-normal text-faint">{t("catalog.filter.searchHint")}</span></span>
            <input name="q" type="search" defaultValue={f.q} placeholder={t("catalog.filter.searchPlaceholder")} className="input" autoComplete="off" />
          </label>
          <label>
            <span className="label">{t("catalog.filter.manufacturer")}</span>
            <select name="manufacturer" defaultValue={f.manufacturer} className="input">
              <option value="">{t("common.all")}</option>
              {facets.manufacturers.map((m) => <option key={m} value={m}>{familyLabel(t, m)}</option>)}
            </select>
          </label>
          <label>
            <span className="label">{t("catalog.filter.material")}</span>
            <select name="family" defaultValue={f.family} className="input">
              <option value="">{t("common.all")}</option>
              {MATERIAL_FAMILIES.filter((m) => facets.families.includes(m)).map((m) => <option key={m} value={m}>{familyLabel(t, m)}</option>)}
            </select>
          </label>
          <label>
            <span className="label">{t("catalog.filter.status")}</span>
            <select name="status" defaultValue={f.status} className="input">
              <option value="">{t("common.all")}</option>
              <option value="instock">{t("catalog.status.instock")}</option>
              <option value="sealed">{t("catalog.status.sealed")}</option>
              <option value="open">{t("catalog.status.open")}</option>
              <option value="low">{t("catalog.status.low")}</option>
              <option value="empty">{t("catalog.status.empty")}</option>
              <option value="discarded">{t("catalog.status.discarded")}</option>
              <option value="none">{t("catalog.status.none")}</option>
            </select>
          </label>
          <label>
            <span className="label">{t("catalog.filter.sort")}</span>
            <select name="sort" defaultValue={f.sort} className="input">
              {SORTS.map((v) => <option key={v} value={v}>{t(`catalog.sort.${v || "default"}`)}</option>)}
            </select>
          </label>
        </div>
        <details className="mt-3" open={advancedOn || !!f.color || !!f.diameter}>
          <summary className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-fg"><span className="chev">▸</span> {t("catalog.filter.more")}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <label><span className="label">{t("catalog.filter.color")}</span><input name="color" defaultValue={f.color} placeholder={t("catalog.filter.colorPlaceholder")} className="input" /></label>
            <label>
              <span className="label">{t("catalog.filter.diameter")}</span>
              <select name="diameter" defaultValue={f.diameter} className="input">
                <option value="">{t("common.all")}</option>
                {facets.diameters.map((d) => <option key={d} value={d}>{d} mm</option>)}
              </select>
            </label>
            <label><span className="label">{t("catalog.filter.effect")}</span><input name="effect" defaultValue={f.effect} placeholder={t("catalog.filter.effectPlaceholder")} className="input" /></label>
            <label><span className="label">{t("catalog.filter.from")}</span><input type="date" name="from" defaultValue={f.from} className="input" /></label>
            <label><span className="label">{t("catalog.filter.to")}</span><input type="date" name="to" defaultValue={f.to} className="input" /></label>
            <label>
              <span className="label">{t("catalog.filter.seller")}</span>
              <select name="seller" defaultValue={f.seller} className="input"><option value="">{t("common.all")}</option>{facets.sellers.map((m) => <option key={m} value={m}>{familyLabel(t, m)}</option>)}</select>
            </label>
            <label>
              <span className="label">{t("catalog.filter.location")}</span>
              <select name="location" defaultValue={f.location} className="input"><option value="">{t("common.all")}</option>{facets.locations.map((m) => <option key={m} value={m}>{familyLabel(t, m)}</option>)}</select>
            </label>
            <label><span className="label">{t("catalog.filter.nozzleMin")} <span className="font-normal text-faint">°C</span></span><input name="nozzleMin" inputMode="numeric" defaultValue={f.nozzleMin} placeholder={t("catalog.filter.nozzleMinPlaceholder")} className="input" /></label>
            <label><span className="label">{t("catalog.filter.bedMax")} <span className="font-normal text-faint">°C</span></span><input name="bedMax" inputMode="numeric" defaultValue={f.bedMax} placeholder={t("catalog.filter.bedMaxPlaceholder")} className="input" /></label>
            <label><span className="label">{t("catalog.filter.dryMax")} <span className="font-normal text-faint">°C</span></span><input name="dryMax" inputMode="numeric" defaultValue={f.dryMax} placeholder={t("catalog.filter.dryMaxPlaceholder")} className="input" /></label>
            <label>
              <span className="label">{t("catalog.filter.chamber")}</span>
              <select name="chamber" defaultValue={f.chamber} className="input"><option value="">{t("common.any")}</option><option value="yes">{t("catalog.filter.chamberYes")}</option><option value="no">{t("catalog.filter.chamberNo")}</option></select>
            </label>
            <label>
              <span className="label">{t("field.abrasive")}</span>
              <select name="abrasive" defaultValue={f.abrasive} className="input"><option value="">{t("common.any")}</option><option value="yes">{t("catalog.filter.abrasiveYes")}</option><option value="no">{t("catalog.filter.abrasiveNo")}</option></select>
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-muted"><input type="checkbox" name="demo" value="hide" defaultChecked={f.demo === "hide"} className="h-4 w-4 accent-[var(--color-accent)]" /> {t("catalog.filter.hideDemo")}</label>
          </div>
        </details>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="submit" className="btn btn-sm">{t("catalog.filter.submit")}</button>
          {activeFilters.length > 0 && <Link href={`/catalog?view=${view}`} className="btn btn-ghost btn-sm">{t("catalog.filter.clear", { count: activeFilters.length })}</Link>}
          <span className="ml-auto text-xs text-faint">{t("catalog.filter.tip")}</span>
        </div>
      </FilterForm>

      {all.length === 0 ? (
        <EmptyStart title={t("catalog.empty.none")} />
      ) : rows.length === 0 ? (
        <Empty title={t("catalog.empty.title")}>{rich(t("catalog.empty.hint"), [(c) => <Link className="link" href="/filaments/new">{c}</Link>])}</Empty>
      ) : view === "cards" ? (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {rows.map((r) => <ProfileCard key={r.profile.id} r={r} t={t} fm={fm} />)}
        </div>
      ) : view === "table" ? (
        <div className="card overflow-x-auto !p-0">
          <table className="tbl min-w-[980px]">
            <thead><tr><th>{t("catalog.col.filament")}</th><th>{t("catalog.col.material")}</th><th>{t("catalog.col.color")}</th><th>Ø</th><th>{t("catalog.col.nozzle")}</th><th>{t("catalog.col.bed")}</th><th>{t("catalog.col.drying")}</th><th>{t("catalog.col.spools")}</th><th>{t("catalog.col.stock")}</th><th>{t("catalog.col.lastPurchase")}</th></tr></thead>
            <tbody>
              {rows.map(({ profile: p, ...r }) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/filaments/${p.id}`} className="flex items-center gap-3 hover:text-accent-soft">
                      <Swatch hex={p.colorHex} size={28} />
                      <span className="min-w-0"><span className="block font-medium">{p.productName} {p.isDemo && <DemoBadge />}</span><span className="block text-xs text-muted">{p.manufacturer}{p.sku ? <> · <span className="mono">{p.sku}</span></> : null}</span></span>
                    </Link>
                  </td>
                  <td><span className="badge" style={{ borderColor: familyColor(p.materialFamily) + "66", color: familyColor(p.materialFamily) }}>{familyLabel(t, p.materialFamily)}</span></td>
                  <td className="text-muted">{p.colorName ?? "—"}</td>
                  <td className="tabular-nums text-muted">{p.diameterMm ?? "—"}</td>
                  <td className="tabular-nums">{fm.range(p.nozzleTempMinC, p.nozzleTempMaxC, "°C")}</td>
                  <td className="tabular-nums">{fm.range(p.bedTempMinC, p.bedTempMaxC, "°C")}</td>
                  <td className="tabular-nums">{p.dryingTempC != null ? `${p.dryingTempC} °C${p.dryingTimeH != null ? ` / ${p.dryingTimeH} h` : ""}` : "—"}</td>
                  <td className="text-xs text-muted">{countsText(t, r.counts)}</td>
                  <td className="tabular-nums">{r.activeCount ? <>{r.hasEstimate ? "≈ " : ""}{fm.g(r.stockG)}{r.unknownStockCount ? <span className="text-faint"> +{r.unknownStockCount} ?</span> : null}</> : <span className="text-faint">—</span>}</td>
                  <td className="text-muted">{fm.date(r.lastPurchasedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : spoolRows.length === 0 ? (
        <Empty title={t("catalog.spools.empty")} />
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="tbl min-w-[980px]">
            <thead><tr><th>{t("catalog.spools.code")}</th><th>{t("catalog.col.filament")}</th><th>{t("catalog.filter.status")}</th><th>{t("catalog.spools.remaining")}</th><th className="w-32">{t("catalog.spools.fill")}</th><th>{t("catalog.filter.location")}</th><th>{t("catalog.spools.purchased")}</th><th>{t("catalog.filter.seller")}</th><th>{t("catalog.spools.effectivePrice")}</th><th><span className="sr-only">{t("spool.use.button")}</span></th></tr></thead>
            <tbody>
              {spoolRows.map(({ s, p }) => (
                <tr key={s.id}>
                  <td className="mono">{s.code}</td>
                  <td>
                    <Link href={`/filaments/${p.id}#keszlet`} className="flex items-center gap-2.5 hover:text-accent-soft">
                      <Swatch hex={p.colorHex} size={24} /><span><span className="font-medium">{p.productName}</span> <span className="text-xs text-muted">· {p.colorName ?? p.manufacturer}</span></span>
                    </Link>
                  </td>
                  <td><StatusBadge status={s.status} /></td>
                  <td><StockValue g={s.stockG} basis={s.stockBasis} /></td>
                  <td><Gauge value={s.stockG} max={s.initialWeightG} basis={s.stockBasis} /></td>
                  <td className="text-muted">{s.location ?? "—"}</td>
                  <td className="text-muted">{fm.date(s.purchasedAt)}</td>
                  <td className="text-muted">{s.seller ?? "—"}</td>
                  <td className="tabular-nums">{s.cost?.effective != null ? <>{fm.money(s.cost.effective, s.cost.currency)}{s.cost.computed && <span className="badge badge-estimate ml-1.5 !px-1.5 !text-[10px] !leading-4" title={t("catalog.spools.computedTitle")}>{t("common.computed")}</span>}</> : <span className="text-faint">{t("common.unknown")}</span>}</td>
                  <td className="text-right">{(s.status === "sealed" || s.status === "open") && <UsedForm spoolId={s.id} profileId={p.id} code={s.code} returnTo={qs({})} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ProfileCard({ r, t, fm }: { r: CatalogRow; t: TFn; fm: Fmt }) {
  const p = r.profile;
  const fc = familyColor(p.materialFamily);
  const nominal = r.spools.filter((s) => s.status === "sealed" || s.status === "open").reduce((a, s) => a + (s.initialWeightG ?? 0), 0);
  return (
    <Link href={`/filaments/${p.id}`} className="card card-hover group relative block overflow-hidden !p-0">
      <span className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${fc}, transparent)` }} />
      <div className="flex items-start gap-4 p-4 pb-3">
        <Swatch hex={p.colorHex} size={54} label={p.colorName ?? undefined} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">{p.manufacturer}{p.brand && p.brand !== p.manufacturer ? ` · ${p.brand}` : ""}</p>
          <h3 className="truncate text-[15px] font-semibold tracking-tight group-hover:text-accent-soft">{p.productName}</h3>
          <p className="mt-0.5 truncate text-xs text-muted">{p.colorName ?? t("catalog.card.noColor")}{p.sku ? <> · <span className="mono">{p.sku}</span></> : null}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4">
        <span className="badge" style={{ borderColor: fc + "66", color: fc }}>{p.materialNameRaw ?? familyLabel(t, p.materialFamily)}</span>
        {p.diameterMm != null && <span className="badge">Ø {p.diameterMm} mm</span>}
        {p.effect && <span className="badge">{p.effect}</span>}
        {p.abrasive && <span className="badge badge-danger">{t("catalog.card.abrasive")}</span>}
        {(p.chamberTempMinC != null || p.chamberTempMaxC != null) && <span className="badge badge-accent">{t("catalog.card.chamber")}</span>}
        {p.isDemo && <DemoBadge />}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-px border-t border-line bg-line text-center text-xs">
        {[[t("catalog.col.nozzle"), fm.range(p.nozzleTempMinC, p.nozzleTempMaxC, "°C")], [t("catalog.col.bed"), fm.range(p.bedTempMinC, p.bedTempMaxC, "°C")], [t("catalog.col.drying"), p.dryingTempC != null ? `${p.dryingTempC} °C` : "—"]].map(([k, v]) => (
          <div key={k} className="bg-surface px-2 py-2"><dt className="text-[10px] uppercase tracking-wider text-faint">{k}</dt><dd className="mt-0.5 font-medium tabular-nums">{v}</dd></div>
        ))}
      </dl>
      <div className="p-4 pt-3">
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="text-muted">{countsText(t, r.counts)}</span>
          <span className="font-medium tabular-nums">{r.activeCount === 0 ? <span className="text-faint">{t("catalog.card.outOfStock")}</span> : <>{r.hasEstimate ? "≈ " : ""}{fm.g(r.stockG)}{r.unknownStockCount ? <span className="text-faint"> {t("catalog.card.unmeasured", { n: r.unknownStockCount })}</span> : null}</>}</span>
        </div>
        <Gauge value={r.activeCount && r.unknownStockCount < r.activeCount ? r.stockG : r.activeCount ? null : 0} max={nominal || null} basis={r.hasEstimate ? "estimate" : "measured"} />
      </div>
    </Link>
  );
}
