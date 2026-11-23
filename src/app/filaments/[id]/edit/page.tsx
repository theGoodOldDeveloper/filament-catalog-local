import { notFound } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";
import { getT } from "@/i18n/server";
import { FIELDS } from "@/lib/fields";
import { getProfileFull } from "@/server/profiles";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("filament.edit.meta") };
}

export default async function EditFilamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const full = /^\d+$/.test(id) ? getProfileFull(Number(id)) : null;
  if (!full) notFound();
  const initial: Record<string, string> = {};
  const origins: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = (full.profile as Record<string, unknown>)[f.key];
    if (v !== null && v !== undefined) initial[f.key] = typeof v === "boolean" ? (v ? "yes" : "no") : String(v);
    if (full.provenance[f.key]) origins[f.key] = full.provenance[f.key].origin;
  }
  return (
    <>
      <PageHeader eyebrow={t("filament.edit.eyebrow")} title={`${full.profile.manufacturer} ${full.profile.productName}`} sub={full.profile.colorName ?? undefined} />
      <ProfileForm
        id={full.profile.id}
        initial={initial}
        origins={origins}
        specs={full.specs.map((s) => ({ key: s.key, label: s.label, value: String(s.valueNum ?? s.valueText ?? ""), unit: s.unit ?? "", testMethod: s.testMethod ?? "", origin: s.origin ?? "" }))}
      />
    </>
  );
}
