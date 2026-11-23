import "./env";
import fs from "node:fs";
import path from "node:path";
import { closeDb, getSqlite, resolveDbFile, resolveUploadDir } from "@/db/client";

// Használat: npm run db:backup -- [--keep 14] [--dir ./backups]
// Az SQLite online backup API-ját használja, ezért futó alkalmazás mellett is konzisztens.
const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};
const keep = Math.max(1, Number(arg("keep", "14")) || 14);
const dir = path.resolve(process.cwd(), arg("dir", "./backups"));
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);

async function main() {
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `filament-catalog-${stamp}.db`);
  await getSqlite().backup(dest);
  closeDb();
  console.log(`Adatbázis mentve: ${dest} (forrás: ${resolveDbFile()})`);

  const uploads = resolveUploadDir();
  if (fs.existsSync(uploads) && fs.readdirSync(uploads).length) {
    const udest = path.join(dir, `uploads-${stamp}`);
    fs.cpSync(uploads, udest, { recursive: true });
    console.log(`Feltöltések mentve: ${udest}`);
  }

  // megőrzés: a legutóbbi N mentés marad
  const prune = (prefix: string, isDir: boolean) => {
    const all = fs.readdirSync(dir).filter((f) => f.startsWith(prefix) && fs.statSync(path.join(dir, f)).isDirectory() === isDir).sort().reverse();
    for (const old of all.slice(keep)) {
      fs.rmSync(path.join(dir, old), { recursive: true, force: true });
      console.log(`Régi mentés törölve: ${old}`);
    }
  };
  prune("filament-catalog-", false);
  prune("uploads-", true);
}

main().catch((e) => {
  console.error("A mentés sikertelen:", e instanceof Error ? e.message : e);
  process.exit(1);
});
