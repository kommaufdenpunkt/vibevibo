import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";
import { findComFeature } from "@/lib/comFeatures";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST { featureKey } — Owner-only, schaltet Funktion gegen Vibes frei.
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { slug } = await params;
  const g = DB.getGroup(slug);
  if (!g) return NextResponse.json({ error: "Com nicht gefunden" }, { status: 404 });
  if (g.owner_id !== me.id) {
    return NextResponse.json({ error: "Nur der Owner kann Funktionen freischalten." }, { status: 403 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const featureKey = String(body.featureKey || "").trim();
  const feat = findComFeature(featureKey);
  if (!feat) return NextResponse.json({ error: "Unbekannte Funktion." }, { status: 400 });
  if (!feat.available) {
    return NextResponse.json({ error: `"${feat.label}" ist noch in Entwicklung — bald verfügbar.` }, { status: 400 });
  }

  // Schon freigeschaltet?
  if (DB.isComFeatureUnlocked(g.id, featureKey)) {
    return NextResponse.json({ error: "Funktion ist bereits aktiv.", alreadyUnlocked: true }, { status: 409 });
  }

  // Member-Gate prüfen
  if (feat.memberGate > 0) {
    const memberCount = DB.getGroupMembers(g.id).length;
    if (memberCount < feat.memberGate) {
      return NextResponse.json({
        error: `${feat.memberGate - memberCount} Mitglieder fehlen (mind. ${feat.memberGate} nötig).`,
        memberCount, memberGate: feat.memberGate,
      }, { status: 400 });
    }
  }

  // Vibes abbuchen
  const cost = Number(feat.costVibes) || 0;
  if (cost > 0) {
    const spend = DB.spendCredits(me.id, cost, `com_unlock:${featureKey}`, { type: "com_unlock", id: g.id });
    if (!spend.ok) {
      return NextResponse.json({
        error: `Nicht genug Vibes — es fehlen ${spend.missing} ✨.`,
        missing: spend.missing, balance: spend.balance,
      }, { status: 402 });
    }
  }

  // Freischalten + Fidolin-Log
  const payload = feat.defaultPayload || {};
  const row = DB.unlockComFeature({
    groupId: g.id, featureKey, userId: me.id, vibesPaid: cost, payload,
  });
  if (typeof DB.logComFeatureEvent === "function") {
    DB.logComFeatureEvent({
      groupId: g.id, authorId: me.id, action: "unlock", featureKey,
      details: `${feat.label} freigeschaltet für ${cost} ✨`,
    });
  }

  let balance = null;
  try { balance = DB.getCredits(me.id)?.balance ?? null; } catch {}

  return NextResponse.json({ ok: true, unlock: row, balance });
}
