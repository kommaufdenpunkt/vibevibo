// ⏳ Zeitkapsel — Brief an dein zukünftiges Ich. Idempotent, hängt an lib/db.js an.

import fs from "node:fs";
import path from "node:path";

const DB = path.join(process.cwd(), "lib", "db.js");
if (!fs.existsSync(DB)) { console.error("⚠ lib/db.js nicht gefunden."); process.exit(0); }

let src = fs.readFileSync(DB, "utf8");
if (!src.includes("function db(") && !src.includes("function db (")) {
  console.error("⚠ db()-Accessor nicht gefunden — Abbruch (sicherheitshalber).");
  process.exit(1);
}
if (src.includes("export function zkCreate")) {
  console.log("ℹ Zeitkapsel bereits vorhanden — nichts zu tun.");
  process.exit(0);
}

const BLOCK = `

// ===== ⏳ Zeitkapsel — Brief an dein zukünftiges Ich =====
let _zkReady = false;
function _zkEnsure() {
  if (_zkReady) return;
  db().prepare("CREATE TABLE IF NOT EXISTS time_capsules (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, message TEXT NOT NULL, deliver_at INTEGER NOT NULL, created_at INTEGER NOT NULL)").run();
  try { db().prepare("CREATE INDEX IF NOT EXISTS idx_zk_user ON time_capsules(user_id)").run(); } catch {}
  _zkReady = true;
}
export function zkCreate(userId, message, deliverAt) {
  _zkEnsure();
  const now = Date.now();
  const msg = String(message || "").trim().slice(0, 2000);
  const dl = Number(deliverAt);
  if (!msg) return { ok: false, error: "Bitte schreib eine Nachricht." };
  if (!Number.isFinite(dl) || dl <= now + 60000) return { ok: false, error: "Das Zieldatum muss in der Zukunft liegen." };
  if (dl > now + 10 * 365 * 86400000) return { ok: false, error: "Maximal 10 Jahre in die Zukunft." };
  // Höchstens 50 offene Kapseln pro Nutzer (Spam-Schutz)
  const openCount = db().prepare("SELECT COUNT(*) AS c FROM time_capsules WHERE user_id = ? AND deliver_at > ?").get(Number(userId), now).c;
  if (openCount >= 50) return { ok: false, error: "Du hast schon sehr viele offene Zeitkapseln." };
  db().prepare("INSERT INTO time_capsules (user_id, message, deliver_at, created_at) VALUES (?, ?, ?, ?)").run(Number(userId), msg, dl, now);
  return { ok: true };
}
export function zkForUser(userId) {
  _zkEnsure();
  const now = Date.now();
  const rows = db().prepare("SELECT id, message, deliver_at AS deliverAt, created_at AS createdAt FROM time_capsules WHERE user_id = ? ORDER BY deliver_at ASC").all(Number(userId));
  return rows.map((r) => {
    const unlocked = r.deliverAt <= now;
    return { id: r.id, deliverAt: r.deliverAt, createdAt: r.createdAt, unlocked, message: unlocked ? r.message : null };
  });
}
`;

src += BLOCK;
fs.writeFileSync(DB, src, "utf8");
console.log("✅ lib/db.js ergänzt: Zeitkapsel (zkCreate, zkForUser)");
