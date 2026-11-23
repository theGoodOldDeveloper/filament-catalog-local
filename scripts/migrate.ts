import "./env";
import { closeDb, getDb, resolveDbFile } from "@/db/client";
import { reindexAll } from "@/server/search";

// A kapcsolat megnyitása lefuttatja a függő migrációkat (drizzle/ mappa).
getDb();
const n = reindexAll();
console.log(`Migráció kész: ${resolveDbFile()} — keresőindex újraépítve (${n} profil).`);
closeDb();
