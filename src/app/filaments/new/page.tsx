import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";
import { getT } from "@/i18n/server";
import { FIELDS } from "@/lib/fields";
import { getProfileFull } from "@/server/profiles";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("filament.new.title") };
}

export default async function NewFilamentPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const { t } = await getT();
  // „Másolás” – meglévő profilból indulva új változat (pl. másik szín) rögzítése
  const src = from && /^\d+$/.test(from) ? getProfileFull(Number(from)) : null;
  const initial: Record<string, string> = { diameterMm: "1.75" };
  const origins: Record<string, string> = {};
  if (src) {
    for (const f of FIELDS) {
      const v = (src.profile as Record<string, unknown>)[f.key];
      if (v !== null && v !== undefined && !["sku", "colorName", "colorCode", "colorHex", "colorDescription"].includes(f.key)) initial[f.key] = typeof v === "boolean" ? (v ? "yes" : "no") : String(v);
      if (src.provenance[f.key] && initial[f.key] !== undefined) origins[f.key] = src.provenance[f.key].origin;
    }
  }
  return (
    <>
      <PageHeader eyebrow={t("common.manualEntry")} title={src ? t("filament.new.copyTitle") : t("filament.new.title")} sub={t("filament.new.sub")} />
      <ProfileForm
        initial={initial}
        origins={origins}
        specs={(src?.specs ?? []).map((s) => ({ key: s.key, label: s.label, value: String(s.valueNum ?? s.valueText ?? ""), unit: s.unit ?? "", testMethod: s.testMethod ?? "", origin: s.origin ?? "" }))}
      />
    </>
  );
}
