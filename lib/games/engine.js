// 🎮 Game-Engine — generischer Turn-Loop + Bot-Driver + Inaktivitäts-Wächter.
//
// Verantwortlich für:
//   • Validate + Apply Move (delegiert an Game-Spec)
//   • Turn-Wechsel zum nächsten aktiven Spieler
//   • Bot-Übernahme nach 60s ohne Aktion
//   • Kick nach 3 Bot-Zügen in Folge oder 5 Min Bot
//   • Game-Over-Erkennung + endLiveGame() mit Vibes-Auszahlung
//   • SSE-Publish bei jeder Änderung
//
// KEIN Spielwissen — alle Spielregeln liegen im Game-Spec.

import {
  getLiveGame, setGameState, setGameCurrentPlayer, setGameStatus,
  recordGameMove, markPlayerLastMove, setPlayerBotMode, kickPlayerFromGame,
  endLiveGame as dbEndLiveGame,
  publishLive,
} from "@/lib/db";
import { getGameSpec, listGameSpecs } from "./registry";
import { INACTIVITY } from "./interface";

export { getGameSpec, listGameSpecs };

// ────────────────────────────────────────────────────────────────────────
// Spieler-Hilfen
// ────────────────────────────────────────────────────────────────────────

function activePlayers(game) {
  return (game.players || []).filter((p) => !p.kickedAt && !p.isSpectator);
}

function nextActivePlayerId(game, currentId) {
  const list = activePlayers(game);
  if (list.length === 0) return null;
  const idx = list.findIndex((p) => p.userId === currentId);
  if (idx < 0) return list[0].userId;
  return list[(idx + 1) % list.length].userId;
}

export function isPlayerTurn(game, userId) {
  return game?.currentPlayerId === userId;
}

export function isPlayerInGame(game, userId) {
  return (game?.players || []).some((p) => p.userId === userId && !p.kickedAt);
}

// ────────────────────────────────────────────────────────────────────────
// Move-Verarbeitung
// ────────────────────────────────────────────────────────────────────────

/**
 * Versucht einen Zug. byUserId muss currentPlayer sein (oder Bot-Driver).
 * Liefert { ok, error?, events? }.
 */
export function applyMove(gameId, byUserId, move, { wasBot = false } = {}) {
  const game = getLiveGame(gameId);
  if (!game) return { ok: false, error: "Spiel nicht gefunden" };
  if (game.status !== "playing") return { ok: false, error: "Spiel läuft nicht" };
  const spec = getGameSpec(game.kind);
  if (!spec) return { ok: false, error: `Unbekanntes Spiel: ${game.kind}` };

  if (game.currentPlayerId !== byUserId) {
    return { ok: false, error: "Du bist nicht dran" };
  }

  const players = activePlayers(game);
  const validation = spec.validateMove(game.state, players, game.currentPlayerId, move, byUserId);
  if (!validation.ok) return { ok: false, error: validation.error || "Zug ungültig" };

  const normalized = validation.normalized || move;

  let result;
  try {
    result = spec.applyMove(game.state, players, game.currentPlayerId, normalized);
  } catch (e) {
    return { ok: false, error: `Spiel-Engine-Fehler: ${e.message}` };
  }

  // Persistenz
  setGameState(gameId, result.state);
  recordGameMove(gameId, byUserId, normalized, { wasBot });
  markPlayerLastMove(gameId, byUserId);
  if (!wasBot) setPlayerBotMode(gameId, byUserId, false);

  // Turn weitergeben (außer Spec hat next-id explizit gesetzt)
  let nextId;
  if ("nextPlayerId" in result && result.nextPlayerId != null) {
    nextId = result.nextPlayerId;
  } else {
    nextId = nextActivePlayerId(game, game.currentPlayerId);
  }
  setGameCurrentPlayer(gameId, nextId);

  // SSE-Event publizieren
  try {
    publishLive(game.streamId, "game-move", {
      gameId, byUserId, wasBot,
      move: normalized,
      nextPlayerId: nextId,
      events: result.events || [],
    });
  } catch {}

  // Game-Over?
  if (result.gameOver || result.winnerId != null) {
    const winnerId = result.winnerId || null;
    finishGame(gameId, winnerId, result.state);
  }

  return { ok: true, events: result.events || [], nextPlayerId: nextId };
}

function finishGame(gameId, winnerId, finalState) {
  const r = dbEndLiveGame({ gameId, winnerId, finalState });
  const game = getLiveGame(gameId);
  try {
    publishLive(game.streamId, "game-end", {
      gameId, winnerId, finalState,
      pot: r?.pot || 0,
    });
  } catch {}
}

