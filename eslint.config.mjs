import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "data/**", "dist/**", "runtime/**", "drizzle/**", "next-env.d.ts", "node_modules/**"]),
  // a csomagolt indító sima CommonJS: a mellékelt node.exe közvetlenül futtatja
  { files: ["**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
]);
