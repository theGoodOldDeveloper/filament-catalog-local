import { NextResponse } from "next/server";
import { getSqlite } from "@/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    getSqlite().prepare("SELECT 1").get();
    return NextResponse.json({ status: "ok", db: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "error", db: "unavailable" }, { status: 503 });
  }
}
