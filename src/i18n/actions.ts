"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { setSetting } from "@/server/settings";
import { LANG_COOKIE, isLocale } from "./core";

/** Nyelvváltás: beállítás-tábla + süti, majd az egész felület újrarenderelése. */
export async function setLanguageAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  setSetting("language", locale);
  (await cookies()).set(LANG_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
