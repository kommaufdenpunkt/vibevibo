#!/usr/bin/env node
// 🧹 Aufräumen: HomeBuschfunkSmart.jsx wird nicht mehr genutzt — entfernen.
import { rmSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const TARGET = join(ROOT, "components", "HomeBuschfunkSmart.jsx");

if (existsSync(TARGET)) {
  rmSync(TARGET, { force: true });
  console.log("✓ components/HomeBuschfunkSmart.jsx entfernt.");
} else {
  console.log("✓ Bereits weg — skip.");
}
