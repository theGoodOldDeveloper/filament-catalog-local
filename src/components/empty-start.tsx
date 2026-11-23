import Link from "next/link";
import { loadDemoAction } from "@/app/actions";
import { getT } from "@/i18n/server";

/** Üres állapot a katalógus / vásárlások oldalon: új vásárlás felvétele vagy a demo adatok betöltése (DEMO jelölésű, törölhető). */
export async function EmptyStart({ title }: { title: string }) {
  const { t } = await getT();
  return (
    <div className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xl text-sm text-muted">{t("demo.hint")}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Link href="/purchases/new" className="btn btn-primary">{t("demo.add")}</Link>
        <form action={loadDemoAction}><button type="submit" className="btn">{t("demo.load")}</button></form>
      </div>
    </div>
  );
}
