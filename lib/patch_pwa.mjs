// Patcht lib/db.js: fuegt pwa_installs Tabelle + 2 Helpers hinzu.
// Idempotent: kann mehrfach laufen.
import fs from 'fs';
const PATH = process.env.HOME + '/vibevibo/lib/db.js';

const MARKER_TABLE = "CREATE TABLE IF NOT EXISTS user_inventory";
const TABLE_INSERT = `    CREATE TABLE IF NOT EXISTS pwa_installs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      user_agent TEXT,
      installed_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      UNIQUE (user_id, platform)
    );
    CREATE INDEX IF NOT EXISTS idx_pwa_installs_user ON pwa_installs(user_id);

`;

const HELPERS = `

// =================================================================
// PWA-Install-Tracking
// =================================================================
export function recordPwaInstall(userId, platform, userAgent = "") {
  if (!userId || !platform) return;
  const now = Date.now();
  const plat = String(platform).slice(0, 32);
  const ua = String(userAgent || "").slice(0, 280);
  db().prepare(\`
    INSERT INTO pwa_installs (user_id, platform, user_agent, installed_at, last_seen)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, platform) DO UPDATE SET
      user_agent = excluded.user_agent,
      last_seen = excluded.last_seen
  \`).run(userId, plat, ua, now, now);
}

export function listPwaInstalls() {
  return db().prepare(\`
    SELECT pi.user_id AS userId, pi.platform, pi.user_agent AS userAgent,
           pi.installed_at AS installedAt, pi.last_seen AS lastSeen,
           u.username, u.display_name AS displayName
      FROM pwa_installs pi
      JOIN users u ON u.id = pi.user_id
     ORDER BY pi.installed_at DESC
  \`).all();
}
`;

const c = fs.readFileSync(PATH, 'utf-8');

if (c.includes("CREATE TABLE IF NOT EXISTS pwa_installs")) {
  console.log("Schon angewendet, skip.");
  process.exit(0);
}
if (!c.includes(MARKER_TABLE)) {
  console.error("Marker fuer Table nicht gefunden");
  process.exit(1);
}

const out = c.replace(MARKER_TABLE, TABLE_INSERT + "    " + MARKER_TABLE) + HELPERS;
fs.writeFileSync(PATH, out);
console.log("PWA-Tracking-Patch angewendet (Tabelle + 2 Helpers)");
