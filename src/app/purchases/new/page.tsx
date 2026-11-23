import { PurchaseForm } from "@/components/purchase-form";
import { PageHeader } from "@/components/ui";
import { getT } from "@/i18n/server";
import { todayIso } from "@/lib/format";
import { norm } from "@/lib/normalize";
import { loadCatalog } from "@/server/catalog";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("purchases.new.title") };
}

export default async function NewPurchasePage() {
  const { t, locale } = await getT();
  const profiles = loadCatalog()
    .map(({ profile: p }) => ({
      id: p.id,
      label: [p.manufacturer, p.productName, p.colorName, p.netWeightG ? `${p.netWeightG} g` : null, p.sku ? `[${p.sku}]` : null].filter(Boolean).join(" · "),
      search: norm([p.manufacturer, p.brand, p.productName, p.colorName, p.sku, p.materialFamily, p.materialNameRaw].join(" ")),
      netWeightG: p.netWeightG,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
  return (
    <>
      <PageHeader eyebrow={t("common.manualEntry")} title={t("purchases.new.title")} sub={t("purchases.new.sub")} />
      <PurchaseForm profiles={profiles} today={todayIso()} />
    </>
  );
}
