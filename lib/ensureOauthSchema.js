// 🛡 Self-Healing für OAuth-Spalten in users-Tabelle.
//
// Wird VOR jedem OAuth-Call aufgerufen. Prüft ob die nötigen Spalten existieren
// und legt fehlende per ALTER TABLE an. Idempotent — ALTER schlägt fehl wenn die
// Spalte schon da ist, das ignorieren wir. Pro Prozess nur einmal aktiv.
//
// Hintergrund: die Schema-Patches via scripts/patch-*.mjs landen nicht immer
// zuverlässig in db.js auf Coolify. Diese Datei ist ein neuer, unabhängiger
// Schutz-Layer der direkt im Request-Pfad läuft.

import * as DB from "@/lib/db";

let _checked = false;

const NEEDED_COLUMNS = [
  { name: "email",            type: "TEXT DEFAULT ''" },
  { name: "facebook_id",      type: "TEXT DEFAULT ''" },
  { name: "google_id",        type: "TEXT DEFAULT ''" },
  { name: "needs_onboarding", type: "INTEGER DEFAULT 0" },
];

export function ensureOAuthColumns() {
  if (_checked) return;
  if (typeof DB.db !== "function") return;
  try {
    const d = DB.db();
    const cols = d.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
    for (const c of NEEDED_COLUMNS) {
      if (!cols.includes(c.name)) {
        try { d.exec(`ALTER TABLE users ADD COLUMN ${c.name} ${c.type}`); } catch {}
      }
    }
    try { d.exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email != ''"); } catch {}
    try { d.exec("CREATE INDEX IF NOT EXISTS idx_users_facebook ON users(facebook_id) WHERE facebook_id != ''"); } catch {}
    try { d.exec("CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id) WHERE google_id != ''"); } catch {}
    _checked = true;
  } catch {}
}

// Reset für Tests/Debug-Endpunkte
export function _resetOAuthSchemaCheck() { _checked = false; }
