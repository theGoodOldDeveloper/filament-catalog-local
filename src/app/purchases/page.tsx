import Link from "next/link";
import { deletePurchaseAction } from "@/app/actions";
import { EmptyStart } from "@/components/empty-start";
import { DemoBadge, Flash, PageHeader, ProfileLink, Swatch } from "@/components/ui";
import { getT } from "@/i18n/server";
import { rich } from "@/i18n/rich";
import { makeFormat } from "@/lib/format";
import { loadCatalog } from "@/server/catalog";
import { listPurchases, spoolCost } from "@/server/stock";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("nav.purchases") };
}

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const { t, locale } = await getT();
  const f = makeFormat(locale);
  const purchases = listPurchases(300);
  const profiles = new Map(loadCatalog().map((r) => [r.profile.id, r.profile]));
  return (
    <>
      <PageHeader eyebrow={t("purchases.eyebrow")} title={t("nav.purchases")} sub={t("purchases.sub")}>
        <Link href="/purchases/new" className="btn btn-primary">{t("nav.newPurchase")}</Link>
      </PageHeader>
      <Flash ok={ok} err={err} />
      {purchases.length === 0 ? <EmptyStart title={t("purchases.empty")} /> : (
        <div className="stagger space-y-4">
          {purchases.map((pu) => {
            const qty = pu.items.reduce((a, i) => a + i.quantity, 0);
            const known = pu.items.every((i) => i.unitPrice !== null);
            const value = pu.items.reduce((a, i) => a + (i.unitPrice ?? 0) * i.quantity, 0);
            return (
              <article key={pu.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold">{pu.seller ?? t("purchases.unknownSeller")} {pu.isDemo && <DemoBadge />}
                      <span className="badge">{t(`purchase.source.${pu.sourceKind === "purchase_email" ? "email" : pu.sourceKind === "web" ? "web" : "manual"}`)}</span>
                    </h2>
                    <p className="mt-0.5 text-sm text-muted">{f.date(pu.purchasedAt)}{pu.orderReference ? <> · {rich(t("purchases.orderRef", { ref: pu.orderReference }), [(c) => <span className="mono">{c}</span>])}</> : null} · {t("common.spools", { count: qty })}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-right text-xs sm:grid-cols-4">
                    <div><dt className="text-faint">{t("purchases.items")}</dt><dd className="text-sm font-medium tabular-nums">{known ? f.money(value, pu.currency) : t("purchases.partlyUnknown")}</dd></div>
                    <div><dt className="text-faint">{t("purchases.shipping")}</dt><dd className="text-sm tabular-nums">{f.money(pu.shippingTotal, pu.currency)}</dd></div>
                    <div><dt className="text-faint">{t("purchases.discount")}</dt><dd className="text-sm tabular-nums">{pu.discountTotal != null ? `− ${f.money(pu.discountTotal, pu.currency)}` : "—"}</dd></div>
                    <div><dt className="text-faint">{t("purchases.total")}</dt><dd className="text-sm font-semibold tabular-nums">{pu.orderTotal != null ? f.money(pu.orderTotal, pu.currency) : <span className="font-normal text-faint">{t("common.unknown")}</span>}</dd></div>
                  </dl>
                </div>
                <ul className="mt-4 divide-y divide-line/60 border-t border-line/60">
                  {pu.items.map((i) => {
                    const p = profiles.get(i.profileId);
                    const c = spoolCost(i, pu, pu.items);
                    return (
                      <li key={i.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                        <Swatch hex={p?.colorHex} size={28} />
                        <ProfileLink id={i.profileId} className="min-w-0 flex-1 font-medium">{p ? `${p.manufacturer} ${p.productName}` : `#${i.profileId}`} <span className="font-normal text-muted">{p?.colorName ? `· ${p.colorName}` : ""}{i.variant ? ` · ${i.variant}` : ""}</span></ProfileLink>
                        <span className="tabular-nums text-muted">{t("purchases.item.qty", { n: i.quantity })}</span>
                        <span className="w-28 text-right tabular-nums">{c.unitPrice != null ? f.money(c.unitPrice, pu.currency) : <span className="text-faint">{t("purchases.item.priceUnknown")}</span>}</span>
                        <span className="w-44 text-right text-xs tabular-nums text-muted">{c.effective != null ? <>{rich(t("purchases.item.effective", { price: f.money(c.effective, pu.currency) }), [(x) => <span className="text-fg">{x}</span>])} {c.computed && <span className="badge badge-estimate !px-1.5 !text-[10px] !leading-4">{t("common.computed")}</span>}</> : t("purchases.item.notComputable")}</span>
                      </li>
                    );
                  })}
                </ul>
                {pu.notes && <p className="mt-2 text-xs text-muted">{pu.notes}</p>}
                <form action={deletePurchaseAction} className="mt-3 no-print">
                  <input type="hidden" name="id" value={pu.id} />
                  <details><summary className="text-xs text-faint hover:text-danger">{t("purchases.delete.summary")}</summary>
                    <p className="mt-2 text-xs text-muted">{t("purchases.delete.warning", { count: qty })}</p>
                    <button className="btn btn-danger btn-sm mt-2">{t("purchases.delete.button")}</button>
                  </details>
                </form>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
