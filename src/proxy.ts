import { NextResponse, type NextRequest } from "next/server";

// Helyi alkalmazás: csak a saját gép címein szolgálunk ki kérést. A szerver ugyan csak a 127.0.0.1-en figyel,
// de egy rosszindulatú weboldal a saját tartománynevét át tudja irányítani a 127.0.0.1-re (DNS rebinding),
// és így a böngészőn keresztül olvashatná vagy módosíthatná az adatokat. Az ilyen kérés Host fejléce idegen név,
// ezért elutasítjuk. (A Server Action-ök Origin = Host ellenőrzése így már csak helyi eredetet enged át.)
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function isLocalHost(host: string | null): boolean {
  if (!host) return false;
  const name = host.trim().toLowerCase().replace(/:\d+$/, "");
  return LOCAL_HOSTS.has(name);
}

export function proxy(req: NextRequest) {
  if (isLocalHost(req.headers.get("host"))) return NextResponse.next();
  return new NextResponse("Forbidden: this app only answers on 127.0.0.1 / localhost.\n", {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
