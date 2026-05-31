import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  listWorldItemsBox, insertWorldItems, countActiveItemsNear, updateUserLocation,
} from "@/lib/db";
import { generateSpawns, SPAWN_TARGET_DENSITY } from "@/lib/world";

// GET ?lat=..&lng=..&acc=..  liefert aktive Items im 500m Umkreis.
// Triggert ggf. Item-Spawn wenn Dichte zu niedrig.
export async function GET(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const acc = Number(searchParams.get("acc")) || 0;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ items: [] });
  }
  // Standort mitschreiben
  updateUserLocation(me.id, lat, lng, acc);

  // ~500m: 1° lat ≈ 111km; 500m ≈ 0.0045°. Bbox-Suche.
  const dLat = 0.005;
  const dLng = 0.005 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  let items = listWorldItemsBox(lat - dLat, lat + dLat, lng - dLng, lng + dLng);

  // Spawn-Logik: wenn unter Dichte, neue Items spawnen
  const count = items.length;
  if (count < SPAWN_TARGET_DENSITY) {
    const need = SPAWN_TARGET_DENSITY - count + 2;
    const newOnes = generateSpawns(lat, lng, need);
    insertWorldItems(newOnes);
    items = listWorldItemsBox(lat - dLat, lat + dLat, lng - dLng, lng + dLng);
  }

  return NextResponse.json({ items });
}
