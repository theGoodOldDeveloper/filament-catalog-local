import Link from "next/link";
import type { ReactNode } from "react";
import { getT } from "@/i18n/server";
import { ORIGINS, originKey, originShortKey, spoolStatusKey, type Origin } from "@/lib/fields";
import { fmtG, safeHex } from "@/lib/format";

/** Filament-tekercs színminta. A szín csak validált hex lehet. */
export async function Swatch({ hex, size = 40, label }: { hex?: string | null; size?: number; label?: string }) {
  const c = safeHex(hex);
  const { t } = await getT();
  return (
    <span className="spool relative inline-block shrink-0" style={{ width: size, height: size }} role="img" aria-label={label ?? (c ? t("ui.swatch.color", { hex: c }) : t("ui.swatch.none"))}>
      <span
        className="spool-disc absolute inset-0 rounded-full"
        style={{
          background: c
            ? `repeating-conic-gradient(from 0deg, ${c} 0deg 14deg, color-mix(in oklab, ${c} 82%, #000) 14deg 28deg)`
            : "repeating-conic-gradient(from 0deg, #2a3040 0deg 14deg, #1d2230 14deg 28deg)",
          boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.14), 0 4px 14px -6px rgb(0 0 0 / 0.8)",
        }}
      />
      <span className="absolute rounded-full border border-white/10 bg-bg" style={{ inset: size * 0.3 }} />
      {!c && <span className="absolute inset-0 grid place-items-center text-[10px] text-faint">?</span>}
    </span>
  );
}

export async function OriginBadge({ origin, compact = true }: { origin?: Origin | string | null; compact?: boolean }) {
  if (!origin || !(ORIGINS as readonly string[]).includes(origin)) return null;
  const { t } = await getT();
  const o = origin as Origin;
  const cls = o === "estimate" ? "badge-estimate" : o === "manufacturer" ? "badge-teal" : o === "own" ? "badge-ok" : o === "email" ? "badge-info" : "";
  return (
    <span className={`badge ${cls} !px-1.5 !text-[10px] !leading-4`} title={t(originKey(o))}>
      {compact ? t(originShortKey(o)) : t(originKey(o))}
    </span>
  );
}

export async function StatusBadge({ status }: { status: string }) {
  const cls = status === "sealed" ? "badge-info" : status === "open" ? "badge-ok" : status === "empty" ? "" : "badge-danger";
  const { t } = await getT();
  return <span className={`badge ${cls}`}>{t(spoolStatusKey(status))}</span>;
}

export async function DemoBadge() {
  const { t } = await getT();
  return <span className="badge badge-warn" title={t("ui.demo.title")}>{t("ui.demo.badge")}</span>;
}

/** Készletérték a mérés alapjának jelölésével – a becslés és a névleges érték mindig látszik. */
export async function StockValue({ g, basis }: { g: number | null; basis: "measured" | "estimate" | "nominal" | "unknown" }) {
  const { t, locale } = await getT();
  if (g === null || basis === "unknown") return <span className="text-faint" title={t("ui.stock.unmeasuredTitle")}>{t("ui.stock.unmeasured")}</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="tabular-nums">{basis === "estimate" ? "≈ " : ""}{fmtG(g, locale)}</span>
      {basis === "estimate" && <span className="badge badge-estimate !px-1.5 !text-[10px] !leading-4">{t("ui.stock.estimate")}</span>}
      {basis === "nominal" && <span className="badge !px-1.5 !text-[10px] !leading-4" title={t("ui.stock.nominalTitle")}>{t("ui.stock.nominal")}</span>}
    </span>
  );
}

export function PageHeader({ eyebrow, title, children, sub }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-fade">
      <div className="min-w-0">
        {eyebrow && <p className="h-eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1.5 max-w-3xl text-sm text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 no-print">{children}</div>}
    </header>
  );
}

export function Section({ title, action, children, id, className = "" }: { title: ReactNode; action?: ReactNode; children: ReactNode; id?: string; className?: string }) {
  return (
    <section id={id} className={`card scroll-mt-24 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1.5 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return (
    <div role={err ? "alert" : "status"} className={`mb-5 rounded-xl border px-4 py-3 text-sm animate-fade ${err ? "border-danger/40 bg-danger/10 text-danger" : "border-ok/35 bg-ok/10 text-ok"}`}>
      {err ?? ok}
    </div>
  );
}

export function ExtLink({ href, children }: { href: string | null | undefined; children?: ReactNode }) {
  if (!href || !/^https?:\/\//i.test(href)) return <span className="text-faint">—</span>;
  return (
    <a className="link break-all" href={href} target="_blank" rel="noopener noreferrer nofollow">
      {children ?? href}
    </a>
  );
}

export function ProfileLink({ id, children, className = "" }: { id: number; children: ReactNode; className?: string }) {
  return <Link href={`/filaments/${id}`} className={`hover:text-accent-soft ${className}`}>{children}</Link>;
}
