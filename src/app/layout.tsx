import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { LanguagePicker } from "@/components/language-picker";
import { Nav } from "@/components/nav";
import { TopBar } from "@/components/top-bar";
import { I18nProvider } from "@/i18n/client";
import { getT, savedLanguage } from "@/i18n/server";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: { default: t("app.name"), template: `%s · ${t("app.name")}` },
    description: t("app.description"),
    robots: { index: false, follow: false },
  };
}
export const viewport: Viewport = { themeColor: "#0a0c11", colorScheme: "dark" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { t, locale } = await getT();
  // első indítás: amíg nincs mentett nyelv, csak a nyelvválasztó ablak látszik
  const firstRun = savedLanguage() === null;
  return (
    <html lang={locale}>
      <body>
        {firstRun ? (
          <LanguagePicker />
        ) : (
          <I18nProvider locale={locale}>
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 btn btn-primary">{t("a11y.skipToContent")}</a>
            <Nav />
            <main id="main" className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:pl-[17rem] lg:pr-8 lg:py-8">
              <TopBar />
              {children}
            </main>
          </I18nProvider>
        )}
      </body>
    </html>
  );
}
