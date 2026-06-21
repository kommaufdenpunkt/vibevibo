// 🎮 Game-Registry — alle verfügbaren Spielarten an einem Ort.
//
// Neue Spiele werden hier registriert. Engine + UI lesen aus diesem Map.

// Phase 0 — noch keine konkreten Spiele registriert.
// Sprint 2 fügt 'wuerfel' hinzu, Sprint 5 'uno', Sprint 6 'mensch' usw.

const REGISTRY = new Map();

export function registerGame(spec) {
  if (!spec || !spec.kind) throw new Error("Game-Spec braucht kind");
  REGISTRY.set(spec.kind, spec);
}

export function getGameSpec(kind) {
  return REGISTRY.get(String(kind)) || null;
}

export function listGameSpecs() {
  return Array.from(REGISTRY.values()).map((s) => ({
    kind: s.kind,
    label: s.label,
    emoji: s.emoji,
    minPlayers: s.minPlayers,
    maxPlayers: s.maxPlayers,
    description: s.description,
    defaultPot: s.defaultPot || 0,
  }));
}

// Wenn Sprint 2 läuft → ergänze hier:
//   import { WUERFEL_DUELL } from "./wuerfel";
//   registerGame(WUERFEL_DUELL);
