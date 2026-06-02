import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listRecentPoiUses } from "@/lib/db";
import { POI_TYPES, POI_KINDS, POI_USE_RADIUS_M, poiNearby, haversineM } from "@/lib/poi";

// GET ?lat&lng&radius — POIs in deiner Nähe + Cooldown-Status
export async function GET(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lng = parseFloat(url.searchParams.get("lng") || "");
  const radius = Math.min(1500, Math.max(100, parseInt(url.searchParams.get("radius") || "500", 10)));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng erforderlich" }, { status: 400 });
  }

  // Letzte Nutzungen pro Kategorie laden (für Cooldown-Anzeige)
  const maxCooldownH = Math.max(...POI_KINDS.map((k) => POI_TYPES[k].cooldownH));
  const sinceMs = Date.now() - maxCooldownH * 3600_000;
  const recent = listRecentPoiUses(me.id, sinceMs);
  const lastByKind = {};
  for (const r of recent) {
    if (!lastByKind[r.kind] || r.usedAt > lastByKind[r.kind]) lastByKind[r.kind] = r.usedAt;
  }

  const pois = await poiNearby(lat, lng, radius);
  const now = Date.now();
  const enriched = pois.map((p) => {
    const t = POI_TYPES[p.kind];
    const dist = Math.round(haversineM(lat, lng, p.lat, p.lng));
    const lastAt = lastByKind[p.kind] || 0;
    const cooldownMs = t.cooldownH * 3600_000;
    const nextAt = lastAt + cooldownMs;
    const cooldownLeftMs = Math.max(0, nextAt - now);
    return {
      ...p,
      emoji: t.emoji,
      label: t.label,
      desc: t.desc,
      color: t.color,
      cooldownH: t.cooldownH,
      cooldownLeftMs,
      distanceM: dist,
      inRange: dist <= POI_USE_RADIUS_M,
      effect: t.effect,
    };
  }).sort((a, b) => a.distanceM - b.distanceM);

  // Typ-Übersicht (auch wenn nichts gefunden) — für UI-Onboarding
  const kinds = POI_KINDS.map((k) => ({
    kind: k,
    ...POI_TYPES[k],
    lastUsedAt: lastByKind[k] || 0,
  }));

  return NextResponse.json({
    pois: enriched,
    kinds,
    useRadiusM: POI_USE_RADIUS_M,
    radiusM: radius,
  });
}
