// ⚽ KOMBINIERT: K.o. 4ever1 (KO2) + K.o. v3 (Tore + 20-Min) in EINEM Patch.
// Selbst-bootstrappend: fügt erst die KO2-Funktionen hinzu (falls sie fehlen — das war
// der Build-Fehler "tippUserBetsKO2 not found"), dann die KO3-Funktionen. Reihenfolge
// garantiert (eine Datei). Idempotent. Braucht _tippEnsureKO + _tippScore (aus patch-tipp + knockout).

import fs from "node:fs";
import path from "node:path";

const DB = path.join(process.cwd(), "lib", "db.js");
if (!fs.existsSync(DB)) { console.error("⚠ lib/db.js nicht gefunden."); process.exit(0); }

let src = fs.readFileSync(DB, "utf8");

if (!src.includes("function _tippEnsureKO")) {
  console.error("⚠ _tippEnsureKO (patch-tipp-knockout) fehlt — bitte zuerst vv_tipp_fix/knockout deployen.");
  process.exit(1);
}

const KO2_BLOCK = `

// ===== ⚽ K.o.-Wertung 4ever1 1:1 (KO2) =====
let _tippKO4Ready = false;
function _tippEnsureKO4() {
  if (_tippKO4Ready) return;
  _tippEnsureKO();
  for (const sql of [
    "ALTER TABLE tipp_bets ADD COLUMN dec_pick TEXT",
  ]) { try { db().prepare(sql).run(); } catch {} }
  _tippKO4Ready = true;
}
const _TIPP_DEC_REWARD = { reg: 1, aet: 3, pen: 5 };
const _TIPP_DEC_PENALTY = { reg: -2, aet: -3, pen: -4 };
function _tippDecScore(guess, actual) {
  if (!guess) return 0;
  if (guess === actual) return _TIPP_DEC_REWARD[guess] || 0;
  return _TIPP_DEC_PENALTY[guess] || 0;
}
export function tippUserBetsKO2(userId) {
  _tippEnsureKO4();
  return db().prepare(
    "SELECT match_id AS matchId, pred_home AS predHome, pred_away AS predAway, points, bonus, adv_pick AS advPick, dec_pick AS decPick FROM tipp_bets WHERE user_id = ?"
  ).all(Number(userId));
}
export function tippPlaceBetKO2(userId, matchId, opts = {}) {
  _tippEnsureKO4();
  const m = db().prepare("SELECT * FROM tipp_matches WHERE id = ?").get(Number(matchId));
  if (!m) return { ok: false, error: "Spiel nicht gefunden." };
  if (m.status !== "scheduled" || (m.kickoff_at && m.kickoff_at <= Date.now())) {
    return { ok: false, error: "Tipp-Abgabe für dieses Spiel ist geschlossen." };
  }
  const isKO = String(m.phase || "group") !== "group";
  let predH = null, predA = null, adv = null, dec = null;
  if (isKO) {
    adv = (opts.advPick === "home" || opts.advPick === "away") ? opts.advPick : null;
    dec = (opts.decPick === "reg" || opts.decPick === "aet" || opts.decPick === "pen") ? opts.decPick : null;
    if (!adv || !dec) return { ok: false, error: "K.o.: Bitte Weiterkommen UND Entscheidungsart wählen." };
  } else {
    const h = Number(opts.predHome), a = Number(opts.predAway);
    if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0 || h > 99 || a > 99) {
      return { ok: false, error: "Ungültiger Ergebnis-Tipp." };
    }
    predH = h; predA = a;
  }
  const now = Date.now();
  const ex = db().prepare("SELECT id FROM tipp_bets WHERE user_id = ? AND match_id = ?").get(Number(userId), Number(matchId));
  if (ex) {
    db().prepare("UPDATE tipp_bets SET pred_home = ?, pred_away = ?, adv_pick = ?, dec_pick = ?, updated_at = ? WHERE id = ?")
      .run(predH, predA, adv, dec, now, ex.id);
  } else {
    db().prepare("INSERT INTO tipp_bets (user_id, match_id, pred_home, pred_away, adv_pick, dec_pick, points, bonus, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)")
      .run(Number(userId), Number(matchId), predH, predA, adv, dec, now, now);
  }
  return { ok: true };
}
export function tippSetResultKO2(matchId, opts = {}) {
  _tippEnsureKO4();
  const m = db().prepare("SELECT * FROM tipp_matches WHERE id = ?").get(Number(matchId));
  if (!m) return false;
  const isKO = String(m.phase || "group") !== "group";
  const numOrNull = (v) => (v == null || v === "" || isNaN(Number(v))) ? null : Number(v);
  const sh = numOrNull(opts.scoreHome), sa = numOrNull(opts.scoreAway);
  let decision = null, winner = null, aetH = null, aetA = null, penH = null, penA = null;
  if (isKO) {
    winner = (opts.winner === "home" || opts.winner === "away") ? opts.winner : null;
    decision = (opts.decision === "reg" || opts.decision === "aet" || opts.decision === "pen") ? opts.decision : null;
    if (!winner || !decision) return false;
    if (decision === "aet") { aetH = numOrNull(opts.aetHome); aetA = numOrNull(opts.aetAway); }
    if (decision === "pen") { penH = numOrNull(opts.penHome); penA = numOrNull(opts.penAway); }
  } else {
    if (sh == null || sa == null) return false;
  }
  db().prepare(\`UPDATE tipp_matches SET score_home = ?, score_away = ?, status = 'finished', decision = ?, winner = ?, aet_home = ?, aet_away = ?, pen_home = ?, pen_away = ? WHERE id = ?\`)
    .run(sh, sa, decision, winner, aetH, aetA, penH, penA, Number(matchId));
  const bets = db().prepare("SELECT id, pred_home, pred_away, adv_pick, dec_pick FROM tipp_bets WHERE match_id = ?").all(Number(matchId));
  const upd = db().prepare("UPDATE tipp_bets SET points = ?, bonus = ? WHERE id = ?");
  for (const b of bets) {
    let pts = 0, bonus = 0;
    if (isKO) {
      const advPts = (b.adv_pick && b.adv_pick === winner) ? 1 : 0;
      const decPts = _tippDecScore(b.dec_pick, decision);
      pts = advPts + decPts; bonus = advPts;
    } else {
      pts = _tippScore(b.pred_home, b.pred_away, sh, sa);
    }
    upd.run(pts, bonus, b.id);
  }
  return true;
}
`;

