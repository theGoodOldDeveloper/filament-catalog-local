import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll } from "vitest";

// Minden tesztfájl saját, ideiglenes SQLite adatbázist kap – a valódi data/ mappához nem nyúlunk.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "filament-catalog-test-"));
process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
process.env.UPLOAD_DIR = path.join(dir, "uploads");

afterAll(async () => {
  const { closeDb } = await import("@/db/client");
  closeDb();
  fs.rmSync(dir, { recursive: true, force: true });
});
