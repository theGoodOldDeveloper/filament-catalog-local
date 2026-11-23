import Link from "next/link";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="h-eyebrow">404</p>
      <h1 className="mt-2 text-2xl font-semibold">{t("notFound.title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("notFound.body")}</p>
      <Link href="/catalog" className="btn btn-primary mt-6">{t("notFound.back")}</Link>
    </div>
  );
}
