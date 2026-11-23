import "./env";
import { closeDb, getDb } from "@/db/client";
import { hasDemo, loadDemo, removeDemo } from "@/server/demo";

// DEMO seed: a logika a src/server/demo.ts-ben van (a felület „Demo adatok betöltése” gombja is azt hívja).
// Használat: npm run db:seed            → betölti a demót (ha még nincs)
//            npm run db:seed -- --reset → előbb törli a korábbi DEMO rekordokat

const db = getDb();
if (process.argv.includes("--reset")) removeDemo(db);
if (hasDemo(db)) {
  console.log("A DEMO adatok már be vannak töltve (újratöltés: npm run db:seed -- --reset).");
} else {
  const r = loadDemo(db);
  console.log(`DEMO seed kész: ${r?.profiles ?? 0} profil, ${r?.spools ?? 0} tekercs, ${r?.purchases ?? 0} vásárlás.`);
}
closeDb();
