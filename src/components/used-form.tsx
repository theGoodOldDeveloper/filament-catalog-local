import { addSpoolEventAction } from "@/app/actions";
import { getT } from "@/i18n/server";

/** A gép helyi dátuma (ÉÉÉÉ-HH-NN) – az alapértelmezett „ma”; az UTC-dátum éjfél körül másik napot adhatna. */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * „Használtam” gomb + kis űrlap egy tekercshez: felhasznált gramm (a szeletelő becslése), dátum, megjegyzés.
 * A meglévő `addSpoolEventAction`-t hívja „print_use” típussal; a maradék becslésként frissül, a bontatlan tekercs „bontott” lesz.
 * JS nélkül is működik (<details>). `returnTo`: a katalógusból indítva oda tér vissza.
 */
export async function UsedForm({ spoolId, profileId, code, returnTo }: { spoolId: number; profileId: number; code: string; returnTo?: string }) {
  const { t } = await getT();
  return (
    <details className="group relative">
      <summary className="btn btn-sm inline-flex cursor-pointer list-none" aria-label={t("spool.use.aria", { code })}>{t("spool.use.button")}</summary>
      <form action={addSpoolEventAction} className="mt-2 grid w-64 max-w-full gap-2 rounded-xl border border-line-strong bg-surface p-3 text-left">
        <input type="hidden" name="profileId" value={profileId} />
        <input type="hidden" name="spoolId" value={spoolId} />
        <input type="hidden" name="type" value="print_use" />
        {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
        <p className="text-sm font-semibold">{t("spool.use.title")}</p>
        <label><span className="label">{t("spool.use.grams")}</span>
          <input name="usedG" inputMode="decimal" className="input" placeholder={t("spool.use.gramsPlaceholder")} required autoComplete="off" />
          <span className="mt-1 block text-[11px] leading-snug text-faint">{t("spool.use.gramsHint")}</span>
        </label>
        <label><span className="label">{t("spool.use.date")}</span><input type="date" name="at" defaultValue={localToday()} className="input" /></label>
        <label><span className="label">{t("spool.use.note")}</span><input name="note" className="input" placeholder={t("spool.use.notePlaceholder")} maxLength={500} /></label>
        <p className="text-[11px] leading-snug text-faint">{t("spool.use.hint")}</p>
        <button className="btn btn-primary btn-sm">{t("spool.use.submit")}</button>
      </form>
    </details>
  );
}
