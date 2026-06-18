import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";
import { detectVoiceGender } from "@/lib/fidolin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST { voiceSample } — Stimm-Verifikation.
// User reicht eine kurze (5-15s) Sprachprobe ein.
// Fidolin schätzt das Geschlecht der Stimme. Wenn es zum claim passt:
// status='verified' + verified_gender=1 + Badge.
// Wenn nicht: status='rejected'. Wenn unsicher: status='pending'.
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (!me.gender || (me.gender !== "m" && me.gender !== "w")) {
    return NextResponse.json({
      error: "Verifizierung nur für Accounts mit gesetztem Geschlecht (m/w).",
    }, { status: 400 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const audioUrl = String(body.voiceSample || "");
  if (!audioUrl.startsWith("data:audio/")) {
    return NextResponse.json({ error: "Ungültiges Audio-Format." }, { status: 400 });
  }
  if (audioUrl.length > 1_200_000) {
    return NextResponse.json({ error: "Sprachprobe zu lang (max ~60 Sek)." }, { status: 413 });
  }

  // Voice-Gender-Detection
  const detection = await detectVoiceGender(audioUrl);
  let newStatus = "pending";
  let verifiedGender = false;
  let voiceScore = 0;
  let message = "";

  if (detection.gender === "unsure" || detection.confidence < 0.6) {
    newStatus = "pending";
    message = "Stimm-Analyse war nicht eindeutig. Versuch's nochmal in ruhiger Umgebung, deutlich sprechend.";
    voiceScore = Math.round(detection.confidence * 100);
  } else if (detection.gender === me.gender) {
    newStatus = "verified";
    verifiedGender = true;
    voiceScore = Math.round(detection.confidence * 100);
    message = "✓ Verifizierung erfolgreich! Du hast jetzt das Verifiziert-Badge.";
  } else {
    newStatus = "rejected";
    voiceScore = Math.round(detection.confidence * 100);
    message = "Die Stimme passt nicht zum angegebenen Geschlecht. Wenn das ein Fehler ist, melde dich beim Support.";
  }

  // Sample loggen
  if (typeof DB.recordVoiceSample === "function") {
    DB.recordVoiceSample({
      userId: me.id,
      detectedGender: detection.gender,
      confidence: detection.confidence,
      sampleKind: "verification",
      reason: detection.reason,
    });
  }

  // Status setzen
  if (typeof DB.setVerificationStatus === "function") {
    DB.setVerificationStatus(me.id, {
      status: newStatus,
      verifiedGender,
      voiceScore,
    });
  }

  return NextResponse.json({
    ok: true, status: newStatus, verifiedGender, voiceScore,
    detectedGender: detection.gender,
    confidence: detection.confidence,
    message,
  });
}
