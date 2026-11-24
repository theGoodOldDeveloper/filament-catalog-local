import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A Windows-csomag indítója (launcher.cjs) állítja be a FILAMENT_CATALOG_ALLOW_QUIT=1 értéket, mert ott az app
// ablak nélkül, a háttérben fut, és a felhasználónak kell tudnia leállítani. Máshol (fejlesztés, tesztek) a végpont tiltott.
const enabled = () => process.env.FILAMENT_CATALOG_ALLOW_QUIT === "1";

export function GET() {
  return NextResponse.json({ enabled: enabled() }, { headers: { "Cache-Control": "no-store" } });
}

export function POST(req: NextRequest) {
  // Egyedi fejléc: idegen weboldal böngészőből nem tud ilyet előzetes (preflight) engedély nélkül küldeni.
  if (!enabled() || req.headers.get("x-fc-quit") !== "1") {
    return NextResponse.json({ ok: false }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  setTimeout(() => process.exit(0), 300);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
