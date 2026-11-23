import { eq, inArray } from "drizzle-orm";
import { getDb, getSqlite, schema, type DBX } from "@/db/client";
import { FIELDS } from "@/lib/fields";
import { stripDiacritics } from "@/lib/normalize";

/** Egy profil kereshető szövegének újraépítése: adatlap + specifikációk + források + jegyzetek + készlet. */
export function reindexProfile(profileId: number, db: DBX = getDb()): void {
  const sqlite = getSqlite();
  sqlite.prepare("DELETE FROM search_index WHERE profile_id = ?").run(profileId);
  const p = db.select().from(schema.materialProfiles).where(eq(schema.materialProfiles.id, profileId)).get();
  if (!p) return;
  const parts: string[] = [];
  for (const f of FIELDS) {
    const v = (p as Record<string, unknown>)[f.key];
    if (v !== null && v !== undefined && v !== "" && typeof v !== "boolean") parts.push(String(v));
  }
  for (const s of db.select().from(schema.technicalSpecs).where(eq(schema.technicalSpecs.profileId, profileId)).all())
    parts.push(s.label, s.valueText ?? "", s.valueNum != null ? String(s.valueNum) : "", s.unit ?? "", s.testMethod ?? "");
  for (const s of db.select().from(schema.sources).where(eq(schema.sources.profileId, profileId)).all())
    parts.push(s.title ?? "", s.url ?? "", s.excerpt ?? "");
  for (const n of db.select().from(schema.notes).where(eq(schema.notes.profileId, profileId)).all()) parts.push(n.body);
  for (const pp of db.select().from(schema.printProfiles).where(eq(schema.printProfiles.profileId, profileId)).all())
    parts.push(pp.name, pp.slicer ?? "", pp.printer ?? "", pp.nozzleMaterial ?? "", pp.notes ?? "");
  for (const s of db.select().from(schema.spools).where(eq(schema.spools.profileId, profileId)).all())
    parts.push(s.code, s.location ?? "", s.storageMethod ?? "", s.notes ?? "");
  const items = db.select().from(schema.purchaseItems).where(eq(schema.purchaseItems.profileId, profileId)).all();
  if (items.length) {
    const ids = [...new Set(items.map((i) => i.purchaseId))];
    for (const pu of db.select().from(schema.purchases).where(inArray(schema.purchases.id, ids)).all())
      parts.push(pu.seller ?? "", pu.orderReference ?? "", pu.notes ?? "");
    for (const i of items) parts.push(i.variant ?? "");
  }
  sqlite
    .prepare("INSERT INTO search_index (profile_id, content) VALUES (?, ?)")
    .run(profileId, parts.filter(Boolean).join(" \n "));
}

export function removeFromIndex(profileId: number): void {
  getSqlite().prepare("DELETE FROM search_index WHERE profile_id = ?").run(profileId);
}

export function reindexAll(db: DBX = getDb()): number {
  getSqlite().prepare("DELETE FROM search_index").run();
  const ids = db.select({ id: schema.materialProfiles.id }).from(schema.materialProfiles).all();
  for (const { id } of ids) reindexProfile(id, db);
  return ids.length;
}

/** Felhasználói szövegből biztonságos FTS5 MATCH kifejezés: minden szó idézve, prefix-illesztéssel, ÉS kapcsolatban. */
export function toFtsQuery(q: string): string | null {
  const tokens = stripDiacritics(q).toLowerCase().match(/[\p{L}\p{N}]+/gu);
  if (!tokens || tokens.length === 0) return null;
  return tokens.slice(0, 12).map((t) => `"${t}"*`).join(" AND ");
}

/** Találatok relevancia szerint. `null` = üres keresés (nincs szűrés). */
export function searchProfileIds(q: string | null | undefined): number[] | null {
  const match = q ? toFtsQuery(q) : null;
  if (!match) return null;
  const rows = getSqlite()
    .prepare("SELECT profile_id AS id FROM search_index WHERE search_index MATCH ? ORDER BY bm25(search_index) LIMIT 500")
    .all(match) as { id: number }[];
  return rows.map((r) => Number(r.id));
}
