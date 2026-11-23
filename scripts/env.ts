import fs from "node:fs";
import path from "node:path";

// A parancssori szkriptek ugyanazt a .env-et használják, mint a Next.js (ha létezik).
const file = path.resolve(process.cwd(), ".env");
if (fs.existsSync(file)) process.loadEnvFile(file);
