// ⚽ WM-Tipp K.o.-Runde — Verlängerung / Elfmeterschießen / Weiterkommen.
// Idempotent, append-only in lib/db.js. ALTE Funktionen bleiben unangetastet —
// neue heißen *KO und werden von den Routes bevorzugt. Punkte: 90-Min-Ergebnis
// (exakt 4 / Tordiff 3 / Tendenz 2) + 1 Bonus fürs richtige weiterkommende Team.

import fs from "node:fs";
import path from "node:path";

const DB = path.join(process.cwd(), "lib", "db.js");
if (!fs.existsSync(DB)) { console.error("⚠ lib/db.js nicht gefunden."); process.exit(0); }

let src = fs.readFileSync(DB, "utf8");
if (src.includes("export function tippSetResultKO")) {
  console.log("ℹ K.o.-Tipp-Funktionen bereits vorhanden — nichts zu tun.");
  process.exit(0);
}
if (!src.includes("function _tippEnsure")) {
  console.error("⚠ Basis-Tipp-Funktionen (_tippEnsure) fehlen — bitte zuerst vv_tipp deployen.");
  process.exit(1);
}

const BLOCK = `

// ===== ⚽ WM-Tipp K.o.-Runde (auto-injected via scripts/patch-tipp-knockout.mjs) =====
let _tippKOReady = false;
function _tippEnsureKO() {
  if (_tippKOReady) return;
  _tippEnsure();
  for (const sql of [
    "ALTER TABLE tipp_matches ADD COLUMN decision TEXT",   // 'reg' | 'aet' (n.V.) | 'pen' (i.E.)
    "ALTER TABLE tipp_matches ADD COLUMN winner TEXT",     // 'home' | 'away' (kommt weiter)
    "ALTER TABLE tipp_matches ADD COLUMN aet_home INTEGER",
    "ALTER TABLE tipp_matches ADD COLUMN aet_away INTEGER",
    "ALTER TABLE tipp_matches ADD COLUMN pen_home INTEGER",
    "ALTER TABLE tipp_matches ADD COLUMN pen_away INTEGER",
    "ALTER TABLE tipp_bets ADD COLUMN adv_pick TEXT",      // 'home' | 'away' (Tipp: wer weiter)
    "ALTER TABLE tipp_bets ADD COLUMN bonus INTEGER DEFAULT 0",
  ]) { try { db().prepare(sql).run(); } catch {} }
  _tippKOReady = true;
}

function _tippIsKO(phase) { return String(phase || "group") !== "group"; }

// Welches Team kommt laut diesem Tipp weiter? Bei klarem Ergebnis der Führende,
// bei Unentschieden-Tipp die explizite Auswahl (adv_pick).
function _tippAdvPick(predHome, predAway, advPick) {
  if (predHome == null || predAway == null) return null;
  if (predHome > predAway) return "home";
  if (predAway > predHome) return "away";
  return (advPick === "home" || advPick === "away") ? advPick : null;
}

export function tippMatchesRichKO() {
  _tippEnsureKO();
  if (typeof _tippEnsureImport === "function") { try { _tippEnsureImport(); } catch {} }
  return db().prepare(\`
    SELECT id, ext_id AS extId, phase, team_home AS teamHome, team_away AS teamAway,
           kickoff_at AS kickoffAt, score_home AS scoreHome, score_away AS scoreAway, status,
           group_letter AS groupLetter, home_flag AS homeFlag, away_flag AS awayFlag,
           decision, winner, aet_home AS aetHome, aet_away AS aetAway, pen_home AS penHome, pen_away AS penAway
      FROM tipp_matches ORDER BY kickoff_at ASC, id ASC
  \`).all();
}

export function tippUserBetsKO(userId) {
  _tippEnsureKO();
  return db().prepare(
    "SELECT match_id AS matchId, pred_home AS predHome, pred_away AS predAway, points, bonus, adv_pick AS advPick FROM tipp_bets WHERE user_id = ?"
  ).all(Number(userId));
}

export function tippPlaceBetKO(userId, matchId, h, a, advPick) {
  _tippEnsureKO();
  const m = db().prepare("SELECT * FROM tipp_matches WHERE id = ?").get(Number(matchId));
  if (!m) return { ok: false, error: "Spiel nicht gefunden." };
  if (m.status !== "scheduled" || (m.kickoff_at && m.kickoff_at <= Date.now())) {
    return { ok: false, error: "Tipp-Abgabe für dieses Spiel ist geschlossen." };
  }
  const ap = (advPick === "home" || advPick === "away") ? advPick : null;
  const now = Date.now();
  const ex = db().prepare("SELECT id FROM tipp_bets WHERE user_id = ? AND match_id = ?").get(Number(userId), Number(matchId));
  if (ex) {
    db().prepare("UPDATE tipp_bets SET pred_home = ?, pred_away = ?, adv_pick = ?, updated_at = ? WHERE id = ?")
      .run(Number(h), Number(a), ap, now, ex.id);
  } else {
    db().prepare("INSERT INTO tipp_bets (user_id, match_id, pred_home, pred_away, adv_pick, points, bonus, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)")
      .run(Number(userId), Number(matchId), Number(h), Number(a), ap, now, now);
  }
  return { ok: true };
}

// Ergebnis setzen inkl. K.o.-Details. opts: { scoreHome, scoreAway, decision, winner, aetHome, aetAway, penHome, penAway }
export function tippSetResultKO(matchId, opts = {}) {
  _tippEnsureKO();
  const m = db().prepare("SELECT * FROM tipp_matches WHERE id = ?").get(Number(matchId));
  if (!m) return false;
  const sh = Number(opts.scoreHome), sa = Number(opts.scoreAway);
  if (!Number.isInteger(sh) || !Number.isInteger(sa)) return false;

  const ko = _tippIsKO(m.phase);
  let decision = null, winner = null, aetH = null, aetA = null, penH = null, penA = null;
  const numOrNull = (v) => (v == null || v === "" || isNaN(Number(v))) ? null : Number(v);

  if (ko) {
    decision = (opts.decision === "aet" || opts.decision === "pen") ? opts.decision : "reg";
    if (sh > sa) winner = "home";
    else if (sa > sh) winner = "away";
    else {
      // Unentschieden nach 90 Min → muss in Verlängerung/Elfmeter entschieden werden
      winner = (opts.winner === "home" || opts.winner === "away") ? opts.winner : null;
      if (decision === "reg") decision = "aet";
    }
    if (decision === "aet") { aetH = numOrNull(opts.aetHome); aetA = numOrNull(opts.aetAway); }
    if (decision === "pen") { penH = numOrNull(opts.penHome); penA = numOrNull(opts.penAway); }
  }

  db().prepare(\`UPDATE tipp_matches
      SET score_home = ?, score_away = ?, status = 'finished',
          decision = ?, winner = ?, aet_home = ?, aet_away = ?, pen_home = ?, pen_away = ?
    WHERE id = ?\`)
    .run(sh, sa, decision, winner, aetH, aetA, penH, penA, Number(matchId));

  const bets = db().prepare("SELECT id, pred_home, pred_away, adv_pick FROM tipp_bets WHERE match_id = ?").all(Number(matchId));
  const upd = db().prepare("UPDATE tipp_bets SET points = ?, bonus = ? WHERE id = ?");
  for (const b of bets) {
    const base = _tippScore(b.pred_home, b.pred_away, sh, sa);
    let bonus = 0;
    if (ko && winner) {
      const pick = _tippAdvPick(b.pred_home, b.pred_away, b.adv_pick);
      if (pick && pick === winner) bonus = 1;
    }
    upd.run(base + bonus, bonus, b.id);
  }
  return true;
}
`;

src = src.replace(/\s*$/, "\n") + BLOCK;
fs.writeFileSync(DB, src, "utf8");
console.log("✅ lib/db.js: K.o.-Tipp-Funktionen ergänzt (Verlängerung/Elfmeter/Weiterkommen).");
