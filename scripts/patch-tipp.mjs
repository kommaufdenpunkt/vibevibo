// ⚽ WM-Tipp 2026 — DB-Foundation (idempotent, in db.js injiziert, nie aus Tarball).
//
// Tabellen: tipp_matches (Spiele) + tipp_bets (Tipps).
// Punkte (Kicktipp-Style): exakt 4 · Tordifferenz 3 · Tendenz 2 · sonst 0.

import fs from "node:fs";
import path from "node:path";

const DB = path.join(process.cwd(), "lib", "db.js");
if (!fs.existsSync(DB)) { console.error("⚠ lib/db.js nicht gefunden."); process.exit(1); }

let src = fs.readFileSync(DB, "utf8");
if (src.includes("export function tippListMatches")) {
  console.log("ℹ Tipp-Funktionen bereits vorhanden — nichts zu tun.");
  process.exit(0);
}

const BLOCK = `

// ===== ⚽ WM-Tipp 2026 (auto-injected via scripts/patch-tipp.mjs) =====
let _tippReady = false;
function _tippEnsure() {
  if (_tippReady) return;
  db().prepare(\`CREATE TABLE IF NOT EXISTS tipp_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phase TEXT DEFAULT 'group',
    team_home TEXT, team_away TEXT,
    kickoff_at INTEGER,
    score_home INTEGER, score_away INTEGER,
    status TEXT DEFAULT 'scheduled',
    created_at INTEGER
  )\`).run();
  db().prepare(\`CREATE TABLE IF NOT EXISTS tipp_bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, match_id INTEGER,
    pred_home INTEGER, pred_away INTEGER,
    points INTEGER DEFAULT 0,
    created_at INTEGER, updated_at INTEGER
  )\`).run();
  try { db().prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_tipp_bet_uniq ON tipp_bets(user_id, match_id)").run(); } catch {}
  try { db().prepare("CREATE INDEX IF NOT EXISTS idx_tipp_bet_match ON tipp_bets(match_id)").run(); } catch {}
  _tippReady = true;
}

function _tippScore(ph, pa, sh, sa) {
  if (ph == null || pa == null || sh == null || sa == null) return 0;
  if (ph === sh && pa === sa) return 4;                       // exaktes Ergebnis
  if ((ph - pa) === (sh - sa) && (ph - pa) !== 0) return 3;   // gleiche (echte) Tordifferenz
  const t = (x, y) => (x > y ? 1 : x < y ? -1 : 0);
  if (t(ph, pa) === t(sh, sa)) return 2;                      // richtige Tendenz (inkl. Remis)
  return 0;
}

export function tippListMatches() {
  _tippEnsure();
  return db().prepare(\`
    SELECT id, phase, team_home AS teamHome, team_away AS teamAway,
           kickoff_at AS kickoffAt, score_home AS scoreHome, score_away AS scoreAway, status
      FROM tipp_matches ORDER BY kickoff_at ASC, id ASC
  \`).all();
}

export function tippUserBets(userId) {
  _tippEnsure();
  return db().prepare(
    "SELECT match_id AS matchId, pred_home AS predHome, pred_away AS predAway, points FROM tipp_bets WHERE user_id = ?"
  ).all(Number(userId));
}

export function tippPlaceBet(userId, matchId, h, a) {
  _tippEnsure();
  const m = db().prepare("SELECT * FROM tipp_matches WHERE id = ?").get(Number(matchId));
  if (!m) return { ok: false, error: "Spiel nicht gefunden." };
  if (m.status !== "scheduled" || (m.kickoff_at && m.kickoff_at <= Date.now())) {
    return { ok: false, error: "Tipp-Abgabe für dieses Spiel ist geschlossen." };
  }
  const now = Date.now();
  const ex = db().prepare("SELECT id FROM tipp_bets WHERE user_id = ? AND match_id = ?").get(Number(userId), Number(matchId));
  if (ex) {
    db().prepare("UPDATE tipp_bets SET pred_home = ?, pred_away = ?, updated_at = ? WHERE id = ?").run(Number(h), Number(a), now, ex.id);
  } else {
    db().prepare("INSERT INTO tipp_bets (user_id, match_id, pred_home, pred_away, points, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)")
      .run(Number(userId), Number(matchId), Number(h), Number(a), now, now);
  }
  return { ok: true };
}

export function tippLeaderboard(limit = 50) {
  _tippEnsure();
  return db().prepare(\`
    SELECT u.id, u.username, u.display_name AS displayName, u.avatar_url AS avatarUrl,
           COALESCE(SUM(b.points), 0) AS points, COUNT(b.id) AS bets
      FROM tipp_bets b JOIN users u ON u.id = b.user_id
     GROUP BY b.user_id
     ORDER BY points DESC, bets DESC, u.id ASC
     LIMIT ?
  \`).all(Number(limit));
}

// ---- Admin ----
export function tippCreateMatch({ phase, teamHome, teamAway, kickoffAt }) {
  _tippEnsure();
  const info = db().prepare(
    "INSERT INTO tipp_matches (phase, team_home, team_away, kickoff_at, status, created_at) VALUES (?, ?, ?, ?, 'scheduled', ?)"
  ).run(String(phase || "group"), String(teamHome || "").slice(0, 40), String(teamAway || "").slice(0, 40), Number(kickoffAt) || null, Date.now());
  return info.lastInsertRowid;
}

export function tippSetResult(matchId, scoreHome, scoreAway) {
  _tippEnsure();
  const m = db().prepare("SELECT id FROM tipp_matches WHERE id = ?").get(Number(matchId));
  if (!m) return false;
  const sh = Number(scoreHome), sa = Number(scoreAway);
  db().prepare("UPDATE tipp_matches SET score_home = ?, score_away = ?, status = 'finished' WHERE id = ?").run(sh, sa, Number(matchId));
  const bets = db().prepare("SELECT id, pred_home, pred_away FROM tipp_bets WHERE match_id = ?").all(Number(matchId));
  const upd = db().prepare("UPDATE tipp_bets SET points = ? WHERE id = ?");
  for (const b of bets) upd.run(_tippScore(b.pred_home, b.pred_away, sh, sa), b.id);
  return true;
}

export function tippDeleteMatch(matchId) {
  _tippEnsure();
  db().prepare("DELETE FROM tipp_bets WHERE match_id = ?").run(Number(matchId));
  db().prepare("DELETE FROM tipp_matches WHERE id = ?").run(Number(matchId));
  return true;
}
`;

src = src.replace(/\s*$/, "\n") + BLOCK;
fs.writeFileSync(DB, src, "utf8");
console.log("✅ lib/db.js: WM-Tipp-Funktionen ergänzt.");
