"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AUTHOR_NAME, AUTHOR_URL } from "@/config/site";
import { useT } from "@/i18n/client";
import { QuitButton } from "@/components/quit-button";

const ITEMS = [
  { href: "/", labelKey: "nav.dashboard", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/catalog", labelKey: "nav.catalog", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/purchases", labelKey: "nav.purchases", icon: "M6 6h15l-1.5 9h-12zM6 6L5 3H2M9 20a1 1 0 100-2 1 1 0 000 2zM18 20a1 1 0 100-2 1 1 0 000 2z" },
  { href: "/compare", labelKey: "nav.compare", icon: "M9 4v16M15 4v16M4 9h5M15 15h5" },
  { href: "/tuttirial", labelKey: "nav.tuttirial", icon: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM8 7h7M8 11h7" },
  { href: "/equipment", labelKey: "nav.equipment", icon: "M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.4 2.4-2.1-.6-.6-2.1z" },
  { href: "/data", labelKey: "nav.data", icon: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" },
] as const;

export function Nav() {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  // billentyűk: "/" → keresés, "g" majd betű → navigáció, "n" → új filament
  useEffect(() => {
    let gAt = 0;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (e.key === "g") {
        gAt = Date.now();
        return;
      }
      if (Date.now() - gAt < 900) {
        const map: Record<string, string> = { d: "/", k: "/catalog", v: "/purchases", o: "/compare", t: "/tuttirial", e: "/equipment", a: "/data" };
        if (map[e.key]) {
          e.preventDefault();
          router.push(map[e.key]);
        }
        gAt = 0;
        return;
      }
      if (e.key === "n") router.push("/filaments/new");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href) || (href === "/catalog" && pathname.startsWith("/filaments")));

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface/70 backdrop-blur-md lg:flex">
        <Link href="/" className="flex items-center gap-3 px-5 py-5">
          <Logo />
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight">{t("app.name")}</span>
            <span className="block text-[11px] text-faint">{t("nav.tagline")}</span>
          </span>
        </Link>
        <form action="/catalog" className="px-4 pb-3" role="search">
          <label className="relative block">
            <span className="sr-only">{t("nav.search.label")}</span>
            <input ref={searchRef} name="q" type="search" placeholder={t("nav.search.placeholder")} className="input !py-1.5 pr-9" autoComplete="off" />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line-strong px-1.5 text-[10px] text-faint">/</kbd>
          </label>
        </form>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label={t("nav.main")}>
          {ITEMS.map((it) => (
            <Link key={it.href} href={it.href} aria-current={active(it.href) ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active(it.href) ? "bg-accent/12 text-accent-soft" : "text-muted hover:bg-raised hover:text-fg"}`}>
              <Icon d={it.icon} />
              <span className="flex-1">{t(it.labelKey)}</span>
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t border-line p-4">
          <Link href="/filaments/new" className="btn btn-primary w-full">{t("nav.newFilament")}</Link>
          <Link href="/purchases/new" className="btn w-full">{t("nav.newPurchase")}</Link>
          <p className="pt-1 text-[10.5px] leading-relaxed text-faint">
            <kbd>/</kbd> {t("nav.hint.search")} · <kbd>n</kbd> {t("nav.hint.new")} · <kbd>g</kbd>+<kbd>k</kbd> {t("nav.hint.catalog")} · <kbd>g</kbd>+<kbd>t</kbd> {t("nav.hint.tuttirial")}
          </p>
          <QuitButton />
          <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer" aria-label={t("nav.author.aria", { name: AUTHOR_NAME })}
            className="block pt-1 text-[11px] text-faint transition hover:text-accent-soft">{AUTHOR_NAME} <span aria-hidden="true">↗</span></a>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2" aria-label={t("nav.homeAria")}><Logo small /></Link>
          <form action="/catalog" className="flex-1" role="search">
            <input name="q" type="search" placeholder={t("nav.search.placeholderMobile")} aria-label={t("nav.search.label")} className="input !py-1.5" autoComplete="off" />
          </form>
          <Link href="/filaments/new" className="btn btn-primary btn-sm" aria-label={t("nav.newFilamentAria")}>+</Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label={t("nav.main")}>
          {ITEMS.map((it) => (
            <Link key={it.href} href={it.href} aria-current={active(it.href) ? "page" : undefined} className={`chip shrink-0 ${active(it.href) ? "chip-on" : ""}`}>
              {t(it.labelKey)}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function Logo({ small }: { small?: boolean }) {
  const s = small ? 30 : 36;
  return (
    <span className="relative inline-block" style={{ width: s, height: s }} aria-hidden="true">
      <span className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 210deg, #ff8a3d, #ffd08a, #3fd0c0, #7aa8ff, #ff8a3d)" }} />
      <span className="absolute rounded-full bg-surface" style={{ inset: s * 0.2 }} />
      <span className="absolute rounded-full bg-accent" style={{ inset: s * 0.4 }} />
    </span>
  );
}
