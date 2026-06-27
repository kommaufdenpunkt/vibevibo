#!/usr/bin/env node
// 🏘 Fügt "Coms-Anträge" → /mcp/coms-requests in die MCP-Nav (Gruppe 🚨 Leitung) ein.
// Idempotent.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(resolve(__dirname, ".."), "components", "mcp", "McpEdgePanels.jsx");

let src = readFileSync(FILE, "utf-8");

if (src.includes("/mcp/coms-requests")) {
  console.log("• MCP-Nav: Coms-Anträge schon vorhanden.\n✓ Nichts zu tun.");
  process.exit(0);
}

// NAV_GROUP_LEAD endet mit:  "  ],\n};"  (Items-Array zu + Objekt zu) — einzigartig.
const ANCHOR = "  ],\n};";
if (!src.includes(ANCHOR)) {
  console.error("✗ Anker (NAV_GROUP_LEAD-Ende) nicht gefunden — Abbruch.");
  process.exit(1);
}

const NEW_ITEM =
  '    { href: "/mcp/coms-requests", label: "Coms-Anträge", icon: "🏘", bg: "linear-gradient(135deg, #db2777, #9d174d)" },\n' +
  ANCHOR;

// Nur das ERSTE Vorkommen ersetzen (das ist NAV_GROUP_LEAD).
src = src.replace(ANCHOR, NEW_ITEM);

writeFileSync(FILE, src);
console.log("✓ MCP-Nav: 🏘 Coms-Anträge → /mcp/coms-requests ergänzt.\n✅ McpEdgePanels.jsx gepatcht.");
