import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSqlite } from "@/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/backup – az adatbázis konzisztens másolata letöltésként.
 * Az SQLite online backup API-ját használja, ezért futó alkalmazás mellett is biztonságos.
 * A feltöltött dokumentumokat NEM tartalmazza (azok az adatmappa `uploads` almappájában vannak).
 */
export async function GET() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "filament-catalog-backup-"));
  const tmp = path.join(dir, "backup.db");
  try {
    await getSqlite().backup(tmp);
    const data = fs.readFileSync(tmp);
    const now = new Date();
    const p2 = (n: number) => String(n).padStart(2, "0");
    // helyi idő: a felhasználó a saját órája szerint keresi a mentést
    const stamp = `${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}-${p2(now.getHours())}${p2(now.getMinutes())}`;
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Length": String(data.length),
        "Content-Disposition": `attachment; filename="filament-catalog-backup-${stamp}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "backup_failed" }, { status: 500 });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
