"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";

/** „Kilépés” gomb: csak akkor jelenik meg, ha az app a Windows-indítóval, ablak nélkül fut (/api/quit GET: enabled). */
export function QuitButton() {
  const t = useT();
  const [enabled, setEnabled] = useState(false);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/quit", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && setEnabled(j?.enabled === true))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!enabled && !stopped) return null;

  async function quit() {
    if (!window.confirm(t("nav.quit.confirm"))) return;
    try {
      await fetch("/api/quit", { method: "POST", headers: { "x-fc-quit": "1" } });
    } catch {
      /* a szerver a válasz közben leállhat */
    }
    setStopped(true);
  }

  return (
    <>
      <button type="button" onClick={quit} className="btn w-full">{t("nav.quit")}</button>
      {stopped && (
        <div role="alert" className="fixed inset-0 z-50 flex items-center justify-center bg-bg/95 p-6 text-center">
          <div>
            <p className="text-lg font-semibold">{t("nav.quit.done.title")}</p>
            <p className="mt-2 text-sm text-muted">{t("nav.quit.done.text")}</p>
          </div>
        </div>
      )}
    </>
  );
}
