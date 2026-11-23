import { NextResponse } from "next/server";
import { getT } from "@/i18n/server";
import { exportJson, exportProfilesCsv, exportSpoolsCsv } from "@/server/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/export?format=json | csv-profiles | csv-spools – a saját adatok letöltése */
export async function GET(req: Request) {
  const { t } = await getT();
  const format = new URL(req.url).searchParams.get("format") ?? "json";
  const stamp = new Date().toISOString().slice(0, 10);
  const dl = (name: string, type: string, body: string) =>
    new NextResponse(body, { headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });
  if (format === "csv-profiles") return dl(`${t("export.file.profiles")}-${stamp}.csv`, "text/csv; charset=utf-8", exportProfilesCsv());
  if (format === "csv-spools") return dl(`${t("export.file.spools")}-${stamp}.csv`, "text/csv; charset=utf-8", exportSpoolsCsv());
  if (format === "json") return dl(`filament-catalog-${stamp}.json`, "application/json; charset=utf-8", JSON.stringify(exportJson(t), null, 2));
  return NextResponse.json({ error: "bad_format", message: "format: json | csv-profiles | csv-spools" }, { status: 400 });
}
