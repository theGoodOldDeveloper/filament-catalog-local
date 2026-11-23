import { KOFI_URL, PRO_FORM_URL } from "@/config/site";
import { getT } from "@/i18n/server";
import { LanguageSwitcher } from "./language-switcher";
import { ProButton } from "./pro-button";

/** Felső sáv a tartalom fölött: középen a Ko-fi gomb, jobbra a PRO gomb és a nyelvváltó. Telefonon a Ko-fi gomb külön sorba kerül. */
export async function TopBar() {
  const { t } = await getT();
  return (
    <div className="mb-4 flex flex-wrap items-center justify-end gap-x-2 gap-y-2 no-print md:grid md:grid-cols-[1fr_auto_1fr]">
      <div className="hidden md:block" />
      <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" aria-label={t("kofi.aria")}
        className="btn btn-sm order-last w-full justify-center text-center md:order-none md:w-auto">
        {t("kofi.button")}
      </a>
      <div className="flex items-center gap-2 md:justify-self-end">
        <ProButton formUrl={PRO_FORM_URL} />
        <LanguageSwitcher />
      </div>
    </div>
  );
}
