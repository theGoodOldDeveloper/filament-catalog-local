import path from "node:path";
import type { NextConfig } from "next";

// Tartalombiztonsági szabály: minden csak a saját eredetről tölthető be (nincs CDN, külső betűtípus, analitika),
// és az oldal nem küldhet adatot máshová. Az inline szkript/stílus a Next.js működéséhez kell; fejlesztői módban
// a gyors frissítéshez 'unsafe-eval' és WebSocket is.
const dev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // A `next dev` ne generáljon AGENTS.md-t a repó gyökerébe.
  agentRules: false,
  // Önálló (standalone) kimenet: a Windows-csomag ezt futtatja a mellékelt node.exe-vel (scripts/package-win.mjs).
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  serverExternalPackages: ["better-sqlite3"],
  // A nyomkövetés nem látja: a futásidőben olvasott migrációkat és a natív modul dinamikusan betöltött binárisát.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*", "./node_modules/better-sqlite3/prebuilds/*.node"],
  },
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
