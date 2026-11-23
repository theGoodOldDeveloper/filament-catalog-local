import { getDb, schema, type DBX } from "@/db/client";

export function audit(entity: string, entityId: number | null, action: string, summary: string, db: DBX = getDb()): void {
  db.insert(schema.auditEvents).values({ entity, entityId, action, summary: summary.slice(0, 500) }).run();
}
