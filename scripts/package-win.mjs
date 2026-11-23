// Windows-csomag összeállítása: tiszta build (standalone) + beépített Node + indító → dist/*.zip
// Használat: npm run package:win      (Windows x64 gépen; a csomagot a végén a mellékelt node.exe-vel ki is próbálja)
//
// A csomag szerkezete:
//   FilamentCatalog-<verzió>-win-x64/
//     indito.bat, OLVASSEL.txt, LICENSE.txt, LICENSES-third-party.txt
//     runtime/node.exe (+ LICENSE-node.txt)
//     app/  ← .next/standalone + .next/static + public + drizzle + launcher.cjs
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

// Rögzített futtató. Frissítéskor a verziót ÉS a SHA256-ot is cseréld (https://nodejs.org/dist/v<verzió>/SHASUMS256.txt).
const NODE_VERSION = "22.23.5";
const NODE_ZIP_SHA256 = "4a191082e9706866830379d577d2cc8a50c776fcd9436a8d061b063ed0d9a0e3";
const NODE_ARCHIVE = `node-v${NODE_VERSION}-win-x64`;
const NODE_BASE_URL = `https://nodejs.org/dist/v${NODE_VERSION}`;
const TARGET = "win32-x64";
const FIRST_PORT = 3210; // ugyanaz, mint a launcher.cjs-ben (az OLVASSEL-be kerül)
const MAX_REL_PATH = 200; // a Windows 260 karakteres útvonalkorlátja miatt

