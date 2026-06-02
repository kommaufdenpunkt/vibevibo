import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { loadVibo, tickAndPersistVibo, hatchVibo, getViboCooldowns, checkAndAwardAchievements } from "@/lib/db";
import {
  getStage, stageInfo, moodFromStats, ageDaysFrom, eggProgress,
  EGG_HATCH_HOURS, EGG_HATCH_DISTANCE_M,
  traitInfo, viboThought, SICKNESSES, ACHIEVEMENTS,
} from "@/lib/vibo";

function shape(v, { cooldowns = null, achievements = null, newAchievements = [] } = {}) {
  if (!v) return null;
  const ageDays = ageDaysFrom(v.hatched_at);
  const walked = v.distance_walked_m || 0;
  const stage = v.died_at ? "dead" : getStage(ageDays, walked);
  const h = new Date().getUTCHours();
  const sleeping = !v.died_at && (h >= 20 || h < 5);
  const egg = stage === "egg" ? eggProgress(ageDays, walked) : null;
  const t = traitInfo(v.trait);
  const sickInfo = v.sick && SICKNESSES[v.sick] ? { id: v.sick, ...SICKNESSES[v.sick] } : null;
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
    cured: !!v._cured,
    distanceWalkedM: walked,
    cooldowns: cooldowns || {},
    // Paket „Lebendiges VIBO"
    trait: { id: t.id, name: t.name, emoji: t.emoji, desc: t.desc },
    thought: stage === "egg" ? "" : viboThought(v, { sleeping }),
    sick: sickInfo,
    achievements: achievements || null,
    newAchievements: newAchievements || [],
    egg: egg ? {
      timePct: Math.round(egg.time * 100),
      distancePct: Math.round(egg.distance * 100),
      hoursLeft: Math.max(0, EGG_HATCH_HOURS - ageDays * 24),
      metersLeft: Math.max(0, EGG_HATCH_DISTANCE_M - walked),
      hatchHours: EGG_HATCH_HOURS,
      hatchDistanceM: EGG_HATCH_DISTANCE_M,
    } : null,
  };
}

// Komplette Achievement-Liste mit unlocked-Flag fürs UI
function buildAchievementList(unlockedIds) {
  const set = new Set(unlockedIds || []);
  return ACHIEVEMENTS.map((a) => ({
    id: a.id, emoji: a.emoji, name: a.name, desc: a.desc, reward: a.reward,
    unlocked: set.has(a.id),
  }));
}

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const v = tickAndPersistVibo(me.id) || loadVibo(me.id);
  let achList = null, newly = [];
  if (v && !v.died_at) {
    const res = checkAndAwardAchievements(me.id, v);
    achList = buildAchievementList(res.unlocked);
    newly = res.newly;
  }
  return NextResponse.json({
    vibo: shape(v, { cooldowns: getViboCooldowns(me.id), achievements: achList, newAchievements: newly }),
  });
}

// POST { name, species } – schlüpfen lassen
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const v = hatchVibo(me.id, body?.name, body?.species);
    const res = checkAndAwardAchievements(me.id, v);
    return NextResponse.json({ vibo: shape(v, { achievements: buildAchievementList(res.unlocked), newAchievements: res.newly }) });
  } catch (e) {
    return NextResponse.json({ error: e.message || "fehler" }, { status: 400 });
  }
}
