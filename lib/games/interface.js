// 🎮 Game-Interface — der Vertrag den jedes Spiel implementiert.
//
// Jedes Spiel (Würfel-Duell, UNO, Mensch ärgere dich, …) ist ein Modul unter
// lib/games/<kind>.js und exportiert ein Spec-Objekt nach diesem Schema:
//
// {
//   kind:            "wuerfel"                            // unique slug
//   label:           "Würfel-Duell"                       // UI-Anzeige
//   emoji:           "🎲"
//   minPlayers:      2
//   maxPlayers:      16
//   description:     "Höchste Summe nach 3 Würfen gewinnt"
//   defaultPot:      0                                    // 0 = kein Mindesteinsatz
//
//   initialState():
//     → Game-Spezifischer Start-State (object, wird serialisiert in state_json)
//     Beispiel Würfel: { rounds: [], maxRounds: 3 }
//
//   initialOrder(playerUserIds):
//     → Reihenfolge der Spieler-Züge (array of userIds, idx 0 startet)
//     Default: wie eingetreten
//
//   validateMove(state, players, currentPlayerId, move, byUserId):
//     → { ok: bool, error?: string, normalized?: move }
//     Wirft NICHT — Fehler werden geliefert.
//     Anti-Cheat: prüfe dass byUserId = currentPlayerId, move legal ist.
//
//   applyMove(state, players, currentPlayerId, move):
//     → { state: newState, nextPlayerId, winnerId?, gameOver?: bool, events?: [] }
//     events sind UI-Hinweise (z.B. "Würfel zeigt 6", "+10 Punkte")
//
//   botMove(state, players, botPlayerId):
//     → ein gültiger move-object — was würde der Bot tun?
//     Strategie ist Spielspezifisch (zufällig, simpel, smart — egal).
//
//   isGameOver(state, players):
//     → { over: bool, winnerId?: number, reason?: string }
//
//   summary(state, players, winnerId):
//     → { headline, lines: string[] }  — Endbildschirm-Text
// }
//
// Die Engine (lib/games/engine.js) ruft diese Methoden auf, kümmert sich um
// Timer, Inaktivitäts-Stufen, DB-Persistenz, SSE-Updates.

export const GAME_KINDS = {
  // Wird zur Laufzeit befüllt — siehe lib/games/registry.js
};

// Inaktivitäts-Stufen (gilt für alle Spiele)
export const INACTIVITY = {
  WARN_AFTER_MS:        30_000,   // 30s ohne Zug → grau + Counter
  BOT_TAKEOVER_AFTER_MS: 60_000,  // 60s ohne Zug → Bot übernimmt
  MAX_BOT_MOVES:        3,        // nach 3 Bot-Zügen in Folge → kick
  MAX_BOT_TIME_MS:      5 * 60_000, // 5 Min Bot → kick
};

// Vibes-Pot-Verteilung (kann pro Spiel überschrieben werden)
export const POT_DISTRIBUTION = {
  winnerPct: 50,
  playerSplitPct: 30,
  hostPct: 20,
};

// Hilfs-Typ: Move-Objekt-Beispiele
//
// Würfel-Duell: { type: "roll" }                            (kein Param, Server würfelt)
// UNO:          { type: "play", cardId: "uno-r-7" }
//               { type: "draw" }
//               { type: "pass" }
//               { type: "color", color: "blue" }            (Wild-Karte → Farbe wählen)
// Mensch:       { type: "roll" }
//               { type: "move", figureId: 0, fromField: 12, toField: 18 }
//               { type: "pass" }