const root = path.resolve(import.meta.dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const name = `FilamentCatalog-${pkg.version}-win-x64`;
const distDir = path.join(root, "dist");
const outDir = path.join(distDir, name);
const zipFile = path.join(distDir, `${name}.zip`);
const cacheDir = path.join(root, "runtime");

const step = (msg) => console.log(`\n▸ ${msg}`);
const die = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

// ── 1. tiszta build ──────────────────────────────────────────────────────────
function build() {
  step("Tiszta build (next build, standalone)");
  fs.rmSync(path.join(root, ".next"), { recursive: true, force: true });
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
  // a build ne lásson fejlesztői adatbázist vagy beállítást
  delete env.DATABASE_URL;
  delete env.UPLOAD_DIR;
  const r = spawnSync(process.execPath, [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build"], { cwd: root, env, stdio: "inherit" });
  if (r.status !== 0) die("A build elbukott.");
  if (!fs.existsSync(path.join(root, ".next", "standalone", "server.js"))) die("Nincs .next/standalone/server.js – a next.config `output: \"standalone\"` beállítása hiányzik?");
}

// ── 2. app mappa ─────────────────────────────────────────────────────────────
function assembleApp() {
  step("App összeállítása");
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.rmSync(zipFile, { force: true });
  const app = path.join(outDir, "app");
  fs.mkdirSync(app, { recursive: true });
  // dereference: a Turbopack a külső csomagokra (better-sqlite3-<hash>) abszolút symlinket tesz a .next/node_modules alá
  fs.cpSync(path.join(root, ".next", "standalone"), app, { recursive: true, dereference: true });
  fs.cpSync(path.join(root, ".next", "static"), path.join(app, ".next", "static"), { recursive: true });
  if (fs.existsSync(path.join(root, "public"))) fs.cpSync(path.join(root, "public"), path.join(app, "public"), { recursive: true });
  fs.cpSync(path.join(root, "drizzle"), path.join(app, "drizzle"), { recursive: true });
  fs.copyFileSync(path.join(root, "scripts", "win", "launcher.cjs"), path.join(app, "launcher.cjs"));

  // Ami nem kell a csomagba: más platformok natív binárisai, a (nem használt) képoptimalizáló, esetleges .env
  let nativeCopies = 0;
  for (const rel of walk(app)) {
    const file = path.join(app, rel);
    const base = path.basename(rel);
    if (/(^|\/)better-sqlite3[^/]*\/prebuilds\/[^/]+\.node$/.test(rel)) {
      if (base === `${TARGET}.node`) nativeCopies++;
      else fs.rmSync(file);
    } else if (base.startsWith(".env")) fs.rmSync(file);
  }
  for (const dir of ["sharp", "@img"]) fs.rmSync(path.join(app, "node_modules", dir), { recursive: true, force: true });
  if (nativeCopies === 0) die(`A better-sqlite3 ${TARGET} binárisa nem került a standalone kimenetbe (next.config: outputFileTracingIncludes).`);
  if (!fs.existsSync(path.join(app, "drizzle", "meta", "_journal.json"))) die("A drizzle migrációk hiányoznak a csomagból.");
  return app;
}

// ── 3. Node futtató ──────────────────────────────────────────────────────────
async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function addRuntime() {
  step(`Node.js ${NODE_VERSION} (win-x64) futtató`);
  fs.mkdirSync(cacheDir, { recursive: true });
  const zip = path.join(cacheDir, `${NODE_ARCHIVE}.zip`);
  if (!fs.existsSync(zip)) {
    console.log(`  letöltés: ${NODE_BASE_URL}/${NODE_ARCHIVE}.zip`);
    fs.writeFileSync(zip, await fetchBuffer(`${NODE_BASE_URL}/${NODE_ARCHIVE}.zip`));
  } else console.log(`  gyorsítótárból: ${path.relative(root, zip)}`);

  const actual = sha256(zip);
  const sums = (await fetchBuffer(`${NODE_BASE_URL}/SHASUMS256.txt`)).toString("utf8");
  const published = sums.split(/\r?\n/).map((l) => l.trim().split(/\s+/)).find((p) => p[1] === `${NODE_ARCHIVE}.zip`)?.[0];
  if (!published) die("A SHASUMS256.txt nem tartalmazza az archívumot.");
  if (actual !== published || actual !== NODE_ZIP_SHA256) {
    fs.rmSync(zip, { force: true });
    die(`SHA256 eltérés a Node archívumnál!\n  letöltött:  ${actual}\n  nodejs.org: ${published}\n  rögzített:  ${NODE_ZIP_SHA256}\n  (a hibás fájlt töröltem)`);
  }
  console.log(`  SHA256 rendben (nodejs.org SHASUMS256.txt + rögzített érték): ${actual}`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fc-node-"));
  try {
    // Windows 10+: a System32\tar.exe (bsdtar) ZIP-et is bont; máshol a PATH-on lévő bsdtar kell.
    const tar = process.platform === "win32" ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "bsdtar";
    execFileSync(tar, ["-xf", zip, "-C", tmp, `${NODE_ARCHIVE}/node.exe`, `${NODE_ARCHIVE}/LICENSE`], { stdio: "inherit" });
    const rt = path.join(outDir, "runtime");
    fs.mkdirSync(rt, { recursive: true });
    fs.copyFileSync(path.join(tmp, NODE_ARCHIVE, "node.exe"), path.join(rt, "node.exe"));
    fs.copyFileSync(path.join(tmp, NODE_ARCHIVE, "LICENSE"), path.join(rt, "LICENSE-node.txt"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ── 4. indító + leírás ───────────────────────────────────────────────────────
function addLauncherFiles() {
  step("indito.bat, OLVASSEL.txt, licencek");
  const crlf = (s) => s.replace(/\r?\n/g, "\r\n");
  // A .bat CRLF nélkül hibásan ugrik a címkékre; BOM NEM kerülhet bele (a cmd parancsnak nézné).
  fs.writeFileSync(path.join(outDir, "indito.bat"), crlf(fs.readFileSync(path.join(root, "scripts", "win", "indito.bat"), "utf8")));
  const readme = fs.readFileSync(path.join(root, "scripts", "win", "OLVASSEL.txt"), "utf8")
    .replaceAll("{{VERSION}}", pkg.version).replaceAll("{{NODE}}", NODE_VERSION).replaceAll("{{PORT}}", String(FIRST_PORT));
  // BOM: a régebbi Jegyzettömb így biztosan UTF-8-ként nyitja meg
  fs.writeFileSync(path.join(outDir, "OLVASSEL.txt"), "\uFEFF" + crlf(readme));
  // Licencek: a sajátunk (MIT) és a csomagba kerülő függőségeké (a legtöbb licenc megköveteli a szöveg mellékelését).
  fs.writeFileSync(path.join(outDir, "LICENSE.txt"), crlf(fs.readFileSync(path.join(root, "LICENSE"), "utf8")));
  fs.writeFileSync(path.join(outDir, "LICENSES-third-party.txt"), crlf(thirdPartyLicenses(path.join(outDir, "app"))));
}

/** A csomagba került npm-függőségek licencszövegei (a forrás node_modules-ból is, mert a standalone a LICENSE fájlokat kihagyhatja). */
function thirdPartyLicenses(app) {
  const seen = new Map();
  const one = (dir) => {
    const pj = path.join(dir, "package.json");
    if (!fs.existsSync(pj)) return;
    const meta = JSON.parse(fs.readFileSync(pj, "utf8"));
    if (!meta.name || !meta.version) return;
    const key = `${meta.name}@${meta.version}`;
    if (!seen.has(key)) {
      let text = "";
      for (const base of [dir, path.join(root, "node_modules", ...meta.name.split("/"))]) {
        if (!fs.existsSync(base)) continue;
        const f = fs.readdirSync(base).find((n) => /^(licen[sc]e|copying)(\.|-|$)/i.test(n));
        if (f) {
          text = fs.readFileSync(path.join(base, f), "utf8").trim();
          break;
        }
      }
      seen.set(key, { license: typeof meta.license === "string" ? meta.license : "?", text });
    }
    visit(path.join(dir, "node_modules"));
  };
  const visit = (nm) => {
    if (!fs.existsSync(nm)) return;
    for (const d of fs.readdirSync(nm)) {
      if (d.startsWith(".")) continue;
      const dir = path.join(nm, d);
      if (!fs.statSync(dir).isDirectory()) continue;
      if (d.startsWith("@")) for (const sub of fs.readdirSync(dir)) one(path.join(dir, sub));
      else one(dir);
    }
  };
  visit(path.join(app, "node_modules"));
  visit(path.join(app, ".next", "node_modules"));
  // A közvetlen függőségek egy része (drizzle-orm, zod) a szerverkódba fordítva van jelen, nem a node_modules-ban.
  for (const dep of Object.keys(pkg.dependencies ?? {})) one(path.join(root, "node_modules", ...dep.split("/")));
  const missing = [...seen].filter(([, v]) => !v.text).map(([k]) => k);
  if (missing.length) console.warn(`  ! licencszöveg nélkül (csak a licenc neve kerül be): ${missing.join(", ")}`);
  const bad = [...seen].filter(([, v]) => /GPL|\?|UNLICENSED/i.test(v.license)).map(([k, v]) => `${k} (${v.license})`);
  if (bad.length) die(`Nem megengedő vagy ismeretlen licencű függőség a csomagban:\n  ${bad.join("\n  ")}`);
  const line = "=".repeat(78);
  const parts = [...seen]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${line}\n${k} – ${v.license}\n${line}\n${v.text || "(a csomag nem mellékel licencfájlt / no licence file shipped)"}\n`);
  console.log(`  harmadik fél licencei: ${seen.size} csomag`);
  return `Filament Catalog – a csomagban lévő, harmadik féltől származó szoftverek licencei\nThird-party software bundled in this package\n(Node.js: runtime\\LICENSE-node.txt)\n\n${parts.join("\n")}`;
}

// ── 5. a natív modul próbája a CSOMAGOLT node.exe-vel ────────────────────────
function smokeTest(app) {
  step("Natív modul (better-sqlite3) próbája a csomagolt node.exe-vel");
  if (process.platform !== "win32") {
    console.warn("  ! Nem Windows: a csomagolt node.exe itt nem futtatható, a próba KIMARADT. Kiadás előtt Windowson futtasd újra.");
    return;
  }
  const node = path.join(outDir, "runtime", "node.exe");
  const dirs = [path.join(app, "node_modules", "better-sqlite3")];
  const hashed = path.join(app, ".next", "node_modules");
  if (fs.existsSync(hashed)) for (const d of fs.readdirSync(hashed)) dirs.push(path.join(hashed, d));
  const code = `
    const out = { node: process.version, abi: process.versions.modules, arch: process.arch, mods: [] };
    for (const dir of JSON.parse(process.argv[1])) {
      const Database = require(dir);
      const db = new Database(":memory:");
      db.exec("CREATE VIRTUAL TABLE t USING fts5(x); INSERT INTO t VALUES ('árvíztűrő');");
      const hit = db.prepare("SELECT count(*) AS n FROM t WHERE t MATCH 'árvíztűrő'").get().n;
      if (hit !== 1) throw new Error("FTS5 nem működik");
      out.mods.push(db.prepare("SELECT sqlite_version() AS v").get().v);
      db.close();
    }
    console.log(JSON.stringify(out));`;
  // Tiszta környezet: a fejlesztői Node, NODE_PATH stb. ne segíthessen be.
  const env = { SystemRoot: process.env.SystemRoot ?? "C:\\Windows", PATH: path.join(process.env.SystemRoot ?? "C:\\Windows", "System32") };
  const r = spawnSync(node, ["-e", code, JSON.stringify(dirs)], { cwd: app, env, encoding: "utf8" });
  if (r.status !== 0) die(`A natív modul NEM tölthető be a csomagolt Node-dal (ABI/architektúra eltérés?):\n${r.stderr || r.error}`);
  const info = JSON.parse(r.stdout.trim());
  if (info.node !== `v${NODE_VERSION}` || info.arch !== "x64") die(`Váratlan futtató: ${r.stdout}`);
  console.log(`  rendben: Node ${info.node}, ABI ${info.abi}, ${info.arch}; SQLite ${info.mods.join(", ")} + FTS5 (${dirs.length} példány)`);
}

// ── 6. ellenőrzés: semmi fejlesztői vagy személyes ne kerüljön bele ──────────
function audit() {
  step("Tartalom-ellenőrzés");
  const files = walk(outDir);
  const bad = [];
  const user = os.userInfo().username.toLowerCase();
  const home = os.homedir().toLowerCase();
  let longest = "";
  for (const rel of files) {
    const lower = rel.toLowerCase();
    const base = path.posix.basename(lower);
    const own = !lower.includes("node_modules/"); // saját fájl (nem harmadik fél csomagja)
    if (rel.length > longest.length) longest = rel;
    if (base.startsWith(".env")) bad.push(`${rel} (.env)`);
    if (/\.(db|db-wal|db-shm|sqlite|sqlite3)$/.test(base)) bad.push(`${rel} (adatbázis)`);
    if (/(^|\/)(_promptok|\.git|\.claude|tests|backups)\//.test(lower)) bad.push(`${rel} (fejlesztői mappa)`);
    if (/^app\/(data|src|scripts)\//.test(lower)) bad.push(`${rel} (forrás vagy adat)`);
    if (own && /\.(ts|tsx)$/.test(base)) bad.push(`${rel} (TypeScript forrás)`);
    // a Turbopack üres csonk-mapeket tesz a route-ok mellé; forrást tartalmazó map nem mehet ki
    if (own && /\.map$/.test(base) && fs.readFileSync(path.join(outDir, rel), "utf8").includes("sourcesContent")) bad.push(`${rel} (forrást tartalmazó source map)`);
    if (own && /\.(js|cjs|mjs|json|html|txt|bat|css|sql|rsc|meta|body)$/.test(base)) {
      const text = fs.readFileSync(path.join(outDir, rel), "latin1").toLowerCase();
      if (text.includes(home) || text.includes(home.replaceAll("\\", "\\\\")) || text.includes(home.replaceAll("\\", "/"))) bad.push(`${rel} (a felhasználói mappa útvonala)`);
      else if (user.length >= 4 && new RegExp(`[\\\\/]${user.replace(/[^a-z0-9]/g, ".")}[\\\\/]`).test(text)) bad.push(`${rel} (felhasználónév útvonalban)`);
    }
  }
  if (longest.length > MAX_REL_PATH) bad.push(`${longest} (túl hosszú útvonal: ${longest.length} > ${MAX_REL_PATH})`);
  if (bad.length) die(`Nem kívánt tartalom a csomagban:\n  ${bad.slice(0, 40).join("\n  ")}`);
  console.log(`  rendben: ${files.length} fájl, leghosszabb belső útvonal ${longest.length} karakter`);
  return files;
}

// ── 7. ZIP (függőség nélkül; a legfelső szint a csomagmappa) ─────────────────
function writeZip(files) {
  step("ZIP");
  const fd = fs.openSync(zipFile, "w");
  const central = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const rel of [...files].sort()) {
    const data = fs.readFileSync(path.join(outDir, rel));
    const nameBuf = Buffer.from(`${name}/${rel}`, "utf8");
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const store = deflated.length >= data.length;
    const body = store ? data : deflated;
    const head = Buffer.alloc(26);
    head.writeUInt16LE(20, 0); // szükséges verzió
    head.writeUInt16LE(0x0800, 2); // UTF-8 fájlnevek
    head.writeUInt16LE(store ? 0 : 8, 4);
    head.writeUInt16LE(dosTime, 6);
    head.writeUInt16LE(dosDate, 8);
    head.writeUInt32LE(zlib.crc32(data), 10);
    head.writeUInt32LE(body.length, 14);
    head.writeUInt32LE(data.length, 18);
    head.writeUInt16LE(nameBuf.length, 22);
    head.writeUInt16LE(0, 24);
    const local = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), head, nameBuf]);
    fs.writeSync(fd, local);
    fs.writeSync(fd, body);
    const tail = Buffer.alloc(16);
    tail.writeUInt16LE(0, 0); // megjegyzés hossza
    tail.writeUInt16LE(0, 2); // lemez
    tail.writeUInt16LE(0, 4); // belső attribútum
    tail.writeUInt32LE(0, 6); // külső attribútum
    tail.writeUInt32LE(offset, 10);
    central.push(Buffer.concat([Buffer.from([0x50, 0x4b, 0x01, 0x02, 20, 0]), head, tail.subarray(0, 14), nameBuf]));
    offset += local.length + body.length;
  }
  if (central.length > 0xffff || offset > 0xffffffff) die("A csomag túl nagy a sima ZIP formátumhoz.");
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(central.length, 8);
  end.writeUInt16LE(central.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  fs.writeSync(fd, cd);
  fs.writeSync(fd, end);
  fs.closeSync(fd);
}

build();
const app = assembleApp();
await addRuntime();
addLauncherFiles();
smokeTest(app);
const files = audit();
writeZip(files);

const unpacked = files.reduce((n, rel) => n + fs.statSync(path.join(outDir, rel)).size, 0);
const digest = sha256(zipFile);
fs.writeFileSync(`${zipFile}.sha256`, `${digest}  ${name}.zip\n`);
console.log(`\n✓ Kész: ${path.relative(root, zipFile)}`);
console.log(`  ZIP: ${mb(fs.statSync(zipFile).size)} · kicsomagolva: ${mb(unpacked)} · ${files.length} fájl`);
console.log(`  SHA256: ${digest}`);
