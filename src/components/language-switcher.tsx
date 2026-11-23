"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLanguageAction } from "@/i18n/actions";
import { LOCALES } from "@/i18n/core";
import { useLocale, useT } from "@/i18n/client";

/** Nyelvváltó (HU | EN): süti + DB frissül, majd újratölt. */
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label={t("lang.switcher.aria")} className="inline-flex overflow-hidden rounded-lg border border-line text-xs font-semibold" aria-busy={pending}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          title={t(`lang.name.${l}`)}
          aria-pressed={l === locale}
          disabled={pending}
          onClick={() => {
            if (l === locale) return;
            start(async () => {
              await setLanguageAction(l);
              router.refresh();
            });
          }}
          className={`px-3 py-1.5 uppercase transition ${l === locale ? "bg-accent/15 text-accent-soft" : "text-muted hover:bg-raised hover:text-fg"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
