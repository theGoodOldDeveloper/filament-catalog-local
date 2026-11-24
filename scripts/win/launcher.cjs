"use strict";
// A Windows-csomag indítója: a start.bat futtatja a mellékelt node.exe-vel.
// Alapmód: ez a (látható, rövid életű) folyamat ugyanezt a fájlt "--server" móddal ABLAK NÉLKÜL a háttérben elindítja,
// megvárja, hogy az app válaszoljon, megnyitja a böngészőt, majd kilép (az ablak bezárul).
// A háttérben futó szerver állapota: <adatmappa>/server.json (pid, port); naplója: launcher.log.
// Már futó példány esetén csak a böngészőt nyitja meg. Leállítás: az app "Kilépés" gombja, vagy --stop (stop.bat).
// Módok: (nincs) indítás a háttérben | --stop leállítás | --foreground ablakban futó mód (hibakereséshez).
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

const STATE = "server.json";
const LOG = "launcher.log";
const LOCK = "starting.lock";

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readState(dataDir) {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(dataDir, STATE), "utf8"));
    return Number.isInteger(s.pid) && Number.isInteger(s.port) ? s : null;
  } catch {
    return null;
  }
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Az állapotfájl szerinti példány tényleg fut és válaszol? */
async function runningInstance(dataDir) {
  const st = readState(dataDir);
  if (!st || !alive(st.pid)) return null;
  return (await health(st.port)) === 200 ? st : null;
}

function readVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8")).version || "";
  } catch {
    return "";
  }
}

function banner() {
  console.log("");
  console.log(`  Filament Catalog ${readVersion()}`);
  console.log("  ----------------------------------------");
}

/** A szerver (és csak a szerver) folyamata: háttérben (--server) vagy ablakban (--foreground). */
async function runServer(foreground) {
  process.title = "Filament Catalog";
  const appDir = __dirname;
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
  // Háttérben futva az app "Kilépés" gombja az egyetlen kényelmes leállítás: csak ekkor engedjük a /api/quit-et.
  if (!foreground) process.env.FILAMENT_CATALOG_ALLOW_QUIT = "1";

  if (foreground) {
    banner();
    say(`Adatok mappája: ${dataDir}`, `Data folder:    ${dataDir}`);
    say("Indítás…", "Starting…");
  }

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

  if (foreground) {
    console.log("  ========================================");
    say(`Fut: ${url}`, `Running: ${url}`);
    say(
      "Hagyd nyitva ezt az ablakot, amíg használod. A bezárása leállítja az alkalmazást.",
      "Keep this window open while you use the app. Closing it stops the app.",
    );
    openBrowser(url);
    return;
  }

  const stateFile = path.join(dataDir, STATE);
  fs.writeFileSync(stateFile, JSON.stringify({ pid: process.pid, port, url }));
  process.on("exit", () => {
    try {
      if (readState(dataDir)?.pid === process.pid) fs.unlinkSync(stateFile);
    } catch {
      /* nem lényeges */
    }
  });
}

function tailOfLog(file) {
  try {
    return fs.readFileSync(file, "utf8").trim().split(/\r?\n/).slice(-12).join("\n");
  } catch {
    return "";
  }
}

function tryLock(lockFile) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.closeSync(fs.openSync(lockFile, "wx"));
      return true;
    } catch {
      try {
        if (Date.now() - fs.statSync(lockFile).mtimeMs > 120_000) fs.unlinkSync(lockFile);
        else return false;
      } catch {
        /* közben eltűnt: újra próbáljuk */
      }
    }
  }
  return false;
}

