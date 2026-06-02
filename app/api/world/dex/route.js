import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listCaughtVibos } from "@/lib/db";
import { SPECIES } from "@/lib/vibo";
import { WILD_SPECIES } from "@/lib/world";

// GET /api/world/dex — Wild-VIBO-Sammlung (welche Spezies gefangen)
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const caught = listCaughtVibos(me.id);
  const caughtMap = Object.fromEntries(caught.map((c) => [c.species, c]));
  // Komplette Dex-Liste (alle fangbaren Spezies) mit caught-Info
  const dex = Object.keys(WILD_SPECIES).map((id) => {
    const sp = SPECIES.find((s) => s.id === id) || { id, name: id, emoji: "🐾" };
    const c = caughtMap[id];
    return {
      species: id, name: sp.name, emoji: sp.emoji,
      caught: !!c, count: c?.count || 0,
      firstAt: c?.firstAt || null,
    };
  });
  return NextResponse.json({
    dex,
    total: dex.length,
    caughtCount: dex.filter((d) => d.caught).length,
    totalCatches: caught.reduce((s, c) => s + c.count, 0),
  });
}