const KO3_BLOCK = `

// ===== ⚽ K.o. v3 — Ergebnis + Weiterkommen + Entscheidungsart, 20-Min-Tipp-Schluss =====
const _TIPP_DEADLINE_MS = 20 * 60 * 1000;
export function tippPlaceBetKO3(userId, matchId, opts = {}) {
  _tippEnsureKO4();
  const m = db().prepare("SELECT * FROM tipp_matches WHERE id = ?").get(Number(matchId));
  if (!m) return { ok: false, error: "Spiel nicht gefunden." };
  if (m.status !== "scheduled" || (m.kickoff_at && m.kickoff_at <= Date.now() + _TIPP_DEADLINE_MS)) {
    return { ok: false, error: "Tipp-Schluss ist 20 Minuten vor Anpfiff." };
  }
  const h = Number(opts.predHome), a = Number(opts.predAway);
  if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0 || h > 99 || a > 99) {
    return { ok: false, error: "Ungültiges Ergebnis." };
  }
  const isKO = String(m.phase || "group") !== "group";
  let adv = null, dec = null;
  if (isKO) {
    adv = (opts.advPick === "home" || opts.advPick === "away") ? opts.advPick : null;
    dec = (opts.decPick === "reg" || opts.decPick === "aet" || opts.decPick === "pen") ? opts.decPick : null;
    if (!adv || !dec) return { ok: false, error: "K.o.: Weiterkommen UND Entscheidungsart wählen." };
  }
  const now = Date.now();
  const ex = db().prepare("SELECT id FROM tipp_bets WHERE user_id = ? AND match_id = ?").get(Number(userId), Number(matchId));
  if (ex) {
    db().prepare("UPDATE tipp_bets SET pred_home = ?, pred_away = ?, adv_pick = ?, dec_pick = ?, updated_at = ? WHERE id = ?")
      .run(h, a, adv, dec, now, ex.id);
  } else {
    db().prepare("INSERT INTO tipp_bets (user_id, match_id, pred_home, pred_away, adv_pick, dec_pick, points, bonus, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)")
      .run(Number(userId), Number(matchId), h, a, adv, dec, now, now);
  }
  return { ok: true };
}
export function tippSetResultKO3(matchId, opts = {}) {
  _tippEnsureKO4();
  const m = db().prepare("SELECT * FROM tipp_matches WHERE id = ?").get(Number(matchId));
  if (!m) return false;
  const isKO = String(m.phase || "group") !== "group";
  const numOrNull = (v) => (v == null || v === "" || isNaN(Number(v))) ? null : Number(v);
  const sh = numOrNull(opts.scoreHome), sa = numOrNull(opts.scoreAway);
  if (sh == null || sa == null) return false;
  let decision = null, winner = null, aetH = null, aetA = null, penH = null, penA = null;
  if (isKO) {
    winner = (opts.winner === "home" || opts.winner === "away") ? opts.winner : null;
    decision = (opts.decision === "reg" || opts.decision === "aet" || opts.decision === "pen") ? opts.decision : null;
    if (!winner || !decision) return false;
    if (decision === "aet") { aetH = numOrNull(opts.aetHome); aetA = numOrNull(opts.aetAway); }
    if (decision === "pen") { penH = numOrNull(opts.penHome); penA = numOrNull(opts.penAway); }
  }
  db().prepare(\`UPDATE tipp_matches SET score_home = ?, score_away = ?, status = 'finished', decision = ?, winner = ?, aet_home = ?, aet_away = ?, pen_home = ?, pen_away = ? WHERE id = ?\`)
    .run(sh, sa, decision, winner, aetH, aetA, penH, penA, Number(matchId));
  const bets = db().prepare("SELECT id, pred_home, pred_away, adv_pick, dec_pick FROM tipp_bets WHERE match_id = ?").all(Number(matchId));
  const upd = db().prepare("UPDATE tipp_bets SET points = ?, bonus = ? WHERE id = ?");
  for (const b of bets) {
    const base = _tippScore(b.pred_home, b.pred_away, sh, sa);
    let extra = 0;
    if (isKO) {
      const advPts = (b.adv_pick && b.adv_pick === winner) ? 1 : 0;
      const decPts = _tippDecScore(b.dec_pick, decision);
      extra = advPts + decPts;
    }
    upd.run(base + extra, extra, b.id);
  }
  return true;
}
`;

const notes = [];
if (!src.includes("export function tippSetResultKO2")) { src += KO2_BLOCK; notes.push("KO2 (4ever1)"); }
if (!src.includes("export function tippSetResultKO3")) { src += KO3_BLOCK; notes.push("KO3 (Tore+20Min)"); }

if (notes.length) {
  fs.writeFileSync(DB, src, "utf8");
  console.log("✅ lib/db.js ergänzt: " + notes.join(" + "));
} else {
  console.log("ℹ K.o.-Funktionen bereits vorhanden — nichts zu tun.");
}
