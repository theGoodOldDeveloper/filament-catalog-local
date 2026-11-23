import { eq } from "drizzle-orm";
import { getDb, schema, type DBX } from "@/db/client";
import { DEFAULT_LOCALE, isLocale, tFor, type TFn } from "@/i18n/core";

/** Kulcs/érték beállítások (settings tábla). Hiányzó kulcs → null. */
export function getSetting(key: string, db: DBX = getDb()): string | null {
  return db.select().from(schema.settings).where(eq(schema.settings.key, key)).get()?.value ?? null;
}

export function setSetting(key: string, value: string, db: DBX = getDb()): void {
  const updatedAt = new Date().toISOString();
  db.insert(schema.settings).values({ key, value, updatedAt }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt } }).run();
}

/**
 * Az adatbázisba ÍRT, ember által olvasott szövegek (napló-összegzés, automatikus eseménymegjegyzés) fordítója:
 * az elmentett alapértelmezett nyelven íródnak, és később már nem fordítjuk újra őket.
 */
export function storedT(db: DBX = getDb()): TFn {
  const lang = getSetting("language", db);
  return tFor(isLocale(lang) ? lang : DEFAULT_LOCALE);
}