/** Alapmód: indítás a háttérben, böngésző megnyitása, kilépés. */
async function startInBackground() {
  banner();
  const dataDir = chooseDataDir();

  const existing = await runningInstance(dataDir);
  if (existing) {
    say(`Az alkalmazás már fut: ${existing.url}`, `The app is already running: ${existing.url}`);
    openBrowser(existing.url);
    await sleep(1500);
    return;
  }

  const lockFile = path.join(dataDir, LOCK);
  if (!tryLock(lockFile)) {
    // Másik indítás van folyamatban (pl. kétszer kattintottak): megvárjuk az eredményét.
    say("Az alkalmazás már indul…", "The app is already starting…");
    const until = Date.now() + HEALTH_TIMEOUT_MS;
    while (Date.now() < until) {
      const st = await runningInstance(dataDir);
      if (st) {
        openBrowser(st.url);
        await sleep(1000);
        return;
      }
      await sleep(500);
    }
    fail("Az indítás nem sikerült. Próbáld újra.", "Starting did not succeed. Please try again.", 4);
  }

  const logFile = path.join(dataDir, LOG);
  try {
    fs.rmSync(path.join(dataDir, STATE), { force: true });
    say(`Adatok mappája: ${dataDir}`, `Data folder:    ${dataDir}`);
    say("Indítás…", "Starting…");

    const fd = fs.openSync(logFile, "w");
    let exitCode = null;
    const child = spawn(process.execPath, [__filename, "--server"], {
      detached: true,
      windowsHide: true,
      stdio: ["ignore", fd, fd],
      env: process.env,
    });
    child.on("exit", (code) => {
      exitCode = code ?? 1;
    });
    child.on("error", () => {
      exitCode = 1;
    });
    child.unref();

    const until = Date.now() + HEALTH_TIMEOUT_MS + 10_000;
    let state = null;
    while (Date.now() < until && exitCode === null) {
      const st = readState(dataDir);
      if (st && st.pid === child.pid && (await health(st.port)) === 200) {
        state = st;
        break;
      }
      await sleep(300);
    }
    if (!state) {
      const log = tailOfLog(logFile);
      if (exitCode === null) {
        try {
          process.kill(child.pid);
        } catch {
          /* már leállt */
        }
      }
      console.error("");
      console.error("  HIBA / ERROR");
      if (log) console.error(log.replace(/^/gm, "  "));
      else console.error("  Az alkalmazás nem indult el. / The app did not start.");
      console.error(`  Napló / log: ${logFile}`);
      process.exit(exitCode || 4);
    }

    console.log("  ========================================");
    say(`Fut: ${state.url}`, `Running: ${state.url}`);
    say(
      "Az alkalmazás a háttérben fut. Ez az ablak mindjárt bezárul. Leállítás: „Kilépés” gomb az alkalmazásban, vagy stop.bat.",
      "The app runs in the background. This window closes in a moment. To stop it: the \"Quit\" button in the app, or stop.bat.",
    );
    openBrowser(state.url);
    await sleep(3500);
  } finally {
    try {
      fs.unlinkSync(lockFile);
    } catch {
      /* nem lényeges */
    }
  }
}

function postQuit(port) {
  return new Promise((resolve) => {
    const req = http.request(
      { host: HOST, port, path: "/api/quit", method: "POST", headers: { "x-fc-quit": "1", "content-length": 0 }, timeout: 4000 },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      },
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(false));
    req.end();
  });
}

/** --stop: a háttérben futó példány leállítása. */
async function stopRunning() {
  banner();
  const dataDir = chooseDataDir();
  const st = readState(dataDir);
  if (!st || !alive(st.pid)) {
    say("Az alkalmazás nem fut.", "The app is not running.");
    try {
      fs.rmSync(path.join(dataDir, STATE), { force: true });
    } catch {
      /* nem lényeges */
    }
    return;
  }
  await postQuit(st.port);
  for (let i = 0; i < 20 && alive(st.pid); i++) await sleep(250);
  if (alive(st.pid)) {
    try {
      process.kill(st.pid);
    } catch {
      /* már leállt */
    }
  }
  try {
    fs.rmSync(path.join(dataDir, STATE), { force: true });
  } catch {
    /* nem lényeges */
  }
  say("Az alkalmazás leállt.", "The app has stopped.");
  await sleep(1500);
}

const mode = process.argv[2];
const entry = mode === "--server" ? () => runServer(false) : mode === "--foreground" ? () => runServer(true) : mode === "--stop" ? stopRunning : startInBackground;
entry().catch((e) => {
  fail(`Váratlan hiba: ${e && e.message ? e.message : e}`, `Unexpected error: ${e && e.message ? e.message : e}`, 1);
});
