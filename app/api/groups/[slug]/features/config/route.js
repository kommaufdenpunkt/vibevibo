import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";
import { findComFeature } from "@/lib/comFeatures";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST { featureKey, payload } — Owner-only, ändert Konfiguration einer freigeschalteten Funktion.
// Erlaubte Payload-Werte werden serverseitig gegen Katalog-Optionen validiert.
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  if (g.owner_id !== me.id) {
    return NextResponse.json({ error: "Nur der Owner kann Funktionen konfigurieren." }, { status: 403 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const featureKey = String(body.featureKey || "").trim();
  const inputPayload = body.payload || {};

  const feat = findComFeature(featureKey);
  if (!feat || !feat.configurable) {
    return NextResponse.json({ error: "Funktion nicht konfigurierbar." }, { status: 400 });
  }
  if (!DB.isComFeatureUnlocked(g.id, featureKey)) {
    return NextResponse.json({ error: "Funktion ist nicht freigeschaltet." }, { status: 400 });
  }

  // Whitelist: Payload-Werte müssen aus Katalog-Optionen stammen
  const safePayload = {};
  const allowed = new Set((feat.options || []).map((o) => o.id));
  if (feat.key === "animated_theme") {
    const theme = String(inputPayload.theme || "");
    if (!allowed.has(theme)) return NextResponse.json({ error: "Ungültiger Theme-Wert." }, { status: 400 });
    safePayload.theme = theme;
  } else if (feat.key === "hero_seasonal") {
    const season = String(inputPayload.season || "");
    if (!allowed.has(season)) return NextResponse.json({ error: "Ungültiger Season-Wert." }, { status: 400 });
    safePayload.season = season;
  } else if (feat.key === "sound_fx") {
    const sound = String(inputPayload.sound || "");
    if (!allowed.has(sound)) return NextResponse.json({ error: "Ungültiger Sound-Wert." }, { status: 400 });
    safePayload.sound = sound;
  } else {
    return NextResponse.json({ error: "Konfiguration für diese Funktion noch nicht freigegeben." }, { status: 400 });
  }

  const row = DB.setComUnlockPayload(g.id, featureKey, safePayload);
  if (typeof DB.logComFeatureEvent === "function") {
    DB.logComFeatureEvent({
      groupId: g.id, authorId: me.id, action: "config", featureKey,
      details: `${feat.label} umgestellt: ${JSON.stringify(safePayload)}`,
    });
  }

  return NextResponse.json({ ok: true, unlock: row });
}
