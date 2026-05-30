import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { applyViboAction } from "@/lib/db";
import { getStage, stageInfo, moodFromStats, ageDaysFrom } from "@/lib/vibo";

function shape(v) {
  if (!v) return null;
  const ageDays = ageDaysFrom(v.hatched_at);
  const stage = v.died_at ? "dead" : getStage(ageDays);
  return {
    name: v.name, species: v.species, stage, stageInfo: stageInfo(stage),
    ageDays: Math.round(ageDays * 10) / 10,
    hunger: v.hunger, fun: v.fun, hygiene: v.hygiene, affection: v.affection, health: v.health,
    mood: moodFromStats(v),
    hatchedAt: v.hatched_at,
    diedAt: v.died_at || null,
    deathReason: v.death_reason || "",
  };
}

// POST { action: "feed"|"play"|"clean"|"pet"|"heal" }
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const v = applyViboAction(me.id, String(body?.action || ""));
    return NextResponse.json({ vibo: shape(v) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
