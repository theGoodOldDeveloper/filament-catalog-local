import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addNoteAction, addSourceAction, addSpoolAction, addSpoolEventAction, deleteDocumentAction, deleteNoteAction, deletePrintProfileAction,
  deleteProfileAction, deleteSourceAction, deleteSpoolAction, savePrintProfileAction, updateSpoolAction, uploadAction,
} from "@/app/actions";
import { Gauge, familyColor } from "@/components/charts";
import { DemoBadge, Empty, ExtLink, Flash, OriginBadge, Section, StatusBadge, StockValue, Swatch } from "@/components/ui";
import { getT } from "@/i18n/server";
import { FIELDS, FIELD_GROUPS, ORIGINS, SPOOL_EVENT_TYPES, SPOOL_STATUSES, camelToSnake, familyLabel, fieldLabelKey, groupLabelKey, originKey, spoolEventKey, spoolStatusKey } from "@/lib/fields";
import { rich } from "@/i18n/rich";
import { makeFormat, todayIso } from "@/lib/format";
import { UsedForm } from "@/components/used-form";
import { spoolStock } from "@/server/catalog";
import { getProfileFull } from "@/server/profiles";
import { spoolCost } from "@/server/stock";

type SP = Promise<{ ok?: string; err?: string }>;
type PrintProfileRow = typeof import("@/db/schema").printProfiles.$inferSelect;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const full = /^\d+$/.test(id) ? getProfileFull(Number(id)) : null;
  return { title: full ? `${full.profile.productName}${full.profile.colorName ? ` – ${full.profile.colorName}` : ""}` : t("filament.notFoundTitle") };
}

