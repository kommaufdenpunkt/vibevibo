import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { lastPoiUseByKind, recordPoiUse, applyViboPoiEffect } from "@/lib/db";
import { POI_TYPES, POI_USE_RADIUS_M, poiNearby, haversineM } from "@/lib/poi";

// POST { kind, osmId, lat, lng }  — POI „nutzen", VIBO bekommt den Effekt.
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const kind = String(body?.kind || "");
  const osmId = String(body?.osmId || "");
  const lat = parseFloat(body?.lat);
  const lng = parseFloat(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Position fehlt." }, { status: 400 });
  }
  const t = POI_TYPES[kind];
  if (!t) return NextResponse.json({ error: "Unbekannte POI-Kategorie." }, { status: 400 });

  // Re-Fetch der POIs in der Nähe — verhindert Cheating mit ausgedachten osmIds.
  const pois = await poiNearby(lat, lng, 500);
  const poi = pois.find((p) => p.osmId === osmId && p.kind === kind);
  if (!poi) {
    return NextResponse.json({
      error: `Hier finden wir keine ${t.label} mehr. Karte neu laden?`,
    }, { status: 404 });
  }

  const dist = Math.round(haversineM(lat, lng, poi.lat, poi.lng));
  if (dist > POI_USE_RADIUS_M) {
    return NextResponse.json({
      error: `Du bist ${dist} m entfernt. Geh näher ran (≤ ${POI_USE_RADIUS_M} m).`,
      distanceM: dist,
    }, { status: 403 });
  }

  // Kategorie-Cooldown — kein Park-Hopping zum Farmen.
  const last = lastPoiUseByKind(me.id, kind);
  const cooldownMs = t.cooldownH * 3600_000;
  if (last && Date.now() - last.usedAt < cooldownMs) {
    const left = cooldownMs - (Date.now() - last.usedAt);
    const min = Math.ceil(left / 60_000);
    const hLbl = min >= 60 ? `${Math.ceil(min / 60)} h` : `${min} min`;
    return NextResponse.json({
      error: `${t.label} erst wieder in ${hLbl} verfügbar.`,
      cooldownLeftMs: left,
    }, { status: 429 });
  }

  let result;
  try {
    result = applyViboPoiEffect(me.id, t.effect || {});
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  recordPoiUse(me.id, kind, osmId);

  return NextResponse.json({
    ok: true,
    poi: { kind, name: poi.name, emoji: t.emoji, label: t.label, osmId },
    next: result,
    cured: result.cured,
    cooldownLeftMs: cooldownMs,
    message: result.cured
      ? `${t.emoji} ${t.label}: ${result.cured} geheilt! VIBO fühlt sich besser. ✨`
      : `${t.emoji} ${t.label}: Boost angewendet!`,
  });
}
