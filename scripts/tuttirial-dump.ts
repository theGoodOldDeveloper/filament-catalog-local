// npm run tuttirial:dump [-- --missing]
// Kiírja a Tuttirial magyar forrását lapos JSON-ként (ez a fordítandó anyag a tuttirial.en.json-hoz).
//   --missing   csak azok a kulcsok, amelyek még hiányoznak az angol overlay-ből
import fs from "node:fs";
import path from "node:path";
import { flattenTuttirial } from "@/data/tuttirial-i18n";

const flat = flattenTuttirial();
const en = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src/data/tuttirial.en.json"), "utf8")) as Record<string, string>;
const out = process.argv.includes("--missing") ? Object.fromEntries(Object.entries(flat).filter(([k]) => !(k in en))) : flat;
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
