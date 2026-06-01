import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserByUsername, loadVibo, tickAndPersistVibo } from "@/lib/db";
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
  };
}

export async function GET(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { username } = await params;
  const target = getUserByUsername(username);
  if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });
  const v = tickAndPersistVibo(target.id) || loadVibo(target.id);
  return NextResponse.json({ vibo: shape(v), owner: { username: target.username, displayName: target.displayName } });
}
