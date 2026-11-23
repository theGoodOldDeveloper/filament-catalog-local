import { TuttirialView } from "@/components/tuttirial-view";
import { PageHeader } from "@/components/ui";
import { TUTTIRIAL } from "@/data/tuttirial";
import { getT } from "@/i18n/server";
import { loadCatalog } from "@/server/catalog";
import { getEquipment } from "@/server/equipment";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("tut.meta") };
}

export default async function TuttirialPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { t } = await getT();
  // saját készlet anyagcsaládonként – a kártyák ebből mutatják, miből van itthon
  const stock: Record<string, number> = {};
  for (const r of loadCatalog()) if (r.activeCount) stock[r.profile.materialFamily] = (stock[r.profile.materialFamily] ?? 0) + r.activeCount;
  return (
    <>
      <PageHeader
        eyebrow={t("tut.eyebrow")}
        title={t("nav.tuttirial")}
        sub={t("tut.sub", { count: TUTTIRIAL.length })}
      />
      <TuttirialView initialQ={(q ?? "").slice(0, 80)} stock={stock} equipment={getEquipment()} />
    </>
  );
}