export default async function FilamentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const { ok, err } = await searchParams;
  const { t, locale } = await getT();
  const fm = makeFormat(locale);
  const full = /^\d+$/.test(id) ? getProfileFull(Number(id)) : null;
  if (!full) notFound();
  const { profile: p, provenance: prov, spools, events, purchases, items, allItems, specs, sources, notes, printProfiles, documents, auditTrail } = full;
  const rec = p as unknown as Record<string, string | number | boolean | null>;
  const fc = familyColor(p.materialFamily);
  const active = spools.filter((s) => s.status === "sealed" || s.status === "open");
  const stock = active.map(spoolStock);
  const stockG = stock.reduce((a, s) => a + (s.stockG ?? 0), 0);
  const O = (k: string) => <OriginBadge origin={prov[k]?.origin} />;
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const hidden = <input type="hidden" name="profileId" value={p.id} />;

  const tiles = [
    { k: t("filament.tile.nozzle"), v: fm.range(p.nozzleTempMinC, p.nozzleTempMaxC, "°C"), o: "nozzleTempMinC" },
    { k: t("filament.tile.bed"), v: fm.range(p.bedTempMinC, p.bedTempMaxC, "°C"), o: "bedTempMinC" },
    { k: t("filament.tile.chamber"), v: fm.range(p.chamberTempMinC, p.chamberTempMaxC, "°C"), o: "chamberTempMinC" },
    { k: t("filament.tile.fan"), v: fm.range(p.fanMinPct, p.fanMaxPct, "%"), o: "fanMinPct" },
    { k: t("filament.tile.flow"), v: p.maxVolumetricFlowMm3s != null ? `${fm.num(p.maxVolumetricFlowMm3s, 1)} mm³/s` : "—", o: "maxVolumetricFlowMm3s" },
    { k: t("filament.tile.drying"), v: p.dryingTempC != null ? `${p.dryingTempC} °C${p.dryingTimeH != null ? ` · ${p.dryingTimeH} h` : ""}` : "—", o: "dryingTempC" },
  ];

  return (
    <>
      <nav className="mb-4 text-xs text-muted" aria-label={t("filament.breadcrumb")}><Link href="/catalog" className="hover:text-fg">{t("nav.catalog")}</Link> <span className="text-faint">/</span> {p.manufacturer}</nav>
      <Flash ok={ok} err={err} />

      <header className="card relative mb-5 overflow-hidden animate-fade">
        <span className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-20 blur-3xl" style={{ background: p.colorHex && /^#[0-9a-f]{3,6}$/i.test(p.colorHex) ? p.colorHex : fc }} />
        <div className="relative flex flex-wrap items-start gap-5">
          <Swatch hex={p.colorHex} size={88} label={p.colorName ?? undefined} />
          <div className="min-w-[15rem] flex-1">
            <p className="text-sm text-muted">{p.manufacturer}{p.brand && p.brand !== p.manufacturer ? ` · ${p.brand}` : ""}{p.productType ? ` · ${p.productType}` : ""}</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">{p.productName}</h1>
            <p className="mt-1 text-sm text-muted">{p.colorName ?? t("filament.noColor")}{p.colorCode ? ` (${p.colorCode})` : ""}{p.sku ? <> · SKU <span className="mono text-fg">{p.sku}</span></> : null}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="badge" style={{ borderColor: fc + "66", color: fc }}>{familyLabel(t, p.materialFamily)}</span>
              {p.materialNameRaw && p.materialNameRaw !== p.materialFamily && <span className="badge" title={t("field.materialNameRaw")}>{p.materialNameRaw}</span>}
              {p.diameterMm != null && <span className="badge">Ø {p.diameterMm} mm{p.diameterToleranceMm != null ? ` ± ${p.diameterToleranceMm}` : ""}</span>}
              {p.netWeightG != null && <span className="badge">{t("filament.netBadge", { g: fm.g(p.netWeightG) })}</span>}
              {p.effect && <span className="badge">{p.effect}</span>}
              {p.finish && <span className="badge">{p.finish}</span>}
              {p.abrasive && <span className="badge badge-danger">{t("filament.abrasiveBadge")}</span>}
              {p.isDemo && <DemoBadge />}
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 no-print 2xl:w-auto">
            <Link href={`/tuttirial?q=${encodeURIComponent(p.materialNameRaw ?? p.materialFamily)}`} className="btn btn-ghost">{t("filament.btn.tuttirial", { family: p.materialFamily })}</Link>
            <Link href={`/compare?ids=${p.id}`} className="btn">{t("nav.compare")}</Link>
            <Link href={`/filaments/new?from=${p.id}`} className="btn">{t("filament.btn.copy")}</Link>
            <Link href={`/filaments/${p.id}/edit`} className="btn btn-primary">{t("filament.btn.edit")}</Link>
          </div>
        </div>
        <dl className="relative mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 xl:grid-cols-6">
          {tiles.map((tile) => (
            <div key={tile.k} className="bg-surface px-4 py-3">
              <dt className="flex items-center justify-between gap-2 text-[10.5px] uppercase tracking-wider text-faint">{tile.k} {O(tile.o)}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{tile.v}</dd>
            </div>
          ))}
        </dl>
        <p className="relative mt-3 text-[11px] text-faint">{t("filament.legend")} {ORIGINS.map((o) => <span key={o} className="mr-2 inline-flex items-center gap-1"><OriginBadge origin={o} /> {t(originKey(o))}</span>)}</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {/* ---- készlet ---- */}
          <Section id="keszlet" title={<>{t("filament.stock.title")} <span className="ml-2 text-sm font-normal text-muted">{t("filament.stock.summary", { count: active.length, g: fm.g(stockG) })}{stock.some((s) => s.stockBasis === "estimate") ? ` ${t("filament.stock.partialEstimate")}` : ""}{stock.some((s) => s.stockG === null) ? ` ${t("filament.stock.unmeasured", { n: stock.filter((s) => s.stockG === null).length })}` : ""}</span></>}>
            {spools.length === 0 ? (
              <Empty title={t("filament.stock.empty")}>{rich(t("filament.stock.emptyHint"), [(c) => <Link className="link" href="/purchases/new">{c}</Link>])}</Empty>
            ) : (
              <ul className="space-y-3">
                {spools.map((s) => {
                  const st = spoolStock(s);
                  const item = items.find((i) => i.id === s.purchaseItemId);
                  const pu = item ? purchases.find((x) => x.id === item.purchaseId) : undefined;
                  const cost = item && pu ? spoolCost(item, pu, allItems.filter((i) => i.purchaseId === pu.id)) : null;
                  const evs = events.filter((e) => e.spoolId === s.id);
                  const dries = evs.filter((e) => e.type === "dry").length;
                  return (
                    <li key={s.id} className="rounded-xl border border-line bg-bg/40">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                        <span className="mono text-sm font-semibold">{s.code}</span>
                        <StatusBadge status={s.status} />
                        {s.isDemo && <DemoBadge />}
                        <span className="min-w-[9rem] flex-1"><Gauge value={st.stockG} max={s.initialWeightG} basis={st.stockBasis} /></span>
                        <span className="text-sm"><StockValue g={st.stockG} basis={st.stockBasis} />{s.initialWeightG != null && <span className="text-faint"> / {fm.g(s.initialWeightG)}</span>}</span>
                        {(s.status === "sealed" || s.status === "open") && <UsedForm spoolId={s.id} profileId={p.id} code={s.code} />}
                      </div>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line/60 px-4 py-3 text-xs sm:grid-cols-4">
                        <div><dt className="text-faint">{t("spool.purchased")}</dt><dd>{fm.date(pu?.purchasedAt)}{pu?.seller ? ` · ${pu.seller}` : ""}</dd></div>
                        <div><dt className="text-faint">{t("spool.receivedOpened")}</dt><dd>{fm.date(s.receivedAt)} / {fm.date(s.openedAt)}</dd></div>
                        <div><dt className="text-faint">{t("spool.location")}</dt><dd>{[s.location, s.storageMethod].filter(Boolean).join(" · ") || "—"}</dd></div>
                        <div><dt className="text-faint">{t("spool.lastMeasured")}</dt><dd>{fm.date(s.lastMeasuredAt)} · {dries}×</dd></div>
                        <div><dt className="text-faint">{t("spool.price")}</dt><dd>{cost?.unitPrice != null ? fm.money(cost.unitPrice, cost.currency) : t("common.unknown")}</dd></div>
                        <div><dt className="text-faint">{t("spool.effectivePrice")}</dt><dd>{cost?.effective != null ? <>{fm.money(cost.effective, cost.currency)} {cost.computed && <span className="badge badge-estimate !px-1.5 !text-[10px] !leading-4" title={t("spool.computedTitle", { ship: fm.num(cost.shippingPerSpool, 2), disc: fm.num(cost.discountPerSpool, 2) })}>{t("common.computed")}</span>}</> : t("common.notComputable")}</dd></div>
                        <div><dt className="text-faint">{t("spool.moisture")}</dt><dd>{s.moistureState ?? "—"}</dd></div>
                        <div><dt className="text-faint">{t("common.note")}</dt><dd>{s.notes ?? "—"}</dd></div>
                      </dl>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line/60 px-4 py-2.5 no-print">
                        <details className="group w-full">
                          <summary className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-fg"><span className="chev">▸</span> {t("spool.event.summary", { count: evs.length })}</summary>
                          <form action={addSpoolEventAction} className="mt-3 grid gap-2 sm:grid-cols-6">
                            {hidden}<input type="hidden" name="spoolId" value={s.id} />
                            <label><span className="label">{t("spool.event.type")}</span>
                              <select name="type" className="input" defaultValue="measure">{SPOOL_EVENT_TYPES.map((x) => <option key={x} value={x}>{t(spoolEventKey(x))}</option>)}</select>
                            </label>
                            <label><span className="label">{t("common.date")}</span><input type="date" name="at" defaultValue={todayIso()} className="input" required /></label>
                            <label><span className="label">{t("spool.event.remaining")}</span><input name="remainingG" inputMode="decimal" className="input" placeholder={t("spool.event.remainingPlaceholder")} /></label>
                            <label><span className="label">{t("spool.event.used")}</span><input name="usedG" inputMode="decimal" className="input" placeholder={t("spool.event.usedPlaceholder")} /></label>
                            <label><span className="label">{t("spool.event.dry")}</span><span className="flex gap-1"><input name="dryTempC" inputMode="decimal" className="input" placeholder="°C" aria-label={t("field.dryingTempC")} /><input name="dryHours" inputMode="decimal" className="input" placeholder="h" aria-label={t("field.dryingTimeH")} /></span></label>
                            <label><span className="label">{t("spool.event.newStatus")}</span>
                              <select name="newStatus" className="input"><option value="">—</option>{SPOOL_STATUSES.map((x) => <option key={x} value={x}>{t(spoolStatusKey(x))}</option>)}</select>
                            </label>
                            <label className="sm:col-span-4"><span className="label">{t("common.note")}</span><input name="note" className="input" /></label>
                            <label className="flex items-center gap-2 self-end pb-2 text-xs text-muted"><input type="checkbox" name="isEstimate" className="h-4 w-4 accent-[var(--color-accent)]" /> {t("spool.event.onlyEstimate")}</label>
                            <div className="flex items-end"><button className="btn btn-primary btn-sm w-full">{t("spool.event.submit")}</button></div>
                          </form>
                          {evs.length > 0 && (
                            <ol className="mt-3 space-y-1 border-l border-line pl-3 text-xs">
                              {evs.map((e) => (
                                <li key={e.id} className="flex flex-wrap gap-x-2 text-muted">
                                  <span className="tabular-nums text-faint">{fm.date(e.at)}</span>
                                  <span className="font-medium text-fg">{t(spoolEventKey(e.type))}</span>
                                  {e.deltaG != null && <span className="tabular-nums">{e.deltaG > 0 ? "+" : ""}{fm.num(e.deltaG)} g</span>}
                                  {e.remainingG != null && <span className="tabular-nums">→ {e.isEstimate ? "≈ " : ""}{fm.num(e.remainingG)} g{e.isEstimate ? ` (${t("common.estimate")})` : ""}</span>}
                                  {e.dryTempC != null && <span>{e.dryTempC} °C{e.dryHours != null ? ` · ${e.dryHours} h` : ""}</span>}
                                  {e.note && <span>— {e.note}</span>}
                                </li>
                              ))}
                            </ol>
                          )}
                        </details>
                        <details className="w-full">
                          <summary className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-fg"><span className="chev">▸</span> {t("spool.editSummary")}</summary>
                          <SpoolForm s={s} profileId={p.id} />
                          <form action={deleteSpoolAction} className="mt-2">{hidden}<input type="hidden" name="spoolId" value={s.id} /><button className="btn btn-danger btn-sm">{t("spool.delete")}</button></form>
                        </details>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <details className="mt-4 no-print">
              <summary className="btn btn-sm inline-flex"><span className="chev">▸</span> {t("spool.addWithoutPurchase")}</summary>
              <SpoolForm profileId={p.id} defaultWeight={p.netWeightG} />
            </details>
          </Section>

          {/* ---- teljes adatlap ---- */}
          <Section title={t("filament.sheet.title")} action={<Link href={`/filaments/${p.id}/edit`} className="text-xs text-muted hover:text-fg no-print">{t("filament.sheet.edit")}</Link>}>
            <div className="space-y-6">
              {FIELD_GROUPS.map((g) => {
                const fields = FIELDS.filter((f) => f.group === g.key);
                const filled = fields.filter((f) => rec[f.key] !== null && rec[f.key] !== "");
                return (
                  <div key={g.key}>
                    <h3 className="h-eyebrow mb-2 flex items-center justify-between">{t(groupLabelKey(g.key))}<span className="font-normal normal-case tracking-normal">{fields.length - filled.length > 0 ? t("filament.sheet.missing", { count: fields.length - filled.length }) : ""}</span></h3>
                    {filled.length === 0 ? <p className="text-sm text-faint">{t("filament.sheet.noData")}</p> : (
                      <dl className="kv">
                        {filled.map((f) => {
                          const v = rec[f.key];
                          const est = prov[f.key]?.origin === "estimate";
                          const src = prov[f.key]?.sourceId ? sourceById.get(prov[f.key].sourceId as number) : undefined;
                          return (
                            <div key={f.key} className="contents">
                              <dt>{t(fieldLabelKey(f.key))}</dt>
                              <dd className={f.type === "textarea" ? "prose-pre" : ""}>
                                {f.type === "url" ? <ExtLink href={String(v)} /> : f.type === "tristate" ? (v ? t("common.yes") : t("common.no")) : <>{est ? "≈ " : ""}{typeof v === "number" ? fm.num(v, 3) : String(v)}{f.unit ? ` ${f.unit}` : ""}</>}
                                <span className="ml-2 inline-flex items-center gap-1 align-middle">{O(f.key)}{src?.url && <a href={src.url} target="_blank" rel="noopener noreferrer nofollow" className="text-[10px] text-faint underline hover:text-fg" title={src.title ?? src.url}>{t("filament.sourceLink")}</a>}</span>
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title={t("specs.title")}>
            {specs.length === 0 ? <p className="text-sm text-faint">{t("specs.empty")}</p> : (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead><tr><th>{t("specs.col.property")}</th><th>{t("specs.col.value")}</th><th>{t("specs.col.method")}</th><th>{t("specs.col.origin")}</th></tr></thead>
                  <tbody>
                    {specs.map((s) => (
                      <tr key={s.id}>
                        <td>{s.label}</td>
                        <td className="font-medium tabular-nums">{s.origin === "estimate" ? "≈ " : ""}{s.valueNum != null ? fm.num(s.valueNum, 3) : s.valueText} {s.unit}</td>
                        <td className="text-muted">{s.testMethod ?? "—"}</td>
                        <td><OriginBadge origin={s.origin} compact={false} />{s.sourceId && sourceById.get(s.sourceId)?.url ? <a className="ml-2 text-xs text-faint underline" href={sourceById.get(s.sourceId)!.url!} target="_blank" rel="noopener noreferrer nofollow">{t("filament.sourceLink")}</a> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ---- nyomtatási profilok ---- */}
          <Section id="profilok" title={t("filament.pp.title", { count: printProfiles.length })}>
            <div className="grid gap-3 md:grid-cols-2">
              {printProfiles.map((pp) => (
                <article key={pp.id} className="rounded-xl border border-line bg-bg/40 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div><h3 className="font-medium">{pp.name}</h3><p className="text-xs text-muted">{[pp.slicer, pp.printer, pp.nozzleDiameterMm ? `${pp.nozzleDiameterMm} mm ${pp.nozzleMaterial ?? ""}`.trim() : pp.nozzleMaterial, pp.version].filter(Boolean).join(" · ") || "—"}</p></div>
                    <OriginBadge origin={pp.origin} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    {Object.entries(pp.settings).map(([k, v]) => <div key={k} className="flex justify-between gap-2 border-b border-line/50 py-0.5"><dt className="mono text-faint">{k}</dt><dd className="font-medium tabular-nums">{String(v)}</dd></div>)}
                  </dl>
                  {pp.notes && <p className="prose-pre mt-2 text-xs text-muted">{pp.notes}</p>}
                  <details className="mt-3 no-print">
                    <summary className="text-xs text-muted hover:text-fg"><span className="chev">▸</span> {t("filament.pp.edit")}</summary>
                    <PrintProfileForm profileId={p.id} pp={pp} />
                    <form action={deletePrintProfileAction} className="mt-2">{hidden}<input type="hidden" name="printProfileId" value={pp.id} /><button className="btn btn-danger btn-sm">{t("filament.pp.delete")}</button></form>
                  </details>
                </article>
              ))}
            </div>
            <details className="mt-4 no-print" open={printProfiles.length === 0}>
              <summary className="btn btn-sm inline-flex"><span className="chev">▸</span> {t("filament.pp.new")}</summary>
              <PrintProfileForm profileId={p.id} />
            </details>
          </Section>

          <Section id="vasarlasok" title={t("filament.purchases.title", { count: purchases.length })} action={<Link href="/purchases/new" className="text-xs text-muted hover:text-fg no-print">{t("filament.purchases.new")}</Link>}>
            {purchases.length === 0 ? <p className="text-sm text-faint">{t("filament.purchases.empty")}</p> : (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead><tr><th>{t("common.date")}</th><th>{t("filament.purchases.seller")}</th><th>{t("filament.purchases.order")}</th><th>{t("filament.purchases.qty")}</th><th>{t("filament.purchases.unitPrice")}</th><th>{t("filament.purchases.source")}</th></tr></thead>
                  <tbody>
                    {purchases.flatMap((pu) => items.filter((i) => i.purchaseId === pu.id).map((i) => (
                      <tr key={i.id}>
                        <td>{fm.date(pu.purchasedAt)}</td><td>{pu.seller ?? "—"} {pu.isDemo && <DemoBadge />}</td><td className="mono text-muted">{pu.orderReference ?? "—"}</td>
                        <td className="tabular-nums">{i.quantity}{i.variant ? <span className="text-faint"> · {i.variant}</span> : null}</td>
                        <td className="tabular-nums">{i.unitPrice != null ? fm.money(i.unitPrice, pu.currency) : <span className="text-faint">{t("common.unknown")}</span>}</td>
                        <td><span className="badge">{t(`purchase.source.${pu.sourceKind === "purchase_email" ? "email" : pu.sourceKind === "web" ? "web" : "manual"}`)}</span></td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-5">
          <Section id="jegyzetek" title={t("filament.notes.title")}>
            <form action={addNoteAction} className="mb-4 space-y-2 no-print">
              {hidden}
              <textarea name="body" required className="input" rows={3} placeholder={t("filament.notes.placeholder")} aria-label={t("filament.notes.newAria")} />
              <div className="flex gap-2"><input type="date" name="notedAt" defaultValue={todayIso()} className="input" aria-label={t("filament.notes.dateAria")} /><button className="btn btn-primary shrink-0">{t("filament.notes.add")}</button></div>
            </form>
            {notes.length === 0 ? <p className="text-sm text-faint">{t("filament.notes.empty")}</p> : (
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-xl border border-line bg-bg/40 p-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-faint"><span>{fm.date(n.notedAt)} <OriginBadge origin="own" /></span>
                      <form action={deleteNoteAction} className="no-print">{hidden}<input type="hidden" name="noteId" value={n.id} /><button className="hover:text-danger" aria-label={t("filament.notes.deleteAria")}>✕</button></form>
                    </div>
                    <p className="prose-pre text-sm">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section id="dokumentumok" title={t("filament.docs.title")}>
            {documents.length > 0 && (
              <ul className="mb-4 grid grid-cols-2 gap-2">
                {documents.map((d) => (
                  <li key={d.id} className="group relative overflow-hidden rounded-xl border border-line bg-bg/40">
                    <a href={`/api/files/${d.id}`} target="_blank" rel="noopener noreferrer" className="block">
                      {d.mime.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/files/${d.id}`} alt={d.originalName} loading="lazy" className="h-28 w-full object-cover" />
                      ) : <span className="grid h-28 place-items-center text-2xl text-faint">PDF</span>}
                      <span className="block truncate px-2 py-1.5 text-[11px] text-muted"><span className="badge mr-1 !px-1.5 !text-[10px] !leading-4">{d.kind.toUpperCase()}</span>{d.originalName}</span>
                    </a>
                    <form action={deleteDocumentAction} className="absolute right-1 top-1 no-print">{hidden}<input type="hidden" name="documentId" value={d.id} /><button className="rounded bg-bg/80 px-1.5 text-xs text-muted hover:text-danger" aria-label={t("filament.docs.deleteAria", { name: d.originalName })}>✕</button></form>
                  </li>
                ))}
              </ul>
            )}
            <form action={uploadAction} className="space-y-2 no-print">
              {hidden}
              <input type="file" name="file" required accept="image/jpeg,image/png,image/webp,application/pdf" className="input file:mr-3 file:rounded file:border-0 file:bg-raised file:px-2 file:py-1 file:text-xs file:text-fg" aria-label={t("filament.docs.fileAria")} />
              <div className="flex gap-2">
                <select name="kind" className="input" aria-label={t("filament.docs.kindAria")}><option value="photo">{t("filament.docs.photo")}</option><option value="tds">TDS</option><option value="sds">SDS</option><option value="other">{t("filament.docs.other")}</option></select>
                <button className="btn shrink-0">{t("filament.docs.upload")}</button>
              </div>
              <p className="text-[11px] text-faint">{t("filament.docs.hint")}</p>
            </form>
            <dl className="kv mt-4 border-t border-line pt-3 !grid-cols-[5rem_minmax(0,1fr)]">
              <dt>{t("filament.docs.productPage")}</dt><dd><ExtLink href={p.datasheetUrl} /></dd>
              <dt>TDS</dt><dd><ExtLink href={p.tdsUrl} /></dd>
              <dt>SDS</dt><dd><ExtLink href={p.sdsUrl} /></dd>
            </dl>
          </Section>

          <Section id="forrasok" title={t("filament.sources.title", { count: sources.length })}>
            {sources.length === 0 ? <p className="mb-3 text-sm text-faint">{t("filament.sources.empty")}</p> : (
              <ul className="mb-4 space-y-3">
                {sources.map((s) => (
                  <li key={s.id} className="rounded-xl border border-line bg-bg/40 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{s.title ?? t("filament.sources.noTitle")}</p>
                      <form action={deleteSourceAction} className="no-print">{hidden}<input type="hidden" name="sourceId" value={s.id} /><button className="text-xs text-faint hover:text-danger" aria-label={t("filament.sources.deleteAria")}>✕</button></form>
                    </div>
                    <p className="mt-0.5 text-xs"><ExtLink href={s.url} /></p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted"><OriginBadge origin={s.sourceType} compact={false} /> {t("filament.sources.retrieved", { date: fm.date(s.retrievedAt) })}</p>
                    {s.excerpt && <blockquote className="mt-2 border-l-2 border-line-strong pl-2.5 text-xs italic text-muted">{t("filament.sources.quote", { text: s.excerpt })}</blockquote>}
                    {s.fields.length > 0 && <p className="mono mt-2 text-[10.5px] text-faint">{s.fields.join(" · ")}</p>}
                  </li>
                ))}
              </ul>
            )}
            <details className="no-print">
              <summary className="btn btn-sm inline-flex"><span className="chev">▸</span> {t("filament.sources.add")}</summary>
              <form action={addSourceAction} className="mt-3 space-y-2">
                {hidden}
                <input name="title" required className="input" placeholder={t("filament.sources.titlePlaceholder")} aria-label={t("filament.sources.titlePlaceholder")} />
                <input name="url" type="url" className="input" placeholder="https://…" aria-label={t("filament.sources.urlAria")} />
                <div className="flex gap-2">
                  <select name="sourceType" className="input" aria-label={t("filament.sources.typeAria")}><option value="manufacturer">{t("filament.sources.type.manufacturer")}</option><option value="seller">{t("filament.sources.type.seller")}</option><option value="secondary">{t("filament.sources.type.secondary")}</option><option value="own">{t("filament.sources.type.own")}</option></select>
                  <input type="date" name="retrievedAt" defaultValue={todayIso()} className="input" aria-label={t("filament.sources.dateAria")} />
                </div>
                <input name="fields" className="input mono" placeholder={t("filament.sources.fieldsPlaceholder", { example: `${camelToSnake("nozzleTempMinC")}, density` })} aria-label={t("filament.sources.fieldsAria")} />
                <textarea name="excerpt" className="input" rows={2} maxLength={600} placeholder={t("filament.sources.excerptPlaceholder")} aria-label={t("filament.sources.excerptAria")} />
                <button className="btn btn-primary btn-sm">{t("common.save")}</button>
              </form>
            </details>
          </Section>

          <Section title={t("filament.audit.title")}>
            <p className="mb-3 text-xs text-faint">{t("filament.audit.dates", { created: fm.dateTime(p.createdAt), updated: fm.dateTime(p.updatedAt) })}</p>
            <ol className="space-y-2 border-l border-line pl-3 text-xs">
              {auditTrail.map((a) => <li key={a.id}><span className="text-faint">{fm.dateTime(a.at)}</span><br /><span className="text-muted">{a.summary}</span></li>)}
            </ol>
          </Section>

          <section className="card border-danger/25 no-print">
            <h2 className="mb-2 text-sm font-semibold text-danger">{t("filament.danger.title")}</h2>
            <p className="mb-3 text-xs text-muted">{t("filament.danger.text")}</p>
            <form action={deleteProfileAction}><input type="hidden" name="id" value={p.id} /><button className="btn btn-danger btn-sm">{t("filament.danger.delete")}</button></form>
          </section>
        </div>
      </div>
    </>
  );
}

async function SpoolForm({ s, profileId, defaultWeight }: { s?: import("@/db/schema").Spool; profileId: number; defaultWeight?: number | null }) {
  const { t } = await getT();
  return (
    <form action={s ? updateSpoolAction : addSpoolAction} className="mt-3 grid gap-2 sm:grid-cols-4">
      <input type="hidden" name="profileId" value={profileId} />
      {s && <input type="hidden" name="spoolId" value={s.id} />}
      <label><span className="label">{t("spool.form.status")}</span><select name="status" defaultValue={s?.status ?? "sealed"} className="input">{SPOOL_STATUSES.map((x) => <option key={x} value={x}>{t(spoolStatusKey(x))}</option>)}</select></label>
      <label><span className="label">{t("spool.form.initialWeight")}</span><input name="initialWeightG" inputMode="decimal" defaultValue={s?.initialWeightG ?? defaultWeight ?? ""} className="input" /></label>
      <label><span className="label">{t("spool.form.remaining")}</span><input name="remainingG" inputMode="decimal" defaultValue={s?.remainingG ?? ""} className="input" placeholder={t("spool.form.remainingPlaceholder")} /></label>
      <label><span className="label">{t("spool.form.remainingBasis")}</span><select name="remainingOrigin" defaultValue={s?.remainingOrigin ?? ""} className="input"><option value="">—</option><option value="measured">{t("spool.form.measured")}</option><option value="estimate">{t("common.estimate")}</option></select></label>
      <label><span className="label">{t("spool.form.receivedAt")}</span><input type="date" name="receivedAt" defaultValue={s?.receivedAt?.slice(0, 10) ?? ""} className="input" /></label>
      <label><span className="label">{t("spool.form.openedAt")}</span><input type="date" name="openedAt" defaultValue={s?.openedAt?.slice(0, 10) ?? ""} className="input" /></label>
      <label><span className="label">{t("spool.location")}</span><input name="location" defaultValue={s?.location ?? ""} className="input" placeholder={t("spool.locationPlaceholder")} /></label>
      <label><span className="label">{t("spool.form.storage")}</span><input name="storageMethod" defaultValue={s?.storageMethod ?? ""} className="input" placeholder={t("spool.form.storagePlaceholder")} /></label>
      <label className="sm:col-span-2"><span className="label">{t("spool.moisture")}</span><input name="moistureState" defaultValue={s?.moistureState ?? ""} className="input" /></label>
      <label className="sm:col-span-2"><span className="label">{t("common.note")}</span><input name="notes" defaultValue={s?.notes ?? ""} className="input" /></label>
      <div className="sm:col-span-4"><button className="btn btn-primary btn-sm">{s ? t("spool.form.save") : t("spool.form.add")}</button></div>
    </form>
  );
}

async function PrintProfileForm({ profileId, pp }: { profileId: number; pp?: PrintProfileRow }) {
  const { t } = await getT();
  return (
    <form action={savePrintProfileAction} className="mt-3 grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="profileId" value={profileId} />
      {pp && <input type="hidden" name="printProfileId" value={pp.id} />}
      <label className="sm:col-span-2"><span className="label">{t("filament.ppForm.name")}</span><input name="name" required defaultValue={pp?.name ?? ""} className="input" placeholder={t("filament.ppForm.namePlaceholder")} /></label>
      <label><span className="label">{t("filament.ppForm.slicer")}</span><input name="slicer" defaultValue={pp?.slicer ?? "Orca Slicer"} className="input" /></label>
      <label><span className="label">{t("filament.ppForm.printer")}</span><input name="printer" defaultValue={pp?.printer ?? ""} className="input" /></label>
      <label><span className="label">{t("filament.ppForm.nozzleDia")}</span><input name="nozzleDiameterMm" inputMode="decimal" defaultValue={pp?.nozzleDiameterMm ?? "0.4"} className="input" /></label>
      <label><span className="label">{t("filament.ppForm.nozzleMaterial")}</span><input name="nozzleMaterial" defaultValue={pp?.nozzleMaterial ?? ""} className="input" /></label>
      <label><span className="label">{t("filament.ppForm.version")}</span><input name="version" defaultValue={pp?.version ?? ""} className="input" /></label>
      <label><span className="label">{t("specs.col.origin")}</span><select name="origin" defaultValue={pp?.origin ?? "own"} className="input">{ORIGINS.map((o) => <option key={o} value={o}>{t(originKey(o))}</option>)}</select></label>
      <label className="sm:col-span-2"><span className="label">{t("filament.ppForm.values")} <span className="font-normal text-faint">{t("filament.ppForm.valuesHint")}</span></span>
        <textarea name="settings" rows={6} className="input mono" defaultValue={pp ? Object.entries(pp.settings).map(([k, v]) => `${k}: ${v}`).join("\n") : "nozzle_temp_c: \nbed_temp_c: \nchamber_temp_c: \nfan_pct: \nflow_ratio: \npressure_advance: "} />
      </label>
      <label className="sm:col-span-2"><span className="label">{t("common.note")}</span><textarea name="notes" rows={2} className="input" defaultValue={pp?.notes ?? ""} /></label>
      <div className="sm:col-span-2"><button className="btn btn-primary btn-sm">{t("filament.ppForm.save")}</button></div>
    </form>
  );
}
