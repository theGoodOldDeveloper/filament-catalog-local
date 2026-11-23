import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { getDb, resolveUploadDir, schema } from "@/db/client";
import { AppError } from "@/i18n/errors";
import { audit } from "./audit";
import { storedT } from "./settings";

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const DOC_KINDS = ["photo", "tds", "sds", "other"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

const TYPES: { mime: string; ext: string; magic: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", ext: "webp", magic: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  { mime: "application/pdf", ext: "pdf", magic: (b) => b.subarray(0, 5).toString("ascii") === "%PDF-" },
];

/** A típust a fájl TARTALMÁBÓL (magic bytes) állapítjuk meg, nem a kliens által küldött névből/MIME-ból. */
export function sniffType(buf: Buffer) {
  return TYPES.find((t) => t.magic(buf)) ?? null;
}

export async function saveUpload(profileId: number, file: File, kind: DocKind): Promise<{ ok: true; id: number } | { ok: false; error: AppError }> {
  if (!DOC_KINDS.includes(kind)) return { ok: false, error: new AppError("upload.error.invalidKind") };
  if (file.size === 0) return { ok: false, error: new AppError("upload.error.empty") };
  if (file.size > UPLOAD_MAX_BYTES) return { ok: false, error: new AppError("upload.error.tooLarge") };
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniffType(buf);
  if (!type) return { ok: false, error: new AppError("upload.error.badType") };
  const db = getDb();
  if (!db.select({ id: schema.materialProfiles.id }).from(schema.materialProfiles).where(eq(schema.materialProfiles.id, profileId)).get())
    return { ok: false, error: new AppError("profile.error.notFound") };
  const dir = resolveUploadDir();
  fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
  const storedName = `${randomBytes(16).toString("hex")}.${type.ext}`;
  fs.writeFileSync(path.join(/*turbopackIgnore: true*/ dir, storedName), buf, { flag: "wx" });
  const originalName = path.basename(file.name).replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 160) || `${storedT(db)("upload.defaultName")}.${type.ext}`;
  const row = db.insert(schema.documents).values({ profileId, kind, originalName, storedName, mime: type.mime, sizeBytes: buf.length }).returning({ id: schema.documents.id }).get();
  audit("profile", profileId, "upload", storedT(db)("audit.upload.add", { name: originalName }));
  return { ok: true, id: row.id };
}

export function getDocument(id: number) {
  const doc = getDb().select().from(schema.documents).where(eq(schema.documents.id, id)).get();
  if (!doc || !/^[0-9a-f]{32}\.(jpg|png|webp|pdf)$/.test(doc.storedName)) return null;
  const file = path.join(/*turbopackIgnore: true*/ resolveUploadDir(), doc.storedName);
  if (!fs.existsSync(file)) return null;
  return { doc, file };
}

export function deleteDocument(profileId: number, id: number) {
  const db = getDb();
  const doc = db.select().from(schema.documents).where(and(eq(schema.documents.id, id), eq(schema.documents.profileId, profileId))).get();
  if (!doc) return;
  db.delete(schema.documents).where(eq(schema.documents.id, id)).run();
  if (/^[0-9a-f]{32}\.(jpg|png|webp|pdf)$/.test(doc.storedName)) fs.rmSync(path.join(/*turbopackIgnore: true*/ resolveUploadDir(), doc.storedName), { force: true });
  audit("profile", profileId, "upload-delete", storedT(db)("audit.upload.delete", { name: doc.originalName }));
}
