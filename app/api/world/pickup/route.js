import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getWorldItem, markItemPickedUp, getUserLocation, recordPickup,
  incrementInventory, awardCredits, updateUserLocation, addUserCard, bumpQuestProgress,
} from "@/lib/db";
import {
  distanceMeters, PICKUP_RADIUS_M, PICKUP_COOLDOWN_MS, MAX_PICKUPS_PER_DAY, MAX_SPEED_KMH, ITEMS,
} from "@/lib/world";
import { drawRandomCard, CARDS_MAP } from "@/lib/cards";

// POST { itemId, lat, lng } – Item einsammeln. Server prüft alles selbst.
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const itemId = Number(body?.itemId);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!itemId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Standort + Item nötig" }, { status: 400 });
  }
  // Aktuellen Standort persistieren
  updateUserLocation(me.id, lat, lng, Number(body?.accuracy) || 0);

  // Item laden + Validierung
  const item = getWorldItem(itemId);
  if (!item) return NextResponse.json({ error: "Item nicht gefunden" }, { status: 404 });
  if (item.pickedUpBy) return NextResponse.json({ error: "Schon eingesammelt" }, { status: 410 });
  if (item.expiresAt < Date.now()) return NextResponse.json({ error: "Item abgelaufen" }, { status: 410 });

  // Distanz-Check
  const dist = distanceMeters(lat, lng, item.lat, item.lng);
  if (dist > PICKUP_RADIUS_M) {
    return NextResponse.json({
      error: `Zu weit weg (${Math.round(dist)}m). Komm noch ~${Math.round(dist - PICKUP_RADIUS_M)}m näher.`,
      distance: Math.round(dist),
    }, { status: 403 });
  }

  // Rate-/Speed-Check
  const loc = getUserLocation(me.id);
  const now = Date.now();
  if (loc?.lastPickupAt && now - loc.lastPickupAt < PICKUP_COOLDOWN_MS) {
    const wait = Math.ceil((PICKUP_COOLDOWN_MS - (now - loc.lastPickupAt)) / 1000);
    return NextResponse.json({ error: `Bitte ${wait}s warten.` }, { status: 429 });
  }
  if (loc?.lastPickupLat != null && loc?.lastPickupLng != null) {
    const moved = distanceMeters(loc.lastPickupLat, loc.lastPickupLng, lat, lng);
    const elapsedHrs = Math.max(0.0001, (now - loc.lastPickupAt) / 3600_000);
    const speedKmh = (moved / 1000) / elapsedHrs;
    if (speedKmh > MAX_SPEED_KMH) {
      return NextResponse.json({ error: `Ungewöhnlich schnell unterwegs (${Math.round(speedKmh)} km/h) — Item nicht gezählt.` }, { status: 403 });
    }
  }
  const todayKey = new Date(now).toISOString().slice(0, 10);
  const pickupsToday = (loc?.pickupsDayKey === todayKey) ? (loc.pickupsToday || 0) : 0;
  if (pickupsToday >= MAX_PICKUPS_PER_DAY) {
    return NextResponse.json({ error: "Tageslimit erreicht (80 Items)." }, { status: 429 });
  }

  // Atomares Markieren – verhindert Race Condition
  if (!markItemPickedUp(itemId, me.id)) {
    return NextResponse.json({ error: "Schon weg." }, { status: 410 });
  }

  // Wirkung verteilen
  const def = ITEMS[item.kind] || { name: item.kind, emoji: "?" };
  let viboBoost = 0;
  let cardDrawn = null;
  if (item.kind === "vibe_coin") {
    awardCredits(me.id, 2, "world_pickup", { type: "item", id: item.id });
  } else if (item.kind === "crystal") {
    awardCredits(me.id, 10, "world_pickup_crystal", { type: "item", id: item.id });
  } else if (item.kind === "apple") {
    incrementInventory(me.id, item.kind, 1);
    viboBoost = 10;
  } else if (item.kind === "card") {
    // Zufällige Sammelkarte ziehen
    const c = drawRandomCard();
    addUserCard(me.id, c.id);
    cardDrawn = c;
    incrementInventory(me.id, "card", 1);
  } else {
    incrementInventory(me.id, item.kind, 1);
  }

  const total = recordPickup(me.id, lat, lng);
  try { bumpQuestProgress(me.id, "world_pickup"); } catch {}
  return NextResponse.json({
    ok: true,
    kind: item.kind,
    name: def.name,
    emoji: def.emoji,
    description: def.description || "",
    todayCount: total,
    viboBoost,
    card: cardDrawn,
  });
}
