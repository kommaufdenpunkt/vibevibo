// GET → { streams: [...mit games], specs: [...alle verfügbaren Spiele] }
//
// Zeigt allen Spiele-Lobby-Nutzern was grad los ist:
//   - Welche Multi-Couch-Streams laufen (mit Spiel oder ohne)
//   - Welche Spiele insgesamt verfügbar sind

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listLiveStreams, getActiveLiveGame } from "@/lib/db";
import { listGameSpecs } from "@/lib/games/registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const all = listLiveStreams(60);
  // Nur Multi-Couch — Solo-Streams haben keine Spiele
  const multi = all.filter((s) => s.mode === "multi");

  const streams = multi.map((s) => {
    let game = null;
    try {
      const g = getActiveLiveGame(s.id);
      if (g) {
        game = {
          id: g.id,
          kind: g.kind,
          status: g.status,
          playerCount: (g.players || []).filter((p) => !p.isSpectator && !p.kickedAt).length,
          potVibes: g.potVibes || 0,
        };
      }
    } catch {}
    return { ...s, game };
  });

  // Sortierung: mit aktiven Spielen zuerst, dann mit Lobby, dann ohne
  streams.sort((a, b) => {
    const score = (s) => {
      if (s.game?.status === "playing") return 3;
      if (s.game?.status === "lobby") return 2;
      return 1;
    };
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return (b.viewerCount || 0) - (a.viewerCount || 0);
  });

  return NextResponse.json({
    streams,
    specs: listGameSpecs(),
  });
}
