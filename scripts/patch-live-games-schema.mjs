#!/usr/bin/env node
// 🎮 Sprint 1: Game-Foundation — DB-Schema + Storage-Helper
//
// Neue Tabellen:
//   • live_games           — ein Spiel pro Eintrag, gebunden an live_streams.id
//   • live_game_players    — Spieler-Slots (echte + Bot + Spectator-Couch)
//   • live_game_moves      — Audit-Log jeder Aktion (Anti-Cheat, Replay)
//
// Helper (alle exported):
//   • createLiveGame, getActiveLiveGame, getLiveGame, listLiveGameMoves
//   • joinLiveGame, leaveLiveGame, listLiveGamePlayers
//   • setGameStatus, setGameCurrentPlayer, setGameState
//   • recordGameMove, markPlayerLastMove, setPlayerBotMode, kickPlayerFromGame
//   • endLiveGame, addToGamePot

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLES   = "/* 🎮 LIVE_GAMES_TABLES_V1 */";
const MARK_HELPERS  = "// 🎮 LIVE_GAMES_HELPERS_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

// ──────────────────────────────────────────────────────────────────
// 1) Tabellen anlegen — direkt in die ensureSchema-IIFE einhängen
// ──────────────────────────────────────────────────────────────────
if (!src.includes(MARK_TABLES)) {
  const ANCHOR = `addColumnIfMissing(d, "users", "bg_music_url", "TEXT DEFAULT ''");`;
  if (src.includes(ANCHOR)) {
    const INJECT = `${ANCHOR}

    ${MARK_TABLES}
    d.exec(\`
      CREATE TABLE IF NOT EXISTS live_games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream_id INTEGER NOT NULL,
        kind TEXT NOT NULL,
        state_json TEXT NOT NULL DEFAULT '{}',
        current_player_id INTEGER,
        status TEXT NOT NULL DEFAULT 'lobby',
        pot_vibes INTEGER NOT NULL DEFAULT 0,
        winner_id INTEGER,
        started_at INTEGER,
        ended_at INTEGER,
        created_at INTEGER NOT NULL,
        created_by INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_live_games_stream ON live_games(stream_id, status);
      CREATE INDEX IF NOT EXISTS idx_live_games_active ON live_games(status, started_at);
    \`);
    d.exec(\`
      CREATE TABLE IF NOT EXISTS live_game_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        slot INTEGER NOT NULL,
        is_bot INTEGER NOT NULL DEFAULT 0,
        is_spectator INTEGER NOT NULL DEFAULT 0,
        bot_takeover_at INTEGER,
        last_move_at INTEGER,
        kicked_at INTEGER,
        joined_at INTEGER NOT NULL,
        UNIQUE(game_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_lgp_game ON live_game_players(game_id, kicked_at);
    \`);
    d.exec(\`
      CREATE TABLE IF NOT EXISTS live_game_moves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        move_json TEXT NOT NULL,
        was_bot INTEGER NOT NULL DEFAULT 0,
        at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_lgm_game ON live_game_moves(game_id, id);
    \`);`;
    src = src.replace(ANCHOR, INJECT);
    changed = true;
    console.log("✓ live_games + live_game_players + live_game_moves Tabellen ergänzt.");
  } else {
    console.warn("⚠ Anker bg_music_url nicht gefunden — Tabellen-Patch übersprungen.");
  }
} else {
  console.log("✓ Tabellen-Marker bereits drin — skip.");
}

