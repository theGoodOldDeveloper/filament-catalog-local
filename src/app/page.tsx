import Link from "next/link";
import { BarList, Donut, Gauge, familyColor } from "@/components/charts";
import { DemoBadge, Empty, PageHeader, Section, StockValue, Swatch } from "@/components/ui";
import { getT } from "@/i18n/server";
import { LOW_STOCK_G, familyLabel } from "@/lib/fields";
import { makeFormat } from "@/lib/format";
import { dashboardStats } from "@/server/catalog";

export default async function DashboardPage() {
  const { t, locale } = await getT();
  const f = makeFormat(locale);
  const s = dashboardStats();
  const stats = [
    { label: t("dash.stat.total"), value: f.num(s.spoolCount), sub: t("dash.stat.total.sub", { active: s.activeCount, empty: s.emptyCount }), href: "/catalog?view=spools" },
    { label: t("dash.stat.stock"), value: f.g(s.stockG), sub: s.unknownCount ? t("dash.stat.stock.unknown", { count: s.unknownCount }) : t("dash.stat.stock.allKnown"), href: "/catalog?status=instock" },
    { label: t("dash.stat.sealed"), value: f.num(s.sealedCount), sub: t("dash.stat.sealed.sub", { nominal: f.g(s.nominalG) }), href: "/catalog?status=sealed" },
    { label: t("dash.stat.open"), value: f.num(s.openCount), sub: t("dash.stat.open.sub", { low: s.lowSpools.length, limit: LOW_STOCK_G }), href: "/catalog?status=open" },
    { label: t("dash.stat.profiles"), value: f.num(s.profileCount), sub: t("dash.stat.profiles.sub", { count: s.byFamily.length }), href: "/catalog" },
  ];

  return (
    <>
      <PageHeader eyebrow={t("dash.eyebrow")} title={t("dash.title")} sub={t("dash.sub")}>
        <Link href="/purchases/new" className="btn">{t("nav.newPurchase")}</Link>
        <Link href="/filaments/new" className="btn btn-primary">{t("nav.newFilament")}</Link>
      </PageHeader>

      {s.hasDemo && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-muted animate-fade">
          <DemoBadge />
          <span>{t("dash.demoNotice")}</span>
        </div>
      )}

      <div className="stagger mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((st) => (
          <Link key={st.label} href={st.href} className="card card-hover block !p-4">
            <p className="h-eyebrow">{st.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-[28px]">{st.value}</p>
            <p className="mt-1 text-xs text-muted">{st.sub}</p>
          </Link>
        ))}
      </div>

      <div className="stagger grid gap-5 xl:grid-cols-3">
        <Section title={t("dash.byFamily.title")} className="xl:col-span-2">
          {s.byFamily.length === 0 ? (
            <Empty title={t("dash.byFamily.empty")}>{t("dash.byFamily.emptyHint")}</Empty>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <Donut total={s.stockG} centerLabel={t("dash.byFamily.center")} data={s.byFamily.map((fam) => ({ label: familyLabel(t, fam.family), value: fam.grams, color: familyColor(fam.family) }))} />
              <div className="w-full min-w-0 flex-1">
                <BarList rows={s.byFamily.map((fam) => ({ label: familyLabel(t, fam.family), value: fam.grams, color: familyColor(fam.family), right: `${t("dash.spools", { count: fam.spools })} · ${f.g(fam.grams)}` }))} />
                <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-xs">
                  <div><dt className="text-faint">{t("dash.measured")}</dt><dd className="mt-0.5 text-sm font-medium tabular-nums">{f.g(s.measuredG)}</dd></div>
                  <div><dt className="text-faint">{t("dash.estimated")}</dt><dd className="mt-0.5 text-sm font-medium tabular-nums text-warn">≈ {f.g(s.estimateG)}</dd></div>
                  <div><dt className="text-faint">{t("dash.nominalSealed")}</dt><dd className="mt-0.5 text-sm font-medium tabular-nums">{f.g(s.nominalG)}</dd></div>
                </dl>
              </div>
            </div>
          )}
        </Section>

        <Section title={t("dash.low.title")} action={<Link href="/catalog?status=low" className="text-xs text-muted hover:text-fg">{t("dash.all")}</Link>}>
          {s.lowSpools.length === 0 ? (
            <p className="text-sm text-muted">{t("dash.low.none", { limit: LOW_STOCK_G })}</p>
          ) : (
            <ul className="space-y-3">
              {s.lowSpools.slice(0, 6).map((sp) => (
                <li key={sp.id}>
                  <Link href={`/filaments/${sp.profileId}#keszlet`} className="group flex items-center gap-3">
                    <Swatch hex={sp.profile.colorHex} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium group-hover:text-accent-soft">{sp.profile.productName} <span className="text-faint">· {sp.profile.colorName ?? "—"}</span></span>
                      <span className="mt-1 block"><Gauge value={sp.stockG} max={sp.initialWeightG} basis={sp.stockBasis} /></span>
                    </span>
                    <span className="text-right text-xs"><span className="mono block text-faint">{sp.code}</span><StockValue g={sp.stockG} basis={sp.stockBasis} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t("dash.open.title")} className="xl:col-span-2" action={<Link href="/catalog?view=spools&status=open" className="text-xs text-muted hover:text-fg">{t("dash.all")}</Link>}>
          {s.openSpools.length === 0 ? (
            <p className="text-sm text-muted">{t("dash.open.none")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {s.openSpools.slice(0, 8).map((sp) => (
                <Link key={sp.id} href={`/filaments/${sp.profileId}#keszlet`} className="flex items-center gap-3 rounded-xl border border-line bg-bg/40 p-3 transition hover:border-line-strong hover:bg-raised/60">
                  <Swatch hex={sp.profile.colorHex} size={38} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium"><span className="truncate">{sp.profile.manufacturer} {sp.profile.productName}</span></span>
                    <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted">
                      <span className="mono">{sp.code}</span>
                      <StockValue g={sp.stockG} basis={sp.stockBasis} />
                    </span>
                    <span className="mt-1.5 block"><Gauge value={sp.stockG} max={sp.initialWeightG} basis={sp.stockBasis} /></span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Section>

        <Section title={t("dash.recent.title")} action={<Link href="/purchases" className="text-xs text-muted hover:text-fg">{t("dash.all")}</Link>}>
          {s.recentPurchases.length === 0 ? (
            <p className="text-sm text-muted">{t("dash.recent.none")}</p>
          ) : (
            <ol className="relative space-y-4 border-l border-line pl-4">
              {s.recentPurchases.map((p) => (
                <li key={p.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {p.seller ?? t("dash.recent.unknownSeller")} {p.isDemo && <DemoBadge />}
                  </p>
                  <p className="text-xs text-muted">{f.date(p.purchasedAt)} · {t("dash.spools", { count: p.spoolCount })}{p.itemsValue !== null ? ` · ${f.money(p.itemsValue, p.currency)}` : ` · ${t("dash.recent.priceUnknown")}`}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-faint">{p.labels.join(" · ")}</p>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </div>
    </>
  );
}
