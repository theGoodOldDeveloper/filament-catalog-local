"use strict";
// A Windows-csomag indítója: az indito.bat futtatja a mellékelt node.exe-vel.
// Feladata: adatmappa és szabad port kiválasztása, a környezet beállítása (nincs .env),
// a Next.js standalone szerver elindítása UGYANEBBEN a folyamatban (az ablak bezárása
// így biztosan leállítja), majd az /api/health megvárása és a böngésző megnyitása.
//
// Felülírható környezeti változók (alapból egyik sem kell):
//   FILAMENT_CATALOG_DATA_DIR    az adatok mappája (alap: %LOCALAPPDATA%\FilamentCatalog)
//   FILAMENT_CATALOG_PORT        rögzített port (alap: az első szabad 3210-től felfelé)
//   FILAMENT_CATALOG_NO_BROWSER  "1": ne nyisson böngészőt

const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const HOST = "127.0.0.1";
const FIRST_PORT = 3210;
const PORT_TRIES = 50;
const HEALTH_TIMEOUT_MS = 90_000;

function say(hu, en) {
  console.log(`  ${hu}`);
  console.log(`  ${en}`);
  console.log("");
}

function fail(hu, en, code) {
  console.error("");
  console.error("  HIBA / ERROR");
  console.error(`  ${hu}`);
  console.error(`  ${en}`);
  process.exit(code);
}

function portFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.listen({ port, host: HOST, exclusive: true }, () => srv.close(() => resolve(true)));
  });
}

async function choosePort() {
  const fixed = process.env.FILAMENT_CATALOG_PORT;
  if (fixed !== undefined && fixed !== "") {
    const port = Number(fixed);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      fail(
        `A FILAMENT_CATALOG_PORT értéke érvénytelen: "${fixed}" (1024 és 65535 közötti szám kell).`,
        `FILAMENT_CATALOG_PORT is invalid: "${fixed}" (expected a number between 1024 and 65535).`,
        2,
      );
    }
    if (!(await portFree(port))) {
      fail(
        `A kért ${port}-es port foglalt. Adj meg másikat, vagy töröld a FILAMENT_CATALOG_PORT változót.`,
        `The requested port ${port} is in use. Choose another one or unset FILAMENT_CATALOG_PORT.`,
        2,
      );
    }
    return port;
  }
  for (let port = FIRST_PORT; port < FIRST_PORT + PORT_TRIES; port++) {
    if (await portFree(port)) return port;
  }
  const last = FIRST_PORT + PORT_TRIES - 1;
  fail(
    `Nincs szabad port ${FIRST_PORT} és ${last} között. Zárj be néhány programot, vagy indítsd újra a gépet.`,
    `No free port between ${FIRST_PORT} and ${last}. Close some programs or restart the computer.`,
    2,
  );
}

function chooseDataDir() {
  const custom = process.env.FILAMENT_CATALOG_DATA_DIR;
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const dir = path.resolve(custom && custom.trim() ? custom.trim() : path.join(base, "FilamentCatalog"));
  try {
    fs.mkdirSync(path.join(dir, "uploads"), { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
  } catch (e) {
    fail(
      `Az adatmappa nem hozható létre vagy nem írható: ${dir} (${e.code || e.message})`,
      `The data folder cannot be created or is not writable: ${dir} (${e.code || e.message})`,
      3,
    );
  }
  return dir;
}

function health(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: HOST, port, path: "/api/health", timeout: 5000 }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(0));
  });
}

async function waitHealthy(port) {
  const until = Date.now() + HEALTH_TIMEOUT_MS;
  let last = 0;
  while (Date.now() < until) {
    last = await health(port);
    if (last === 200) return true;
    await new Promise((r) => setTimeout(r, last === 503 ? 1500 : 300));
  }
  return last;
}

function openBrowser(url) {
  if (process.env.FILAMENT_CATALOG_NO_BROWSER === "1" || process.platform !== "win32") return;
  const cmd = process.env.ComSpec || path.join(process.env.SystemRoot || "C:\\Windows", "System32", "cmd.exe");
  try {
    spawn(cmd, ["/d", "/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref();
  } catch {
    /* a címet kiírtuk, kézzel is megnyitható */
  }
}

async function main() {
  process.title = "Filament Catalog";
  const appDir = __dirname;
  let version = "";
  try {
    version = JSON.parse(fs.readFileSync(path.join(appDir, "package.json"), "utf8")).version || "";
  } catch {
    /* nem lényeges */
  }
  console.log("");
  console.log(`  Filament Catalog ${version}`);
  console.log("  ----------------------------------------");

  const dataDir = chooseDataDir();
  const port = await choosePort();
  const url = `http://${HOST}:${port}`;

  // A felhasználónál nincs .env: mindent itt állítunk be.
  process.env.NODE_ENV = "production";
  process.env.HOSTNAME = HOST;
  process.env.PORT = String(port);
  process.env.DATABASE_URL = `file:${path.join(dataDir, "filament-catalog.db")}`;
  process.env.UPLOAD_DIR = path.join(dataDir, "uploads");
  process.env.NEXT_TELEMETRY_DISABLED = "1";

  say(`Adatok mappája: ${dataDir}`, `Data folder:    ${dataDir}`);
  say("Indítás…", "Starting…");

  require(path.join(appDir, "server.js"));

  const ok = await waitHealthy(port);
  if (ok !== true) {
    fail(
      ok === 503
        ? `Az adatbázis nem nyitható meg itt: ${dataDir}. Lehet, hogy a víruskereső blokkolja, vagy a fájl sérült.`
        : "Az alkalmazás nem indult el időben. Zárd be ezt az ablakot, és próbáld újra.",
      ok === 503
        ? `The database cannot be opened in: ${dataDir}. Your antivirus may be blocking it, or the file is damaged.`
        : "The app did not start in time. Close this window and try again.",
      4,
    );
  }

  console.log("  ========================================");
  say(`Fut: ${url}`, `Running: ${url}`);
  say(
    "Hagyd nyitva ezt az ablakot, amíg használod. A bezárása leállítja az alkalmazást.",
    "Keep this window open while you use the app. Closing it stops the app.",
  );
  openBrowser(url);
}

main().catch((e) => {
  fail(`Váratlan hiba: ${e && e.message ? e.message : e}`, `Unexpected error: ${e && e.message ? e.message : e}`, 1);
});
