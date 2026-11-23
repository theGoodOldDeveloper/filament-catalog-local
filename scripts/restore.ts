import "./env";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { resolveDbFile } from "@/db/client";

// Használat: npm run db:restore -- ./backups/filament-catalog-YYYYMMDD-HHMMSS.db --yes
// FONTOS: előtte állítsd le az alkalmazást. A jelenlegi adatbázisról biztonsági másolat készül.
const src = process.argv[2] && !process.argv[2].startsWith("--") ? path.resolve(process.cwd(), process.argv[2]) : null;
if (!src || !fs.existsSync(src)) {
  console.error("Add meg a visszaállítandó mentés útvonalát.");
  process.exit(1);
}
if (!process.argv.includes("--yes")) {
  console.error("A visszaállítás felülírja a jelenlegi adatbázist. Megerősítéshez add hozzá: --yes");
  process.exit(1);
}

let integrity: unknown = "unreadable";
let hasTable: unknown = null;
try {
  const check = new Database(src, { readonly: true, fileMustExist: true });
  integrity = check.pragma("integrity_check", { simple: true });
  hasTable = check.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='material_profiles'").get();
  check.close();
} catch {
  // nem SQLite fájl vagy sérült – az alábbi ellenőrzés kezeli
}
if (integrity !== "ok" || !hasTable) {
  console.error("A megadott fájl nem érvényes Filament Catalog mentés (integrity_check:", integrity, ").");
  process.exit(1);
}

const dest = resolveDbFile();
fs.mkdirSync(path.dirname(dest), { recursive: true });
if (fs.existsSync(dest)) {
  const safety = `${dest}.before-restore-${Date.now()}`;
  fs.copyFileSync(dest, safety);
  console.log(`A jelenlegi adatbázis elmentve: ${safety}`);
}
for (const ext of ["-wal", "-shm"]) fs.rmSync(dest + ext, { force: true });
fs.copyFileSync(src, dest);
console.log(`Visszaállítva: ${src} → ${dest}`);
console.log("Indítsd újra az alkalmazást; a függő migrációk induláskor lefutnak. A feltöltéseket (uploads-*) kézzel másold vissza az UPLOAD_DIR mappába.");
