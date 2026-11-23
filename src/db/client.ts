import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

// Az adatbázisréteg egyetlen belépési pontja. A lekérdezések a src/server/* modulokban
// élnek, a UI soha nem importálja közvetlenül a drivert – így a driver cserélhető.

export type DB = BetterSQLite3Database<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
/** Kapcsolat vagy futó tranzakció – a szerverfüggvények bármelyiket elfogadják. */
export type DBX = DB | Tx;

interface Holder {
  sqlite: Database.Database;
  db: DB;
  file: string;
}

const g = globalThis as unknown as { __filamentCatalogDb?: Holder };

export function resolveDbFile(url = process.env.DATABASE_URL ?? "file:./data/filament-catalog.db"): string {
  const raw = url.startsWith("file:") ? url.slice(5) : url;
  if (raw === ":memory:") return raw;
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), raw);
}

export function resolveUploadDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOAD_DIR ?? "./data/uploads");
}

function open(): Holder {
  const file = resolveDbFile();
  if (file !== ":memory:") fs.mkdirSync(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("synchronous = NORMAL");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve(/*turbopackIgnore: true*/ process.cwd(), "drizzle") });
  return { sqlite, db, file };
}

function holder(): Holder {
  const file = resolveDbFile();
  if (g.__filamentCatalogDb && g.__filamentCatalogDb.file !== file) closeDb();
  if (!g.__filamentCatalogDb) g.__filamentCatalogDb = open();
  return g.__filamentCatalogDb;
}

export function getDb(): DB {
  return holder().db;
}

/** Nyers kapcsolat – kizárólag FTS5 lekérdezéshez és backuphoz (mindig paraméterezve). */
export function getSqlite(): Database.Database {
  return holder().sqlite;
}

export function closeDb(): void {
  if (g.__filamentCatalogDb) {
    g.__filamentCatalogDb.sqlite.close();
    g.__filamentCatalogDb = undefined;
  }
}

export { schema };
