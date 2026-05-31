import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { loadVibo, tickAndPersistVibo, hatchVibo } from "@/lib/db";
import { getStage, stageInfo, moodFromStats, ageDaysFrom } from "@/lib/vibo";

function shape(v) {
  if (!v) return null;
  const ageDays = ageDaysFrom(v.hatched_at);
  const stage = v.died_at ? "dead" : getStage(ageDays);
  // Schlaf-Modus: 20–5 UTC (≈22–6 Berlin)
  const h = new Date().getUTCHours();
  const sleeping = !v.died_at && (h >= 20 || h < 5);
  return {
    name: v.name, species: v.species, stage, stageInfo: stageInfo(stage),
    ageDays: Math.round(ageDays * 10) / 10,
    hunger: v.hunger, fun: v.fun, hygiene: v.hygiene, affection: v.affection, health: v.health,
    mood: moodFromStats(v),
    hatchedAt: v.hatched_at,
    diedAt: v.died_at || null,
    deathReason: v.death_reason || "",
    sleeping,
    birthdayJustHappened: !!v._birthdayJustHappened,
  };
}

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const v = tickAndPersistVibo(me.id) || loadVibo(me.id);
  return NextResponse.json({ vibo: shape(v) });
}

// POST { name, species } – schlüpfen lassen
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const v = hatchVibo(me.id, body?.name, body?.species);
    return NextResponse.json({ vibo: shape(v) });
  } catch (e) {
    return NextResponse.json({ error: e.message || "fehler" }, { status: 400 });
  }
}
