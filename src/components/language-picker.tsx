import { setLanguageAction } from "@/i18n/actions";
import { LOCALES, tFor } from "@/i18n/core";

/**
 * Első indítási ablak: teljes képernyős nyelvválasztó. Szándékosan kétnyelvű (a felhasználó még nem választott),
 * ezért mindkét nyelv fordítóját használja. JS nélkül is működik (szerver-akció űrlap).
 */
export function LanguagePicker() {
  const tt = LOCALES.map((l) => ({ l, t: tFor(l) }));
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="fr-title" className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-bg p-6">
      <div className="w-full max-w-xl text-center">
        <h1 id="fr-title" className="text-3xl font-semibold tracking-tight">{tt.map((x) => x.t("firstRun.title")).join(" / ")}</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {tt.map(({ l, t }) => (
            <form key={l} action={setLanguageAction.bind(null, l)}>
              <button type="submit" lang={l} className="btn btn-primary w-full flex-col !py-6 text-2xl font-semibold">
                <span className="block">{t(`lang.name.${l}`)}</span>
                <span className="mt-1 block text-xs font-normal uppercase tracking-widest opacity-80">{l}</span>
              </button>
            </form>
          ))}
        </div>
        <div className="mt-8 space-y-3 text-sm text-muted">
          {tt.map(({ l, t }) => <p key={l} lang={l}>{t("firstRun.body")}</p>)}
        </div>
      </div>
    </div>
  );
}
