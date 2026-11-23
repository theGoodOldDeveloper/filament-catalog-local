import { EquipmentForms } from "@/components/equipment-form";
import { PageHeader } from "@/components/ui";
import { getT } from "@/i18n/server";
import { getEquipment } from "@/server/equipment";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("nav.equipment") };
}

export default async function EquipmentPage() {
  const { t } = await getT();
  return (
    <>
      <PageHeader eyebrow={t("equipment.eyebrow")} title={t("nav.equipment")} sub={t("equipment.sub")} />
      <aside className="mb-5 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3.5">
        <h2 className="text-sm font-semibold text-accent-soft">{t("equipment.why.title")}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{t("equipment.why.body")}</p>
      </aside>
      <EquipmentForms equipment={getEquipment()} />
    </>
  );
}
