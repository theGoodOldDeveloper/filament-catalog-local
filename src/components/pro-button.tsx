"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useT } from "@/i18n/client";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const FEATURES = ["hosting", "mail", "research", "updates"] as const;

/**
 * „PRO” gomb + felugró ablak. Az ablak: role="dialog" aria-modal, Esc zár, fókuszcsapda (Tab/Shift+Tab az ablakon belül marad),
 * záráskor a fókusz visszakerül a gombra. Az „Értesítést kérek” gomb csak akkor jelenik meg, ha van űrlap-URL;
 * az app semmilyen adatot nem küld el, a feliratkozás a külső űrlapon történik.
 */
export function ProButton({ formUrl }: { formUrl: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const cur = document.activeElement;
      if (!panel.current.contains(cur)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && cur === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && cur === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  return (
    <>
      <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={t("pro.button.aria")}
        className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-bold tracking-wider text-accent-soft transition hover:bg-accent/20">
        {t("pro.button")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm no-print" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId} className="card w-full max-w-lg animate-fade !p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-xl font-semibold tracking-tight">{t("pro.title")}</h2>
              <button type="button" onClick={close} className="btn btn-ghost btn-sm -mr-2 -mt-1" aria-label={t("pro.close")}>✕</button>
            </div>
            <p id={descId} className="mt-2 text-sm leading-relaxed text-muted">{t("pro.lead")}</p>
            <h3 className="h-eyebrow mt-5">{t("pro.features.title")}</h3>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-muted">
              {FEATURES.map((f) => (
                <li key={f} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />{t(`pro.feature.${f}`)}</li>
              ))}
            </ul>
            <p className="mt-5 rounded-lg border border-line bg-bg/50 px-3 py-2 text-xs leading-relaxed text-muted">{t("pro.privacy")}</p>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={close} className="btn btn-ghost">{t("pro.close")}</button>
              {formUrl && (
                <a href={formUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" title={t("pro.notify.hint")}>{t("pro.notify")} ↗</a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