// ────────────────────────────────────────────────────────────────────────
// Bot-Driver — wird vom Timer-Tick getriggert
// ────────────────────────────────────────────────────────────────────────

/**
 * Prüft pro Game ob der aktuelle Spieler inaktiv ist.
 * Stufe 1 (>=30s): nur warning, kein Action
 * Stufe 2 (>=60s): Bot übernimmt einen Zug
 * Stufe 3 (>=5min Bot ODER 3 Bot-Züge): kick + Turn weiter
 *
 * Idempotent — kann beliebig oft aufgerufen werden.
 */
export function tickBotDriver(gameId) {
  const game = getLiveGame(gameId);
  if (!game || game.status !== "playing") return { ok: false };
  const spec = getGameSpec(game.kind);
  if (!spec) return { ok: false };
  if (!game.currentPlayerId) return { ok: false };

  const player = (game.players || []).find((p) => p.userId === game.currentPlayerId);
  if (!player || player.kickedAt) return { ok: false };

  const now = Date.now();
  const lastMove = player.lastMoveAt || player.joinedAt || 0;
  const idleMs = now - lastMove;

  // Noch nicht idle genug
  if (idleMs < INACTIVITY.BOT_TAKEOVER_AFTER_MS) return { ok: false, idleMs };

  // Kick-Bedingung prüfen
  if (player.botTakeoverAt) {
    const botRunMs = now - player.botTakeoverAt;
    if (botRunMs > INACTIVITY.MAX_BOT_TIME_MS) {
      kickPlayerFromGame(gameId, player.userId);
      setGameCurrentPlayer(gameId, nextActivePlayerId(game, player.userId));
      try {
        publishLive(game.streamId, "game-player-kick", { gameId, userId: player.userId, reason: "bot_timeout" });
      } catch {}
      checkGameOverAfterKick(gameId);
      return { ok: true, kicked: true };
    }
  }

  // Bot-Modus markieren falls noch nicht
  if (!player.isBot) setPlayerBotMode(gameId, player.userId, true);

  // Bot-Move ausführen
  try {
    const players = activePlayers(game);
    const move = spec.botMove(game.state, players, player.userId);
    if (!move) {
      // Bot weiß nicht weiter → kick
      kickPlayerFromGame(gameId, player.userId);
      setGameCurrentPlayer(gameId, nextActivePlayerId(game, player.userId));
      checkGameOverAfterKick(gameId);
      return { ok: true, kicked: true };
    }
    applyMove(gameId, player.userId, move, { wasBot: true });
    return { ok: true, bot: true };
  } catch {
    return { ok: false, error: "bot crashed" };
  }
}

function checkGameOverAfterKick(gameId) {
  const game = getLiveGame(gameId);
  if (!game) return;
  const remaining = activePlayers(game);
  if (remaining.length <= 1) {
    finishGame(gameId, remaining[0]?.userId || null, game.state);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Lobby-Helfer für Spiel-Start
// ────────────────────────────────────────────────────────────────────────

/**
 * Startet ein Spiel aus der Lobby-Phase.
 * Prüft min/max Spieler, würfelt Reihenfolge, setzt Status auf "playing".
 */
export function startGameRound(gameId) {
  const game = getLiveGame(gameId);
  if (!game) return { ok: false, error: "not found" };
  if (game.status !== "lobby") return { ok: false, error: "nicht in Lobby" };
  const spec = getGameSpec(game.kind);
  if (!spec) return { ok: false, error: "unbekanntes Spiel" };

  const players = (game.players || []).filter((p) => !p.isSpectator);
  if (players.length < spec.minPlayers) {
    return { ok: false, error: `Mindestens ${spec.minPlayers} Spieler nötig` };
  }
  if (players.length > spec.maxPlayers) {
    return { ok: false, error: `Maximal ${spec.maxPlayers} Spieler` };
  }

  const initialState = spec.initialState() || {};
  const order = spec.initialOrder
    ? spec.initialOrder(players.map((p) => p.userId))
    : players.map((p) => p.userId);

  setGameState(gameId, initialState);
  setGameCurrentPlayer(gameId, order[0]);
  setGameStatus(gameId, "playing");

  try {
    publishLive(game.streamId, "game-start", {
      gameId,
      kind: game.kind,
      currentPlayerId: order[0],
      order,
    });
  } catch {}

  return { ok: true, firstPlayerId: order[0] };
}
