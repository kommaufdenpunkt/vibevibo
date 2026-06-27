// ⚽ WM-Tipp Migration (4ever1 → vibevibo) — DB-Erweiterung, idempotent, in db.js injiziert.
//
// Bringt: tipp_teams, Import-Spalten auf tipp_matches (ext_id/group/flags),
// tipp_import_users (die 8 Tipper als Bestenlisten-Profile) + tipp_import_tips (alle Tipps).
// Plus tippImport() (schreibt alles), tippImportedBoard(), tippMatchesRich(), tippAllImportTips().

import fs from "node:fs";
import path from "node:path";

const DB = path.join(process.cwd(), "lib", "db.js");
if (!fs.existsSync(DB)) { console.error("⚠ lib/db.js nicht gefunden."); process.exit(1); }

let src = fs.readFileSync(DB, "utf8");
if (src.includes("export function tippImport")) {
  console.log("ℹ Tipp-Migration-Funktionen bereits vorhanden — nichts zu tun.");
  process.exit(0);
}
if (!src.includes("function _tippEnsure")) {
  console.error("⚠ Basis-Tipp-Funktionen (_tippEnsure) fehlen — bitte zuerst vv_tipp deployen.");
  process.exit(1);
}

const BLOCK = `

// ===== ⚽ WM-Tipp Migration (4ever1 → vibevibo) =====
let _tippImpReady = false;
function _tippEnsureImport() {
  if (_tippImpReady) return;
  for (const sql of [
    "ALTER TABLE tipp_matches ADD COLUMN ext_id INTEGER",
    "ALTER TABLE tipp_matches ADD COLUMN group_letter TEXT",
    "ALTER TABLE tipp_matches ADD COLUMN home_flag TEXT",
    "ALTER TABLE tipp_matches ADD COLUMN away_flag TEXT",
  ]) { try { db().prepare(sql).run(); } catch {} }
  try { db().prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_tipp_match_ext ON tipp_matches(ext_id)").run(); } catch {}
  db().prepare("CREATE TABLE IF NOT EXISTS tipp_teams (code TEXT PRIMARY KEY, name TEXT, flag TEXT, group_letter TEXT, eliminated INTEGER DEFAULT 0)").run();
  db().prepare("CREATE TABLE IF NOT EXISTS tipp_import_users (name TEXT PRIMARY KEY, avatar TEXT, points REAL DEFAULT 0, scored INTEGER DEFAULT 0)").run();
  db().prepare("CREATE TABLE IF NOT EXISTS tipp_import_tips (ext_match_id INTEGER, tipper TEXT, home INTEGER, away INTEGER, joker INTEGER DEFAULT 0, points REAL)").run();
  try { db().prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_tipp_imptip ON tipp_import_tips(ext_match_id, tipper)").run(); } catch {}
  _tippImpReady = true;
}

// Schreibt den kompletten Import in einer Transaktion. Gibt Zähler zurück.
export function tippImport({ teams = [], matches = [], ranking = [], tips = [] }) {
  _tippEnsure();
  _tippEnsureImport();
  const d = db();
  const apply = d.transaction(() => {
    const upTeam = d.prepare("INSERT INTO tipp_teams (code,name,flag,group_letter,eliminated) VALUES (?,?,?,?,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name, flag=excluded.flag, group_letter=excluded.group_letter, eliminated=excluded.eliminated");
    for (const t of teams) {
      if (!t || !t.code) continue;
      upTeam.run(String(t.code), String(t.name || ""), String(t.flag_emoji || t.flag || ""), String(t.group_letter || ""), t.eliminated ? 1 : 0);
    }

    const upMatch = d.prepare(\`INSERT INTO tipp_matches (ext_id, phase, team_home, team_away, kickoff_at, score_home, score_away, status, group_letter, home_flag, away_flag, created_at)
      VALUES (@ext,@phase,@h,@a,@ko,@sh,@sa,@st,@grp,@hf,@af,@now)
      ON CONFLICT(ext_id) DO UPDATE SET phase=excluded.phase, team_home=excluded.team_home, team_away=excluded.team_away,
        kickoff_at=excluded.kickoff_at, score_home=excluded.score_home, score_away=excluded.score_away,
        status=excluded.status, group_letter=excluded.group_letter, home_flag=excluded.home_flag, away_flag=excluded.away_flag\`);
    const now = Date.now();
    for (const m of matches) {
      if (!m || m.id == null) continue;
      const ko = m.kickoff_at ? Date.parse(m.kickoff_at) : NaN;
      upMatch.run({
        ext: Number(m.id),
        phase: String(m.stage || "group"),
        h: String(m.home || m.home_code || "?"),
        a: String(m.away || m.away_code || "?"),
        ko: Number.isFinite(ko) ? ko : null,
        sh: (m.home_goals == null ? null : Number(m.home_goals)),
        sa: (m.away_goals == null ? null : Number(m.away_goals)),
        st: String(m.status || "scheduled"),
        grp: String(m.group_letter || ""),
        hf: String(m.home_flag || ""),
        af: String(m.away_flag || ""),
        now,
      });
    }

    const upUser = d.prepare("INSERT INTO tipp_import_users (name,avatar,points,scored) VALUES (?,?,?,?) ON CONFLICT(name) DO UPDATE SET avatar=excluded.avatar, points=excluded.points, scored=excluded.scored");
    for (const u of ranking) {
      if (!u || !u.name) continue;
      upUser.run(String(u.name), u.avatar ? String(u.avatar) : null, Number(u.points || 0), Number(u.scored || 0));
    }

    if (tips.length) {
      d.prepare("DELETE FROM tipp_import_tips").run();
      const upTip = d.prepare("INSERT INTO tipp_import_tips (ext_match_id,tipper,home,away,joker,points) VALUES (?,?,?,?,?,?) ON CONFLICT(ext_match_id,tipper) DO UPDATE SET home=excluded.home, away=excluded.away, joker=excluded.joker, points=excluded.points");
      for (const t of tips) {
        if (!t || !t.tipper || t.extMatchId == null) continue;
        upTip.run(Number(t.extMatchId), String(t.tipper), t.home == null ? null : Number(t.home), t.away == null ? null : Number(t.away), t.joker ? 1 : 0, t.points == null ? null : Number(t.points));
      }
    }
  });
  apply();
  return { teams: teams.length, matches: matches.length, users: ranking.length, tips: tips.length };
}

export function tippImportedBoard() {
  _tippEnsureImport();
  return db().prepare("SELECT name, avatar, points, scored FROM tipp_import_users ORDER BY points DESC, scored DESC, name ASC").all();
}

export function tippMatchesRich() {
  _tippEnsureImport();
  return db().prepare(\`
    SELECT id, ext_id AS extId, phase, team_home AS teamHome, team_away AS teamAway,
           kickoff_at AS kickoffAt, score_home AS scoreHome, score_away AS scoreAway, status,
           group_letter AS groupLetter, home_flag AS homeFlag, away_flag AS awayFlag
      FROM tipp_matches ORDER BY kickoff_at ASC, id ASC
  \`).all();
}

export function tippAllImportTips() {
  _tippEnsureImport();
  return db().prepare("SELECT ext_match_id AS extMatchId, tipper, home, away, joker, points FROM tipp_import_tips").all();
}
`;

src = src.replace(/\s*$/, "\n") + BLOCK;
fs.writeFileSync(DB, src, "utf8");
console.log("✅ lib/db.js: WM-Tipp-Migrations-Funktionen ergänzt.");
