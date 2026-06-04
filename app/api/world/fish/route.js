import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { buffVibo, updateUserLocation, tickAndPersistVibo, bumpQuestProgress, addSellable } from "@/lib/db";
import { pickFish, rollSize, catchValue, waterNearby, FISH_COOLDOWN_MS, MAX_FISH_PER_DAY } from "@/lib/fishing";
import { fetchWeather } from "@/lib/weather";

const FISH_STATE = (typeof globalThis.__viboFish === "undefined")
  ? (globalThis.__viboFish = new Map())
  : globalThis.__viboFish;

// POST { lat, lng, accuracy } — am Wasser angeln
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Standort nötig zum Angeln." }, { status: 400 });
  }
  updateUserLocation(me.id, lat, lng, Number(body?.accuracy) || 0);

  const now = Date.now();
  const dayKey = new Date(now).toISOString().slice(0, 10);
  const st = FISH_STATE.get(me.id) || { lastAt: 0, dayKey, count: 0 };
  if (st.dayKey !== dayKey) { st.dayKey = dayKey; st.count = 0; }

  if (now - st.lastAt < FISH_COOLDOWN_MS) {
    const wait = Math.ceil((FISH_COOLDOWN_MS - (now - st.lastAt)) / 1000);
    return NextResponse.json({ error: `Die Fische sind scheu — warte ${wait}s.` }, { status: 429 });
  }
  if (st.count >= MAX_FISH_PER_DAY) {
    return NextResponse.json({ error: "Genug geangelt für heute! 🎣 Komm morgen wieder." }, { status: 429 });
  }

  // Strikter Standort-Check:
  // 1. Wenn der Client das geklickte Gewaesser mitgibt, MUSS der User innerhalb
  //    dessen Radius stehen (Server-seitige Distanz-Rechnung).
  // 2. Wenn nicht (z.B. Reichweiten-Check uebersprungen oder direkter API-Call):
  //    eng begrenzten Umkreis pruefen — Default war 150m, jetzt 60m.
  function distM(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const w = body?.water;
  if (w && Number.isFinite(w.lat) && Number.isFinite(w.lng) && Number.isFinite(w.radiusM)) {
    const d = distM(lat, lng, Number(w.lat), Number(w.lng));
    if (d > Number(w.radiusM) + 5) { // 5m GPS-Toleranz
      return NextResponse.json({
        error: `🌊 Zu weit weg vom Wasser — noch ${Math.ceil(d - w.radiusM)} m bis ${w.name || "zum Gewässer"}.`,
      }, { status: 403 });
    }
  } else {
    // Kein Wasser mitgegeben -> sehr enger Standard-Check
    const water = await waterNearby(lat, lng, 60);
    if (water === false) {
      return NextResponse.json({ error: "🌊 Kein Gewässer in der Nähe. Geh näher an einen See, Fluss oder die Küste!" }, { status: 403 });
    }
  }

  // Wetter + Tageszeit beeinflussen den Fang
  const hour = new Date(now).getHours();
  const isNight = hour >= 21 || hour < 6;
  let weatherKey = null;
  try { const w = await fetchWeather(lat, lng); weatherKey = w?.key || null; } catch {}

  const fish = pickFish({ isNight, weatherKey });
  const sizeCm = rollSize(fish);
  const value = catchValue(fish, sizeCm);
  st.lastAt = now; st.count += 1;
  FISH_STATE.set(me.id, st);

  // Fang als verkaufbares Item speichern (statt direkt Vibes → Anti-Inflation:
  // Vibes gibt's erst beim Verkauf am Basar, gedeckelt).
  const rec = addSellable(me.id, {
    itemId: fish.id, label: fish.name, emoji: fish.emoji,
    category: fish.cat, sizeCm, baseValue: value,
  });

  // Fische füttern das VIBO direkt (kleiner Soforteffekt)
  let viboFed = false;
  if (fish.hunger > 0) {
    const v = tickAndPersistVibo(me.id);
    if (v && !v.died_at) { buffVibo(me.id, { hunger: Math.min(100, v.hunger + fish.hunger) }); viboFed = true; }
  }
  try { bumpQuestProgress(me.id, "world_pickup"); } catch {}

  return NextResponse.json({
    ok: true,
    fish: {
      id: fish.id, name: fish.name, emoji: fish.emoji, cat: fish.cat,
      sizeCm, value, msg: fish.msg,
    },
    newRecord: rec.newRecord,
    viboFed,
    todayCount: st.count,
    overpassDown: water === null,
  });
}