// ──────────────────────────────────────────────────────────────────
// 2) Helper-Funktionen ans Ende von db.js anhängen
// ──────────────────────────────────────────────────────────────────
if (!src.includes(MARK_HELPERS)) {
  const FN = `

${MARK_HELPERS}
// 🎮 Game-Foundation — alle Helper für live_games / live_game_players / live_game_moves
//
// State-Convention: state_json ist game-spezifisch (UNO-Deck, Würfel-Werte, etc.)
// Engine + Spielregeln liegen in lib/games/* — diese Helper sind reine Persistenz.

// Pro Live-Stream gibts immer nur EIN aktives Spiel gleichzeitig (lobby oder playing).
// Wenn Owner ein neues startet während eins läuft → altes wird auto-beendet.
export function createLiveGame({ streamId, kind, initialState = {}, createdBy }) {
  const now = Date.now();
  // ggf. altes aktives Spiel beenden
  try {
    db().prepare(\`
      UPDATE live_games SET status = 'aborted', ended_at = ?
       WHERE stream_id = ? AND status IN ('lobby', 'playing')
    \`).run(now, streamId);
  } catch {}
  const info = db().prepare(\`
    INSERT INTO live_games (stream_id, kind, state_json, status, created_at, created_by)
    VALUES (?, ?, ?, 'lobby', ?, ?)
  \`).run(streamId, kind, JSON.stringify(initialState || {}), now, createdBy);
  return Number(info.lastInsertRowid);
}

export function getActiveLiveGame(streamId) {
  const row = db().prepare(\`
    SELECT id, stream_id AS streamId, kind, state_json AS stateJson,
           current_player_id AS currentPlayerId, status,
           pot_vibes AS potVibes, winner_id AS winnerId,
           started_at AS startedAt, ended_at AS endedAt,
           created_at AS createdAt, created_by AS createdBy
      FROM live_games
     WHERE stream_id = ? AND status IN ('lobby', 'playing')
     ORDER BY id DESC LIMIT 1
  \`).get(streamId);
  if (!row) return null;
  let state = {};
  try { state = JSON.parse(row.stateJson || "{}"); } catch {}
  return { ...row, state, players: listLiveGamePlayers(row.id) };
}

export function getLiveGame(gameId) {
  const row = db().prepare(\`
    SELECT id, stream_id AS streamId, kind, state_json AS stateJson,
           current_player_id AS currentPlayerId, status,
           pot_vibes AS potVibes, winner_id AS winnerId,
           started_at AS startedAt, ended_at AS endedAt,
           created_at AS createdAt, created_by AS createdBy
      FROM live_games WHERE id = ?
  \`).get(gameId);
  if (!row) return null;
  let state = {};
  try { state = JSON.parse(row.stateJson || "{}"); } catch {}
  return { ...row, state, players: listLiveGamePlayers(row.id) };
}

export function listLiveGamePlayers(gameId) {
  return db().prepare(\`
    SELECT lgp.id, lgp.user_id AS userId, lgp.slot, lgp.is_bot AS isBot,
           lgp.is_spectator AS isSpectator, lgp.bot_takeover_at AS botTakeoverAt,
           lgp.last_move_at AS lastMoveAt, lgp.kicked_at AS kickedAt, lgp.joined_at AS joinedAt,
           u.username, u.display_name AS displayName,
           u.avatar_url AS avatarUrl, u.avatar_status AS avatarStatus,
           u.gender, u.birthdate
      FROM live_game_players lgp JOIN users u ON u.id = lgp.user_id
     WHERE lgp.game_id = ?
     ORDER BY lgp.slot ASC
  \`).all(gameId).map((p) => ({
    ...p,
    avatarUrl: p.avatarStatus === "approved" ? (p.avatarUrl || "") : "",
    gender: p.gender === "m" || p.gender === "w" ? p.gender : "",
    age: ageFromBirthdate(p.birthdate),
  }));
}

// Spieler tritt bei (oder als Spectator) — vergibt nächsten freien Slot.
// Liefert { ok, slot, error? }.
export function joinLiveGame({ gameId, userId, asSpectator = false }) {
  const existing = db().prepare("SELECT slot, is_spectator, kicked_at FROM live_game_players WHERE game_id = ? AND user_id = ?").get(gameId, userId);
  if (existing) {
    if (existing.kicked_at) return { ok: false, error: "kicked" };
    return { ok: true, slot: existing.slot, already: true };
  }
  const max = db().prepare("SELECT COALESCE(MAX(slot), -1) AS m FROM live_game_players WHERE game_id = ?").get(gameId);
  const nextSlot = (max?.m ?? -1) + 1;
  try {
    db().prepare(\`
      INSERT INTO live_game_players (game_id, user_id, slot, is_spectator, joined_at)
      VALUES (?, ?, ?, ?, ?)
    \`).run(gameId, userId, nextSlot, asSpectator ? 1 : 0, Date.now());
    return { ok: true, slot: nextSlot };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export function leaveLiveGame({ gameId, userId }) {
  db().prepare("DELETE FROM live_game_players WHERE game_id = ? AND user_id = ?").run(gameId, userId);
}

export function setGameStatus(gameId, status) {
  if (!["lobby", "playing", "ended", "aborted"].includes(status)) return false;
  const now = Date.now();
  if (status === "playing") {
    db().prepare("UPDATE live_games SET status = ?, started_at = COALESCE(started_at, ?) WHERE id = ?").run(status, now, gameId);
  } else if (status === "ended" || status === "aborted") {
    db().prepare("UPDATE live_games SET status = ?, ended_at = ? WHERE id = ?").run(status, now, gameId);
  } else {
    db().prepare("UPDATE live_games SET status = ? WHERE id = ?").run(status, gameId);
  }
  return true;
}

export function setGameCurrentPlayer(gameId, userId) {
  db().prepare("UPDATE live_games SET current_player_id = ? WHERE id = ?").run(userId || null, gameId);
}

export function setGameState(gameId, state) {
  db().prepare("UPDATE live_games SET state_json = ? WHERE id = ?").run(JSON.stringify(state || {}), gameId);
}

export function recordGameMove(gameId, userId, move, { wasBot = false } = {}) {
  db().prepare(\`
    INSERT INTO live_game_moves (game_id, user_id, move_json, was_bot, at)
    VALUES (?, ?, ?, ?, ?)
  \`).run(gameId, userId, JSON.stringify(move || {}), wasBot ? 1 : 0, Date.now());
}

export function listLiveGameMoves(gameId, { limit = 200 } = {}) {
  return db().prepare(\`
    SELECT id, user_id AS userId, move_json AS moveJson, was_bot AS wasBot, at
      FROM live_game_moves WHERE game_id = ? ORDER BY id DESC LIMIT ?
  \`).all(gameId, limit).map((m) => {
    let move = {};
    try { move = JSON.parse(m.moveJson || "{}"); } catch {}
    return { id: m.id, userId: m.userId, move, wasBot: !!m.wasBot, at: m.at };
  });
}

// Bot-Driver markiert sich beim Übernehmen
export function setPlayerBotMode(gameId, userId, isBot) {
  const now = Date.now();
  if (isBot) {
    db().prepare("UPDATE live_game_players SET is_bot = 1, bot_takeover_at = ? WHERE game_id = ? AND user_id = ?")
      .run(now, gameId, userId);
  } else {
    db().prepare("UPDATE live_game_players SET is_bot = 0, bot_takeover_at = NULL WHERE game_id = ? AND user_id = ?")
      .run(gameId, userId);
  }
}

// Aktivitäts-Stempel — verhindert dass Bot übernimmt
export function markPlayerLastMove(gameId, userId) {
  db().prepare("UPDATE live_game_players SET last_move_at = ? WHERE game_id = ? AND user_id = ?")
    .run(Date.now(), gameId, userId);
}

export function kickPlayerFromGame(gameId, userId) {
  db().prepare("UPDATE live_game_players SET kicked_at = ? WHERE game_id = ? AND user_id = ?")
    .run(Date.now(), gameId, userId);
}

export function addToGamePot(gameId, amount) {
  if (amount <= 0) return;
  db().prepare("UPDATE live_games SET pot_vibes = pot_vibes + ? WHERE id = ?").run(amount, gameId);
}

// Spiel beenden + Pot ausschütten (50% Winner, 30% Spieler split, 20% Owner).
// Sink-Anteil wäre möglich — hier 0% damit Hosts-Belohnung erhalten bleibt.
export function endLiveGame({ gameId, winnerId, finalState }) {
  const tx = db().transaction(() => {
    const g = db().prepare("SELECT pot_vibes, stream_id, created_by FROM live_games WHERE id = ?").get(gameId);
    if (!g) return { ok: false, error: "game not found" };
    db().prepare(\`
      UPDATE live_games SET status = 'ended', winner_id = ?, ended_at = ?, state_json = ?
       WHERE id = ?
    \`).run(winnerId || null, Date.now(), JSON.stringify(finalState || {}), gameId);
    const pot = g.pot_vibes || 0;
    if (pot > 0) {
      const players = db().prepare(\`
        SELECT user_id FROM live_game_players
         WHERE game_id = ? AND kicked_at IS NULL AND is_spectator = 0
      \`).all(gameId).map((r) => r.user_id);
      const ownerShare    = Math.floor(pot * 0.20);
      const winnerShare   = Math.floor(pot * 0.50);
      const splitTotal    = pot - ownerShare - winnerShare;
      const splitPerPlayer = players.length > 0 ? Math.floor(splitTotal / players.length) : 0;
      if (winnerId && winnerShare > 0) {
        adminGrantCredits(winnerId, winnerShare, \`live_game_winner:\${gameId}\`);
      }
      if (g.created_by && ownerShare > 0) {
        adminGrantCredits(g.created_by, ownerShare, \`live_game_host_share:\${gameId}\`);
      }
      if (splitPerPlayer > 0) {
        for (const uid of players) {
          if (uid !== winnerId) adminGrantCredits(uid, splitPerPlayer, \`live_game_player_share:\${gameId}\`);
        }
      }
    }
    return { ok: true, pot, winnerId };
  });
  try { return tx(); } catch (e) { return { ok: false, error: e.message }; }
}
`;
  src += FN;
  changed = true;
  console.log("✓ Game-Foundation-Helpers ergänzt.");
} else {
  console.log("✓ Helper-Marker bereits drin — skip.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("✓ lib/db.js geschrieben.");
} else {
  console.log("ℹ Keine Änderungen.");
}
