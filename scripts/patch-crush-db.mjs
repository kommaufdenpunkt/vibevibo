// 💘 Heimlich verknallt (Secret Crush). Idempotent, hängt an lib/db.js an.
// Erkennt die Users-Tabelle + Spalten selbst (PRAGMA), fasst KEINE Auth-/Notify-Interna an.

import fs from "node:fs";
import path from "node:path";

const DB = path.join(process.cwd(), "lib", "db.js");
if (!fs.existsSync(DB)) { console.error("⚠ lib/db.js nicht gefunden."); process.exit(0); }

let src = fs.readFileSync(DB, "utf8");
if (!src.includes("function db(") && !src.includes("function db (")) {
  console.error("⚠ db()-Accessor nicht gefunden — Abbruch (sicherheitshalber).");
  process.exit(1);
}
if (src.includes("export function crushAdd")) {
  console.log("ℹ Heimlich-verknallt bereits vorhanden — nichts zu tun.");
  process.exit(0);
}

const BLOCK = `

// ===== 💘 Heimlich verknallt (Secret Crush) =====
const CRUSH_MAX = 5;
let _crushReady = false;
let _crushMeta = null;
function _crushIntrospect() {
  if (_crushMeta) return _crushMeta;
  const d = db();
  let tbl = null, cols = null;
  let tables = [];
  try { tables = d.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name); } catch {}
  const prefer = ["users", "user", "accounts", "account", "members", "member"];
  const ordered = [...tables].sort((a, b) => (prefer.indexOf(a.toLowerCase()) + 1 || 99) - (prefer.indexOf(b.toLowerCase()) + 1 || 99));
  for (const t of ordered) {
    let info = [];
    try { info = d.prepare("PRAGMA table_info(" + t + ")").all(); } catch { continue; }
    const names = info.map((c) => c.name);
    const low = names.map((n) => String(n).toLowerCase());
    if (low.includes("id") && low.includes("username")) {
      const pick = (cands) => { for (const c of cands) { const i = low.indexOf(c); if (i >= 0) return names[i]; } return null; };
      tbl = t;
      cols = {
        id: names[low.indexOf("id")],
        username: names[low.indexOf("username")],
        display: pick(["display_name", "displayname", "name", "nick", "nickname", "real_name"]),
        avatar: pick(["avatar_url", "avatarurl", "avatar", "photo", "photo_url", "image_url", "profile_image"]),
      };
      break;
    }
  }
  _crushMeta = { tbl, cols };
  return _crushMeta;
}
function _crushEnsure() {
  if (_crushReady) return;
  db().prepare("CREATE TABLE IF NOT EXISTS secret_crushes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, target_id INTEGER NOT NULL, created_at INTEGER NOT NULL, UNIQUE(user_id, target_id))").run();
  try { db().prepare("CREATE INDEX IF NOT EXISTS idx_crush_user ON secret_crushes(user_id)").run(); } catch {}
  try { db().prepare("CREATE INDEX IF NOT EXISTS idx_crush_target ON secret_crushes(target_id)").run(); } catch {}
  _crushReady = true;
}
function _crushSelect() {
  const { cols } = _crushIntrospect();
  const sel = [cols.id + " AS id", cols.username + " AS username"];
  sel.push((cols.display ? cols.display : "NULL") + " AS displayName");
  sel.push((cols.avatar ? cols.avatar : "NULL") + " AS avatarUrl");
  return sel.join(", ");
}
function _crushUserRow(id) {
  const { tbl, cols } = _crushIntrospect();
  if (!tbl) return null;
  try { return db().prepare("SELECT " + _crushSelect() + " FROM " + tbl + " WHERE " + cols.id + "=?").get(Number(id)) || null; }
  catch { return null; }
}
export function crushResolveUser(username) {
  const { tbl, cols } = _crushIntrospect();
  if (!tbl) return null;
  const uname = String(username || "").trim().replace(/^@/, "");
  if (!uname) return null;
  try { return db().prepare("SELECT " + _crushSelect() + " FROM " + tbl + " WHERE lower(" + cols.username + ")=lower(?)").get(uname) || null; }
  catch { return null; }
}
export function crushAdd(userId, username) {
  _crushEnsure();
  const me = Number(userId);
  const target = crushResolveUser(username);
  if (!target) return { ok: false, error: "Diese Person gibt es nicht. Prüf den Namen." };
  if (Number(target.id) === me) return { ok: false, error: "Dich selbst? 😄 Wähl jemand anderen." };
  const already = db().prepare("SELECT 1 FROM secret_crushes WHERE user_id=? AND target_id=?").get(me, Number(target.id));
  if (!already) {
    const cnt = db().prepare("SELECT COUNT(*) AS c FROM secret_crushes WHERE user_id=?").get(me).c;
    if (cnt >= CRUSH_MAX) return { ok: false, error: "Höchstens " + CRUSH_MAX + " Personen. Entferne zuerst eine." };
    db().prepare("INSERT OR IGNORE INTO secret_crushes (user_id, target_id, created_at) VALUES (?,?,?)").run(me, Number(target.id), Date.now());
  }
  const reciprocal = db().prepare("SELECT 1 FROM secret_crushes WHERE user_id=? AND target_id=?").get(Number(target.id), me);
  return { ok: true, matched: !!reciprocal, target: { username: target.username, displayName: target.displayName, avatarUrl: target.avatarUrl } };
}
export function crushRemove(userId, username) {
  _crushEnsure();
  const me = Number(userId);
  const target = crushResolveUser(username);
  if (!target) return { ok: false, error: "Diese Person gibt es nicht." };
  db().prepare("DELETE FROM secret_crushes WHERE user_id=? AND target_id=?").run(me, Number(target.id));
  return { ok: true };
}
export function crushOverview(userId) {
  _crushEnsure();
  const me = Number(userId);
  let rows = [];
  try { rows = db().prepare("SELECT target_id, created_at FROM secret_crushes WHERE user_id=? ORDER BY created_at ASC").all(me); } catch {}
  const picks = rows.map((r) => {
    const u = _crushUserRow(r.target_id);
    if (!u) return null;
    const matched = !!db().prepare("SELECT 1 FROM secret_crushes WHERE user_id=? AND target_id=?").get(Number(r.target_id), me);
    return { username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, matched };
  }).filter(Boolean);
  const matches = picks.filter((p) => p.matched);
  let admirerTotal = 0;
  try { admirerTotal = db().prepare("SELECT COUNT(*) AS c FROM secret_crushes WHERE target_id=?").get(me).c; } catch {}
  const secretAdmirers = Math.max(0, admirerTotal - matches.length);
  return { picks, matches, secretAdmirers, max: CRUSH_MAX };
}
`;

src += BLOCK;
fs.writeFileSync(DB, src, "utf8");
console.log("✅ lib/db.js ergänzt: Heimlich verknallt (crushAdd, crushRemove, crushOverview)");
