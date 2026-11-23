import fs from "node:fs";
import { NextResponse } from "next/server";
import { getDocument } from "@/server/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const n = Number(id);
  const found = Number.isInteger(n) && n > 0 ? getDocument(n) : null;
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const data = fs.readFileSync(found.file);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": found.doc.mime,
      "Content-Length": String(data.length),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(found.doc.originalName)}`,
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
