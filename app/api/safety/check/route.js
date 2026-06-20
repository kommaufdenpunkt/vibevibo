// 🆘 Safety-Check — wird vom Frontend aufgerufen wenn User Text schreibt.
// Erkennt Krisen-Signale + alarmiert Mods bei Hits.
// Liefert dem Frontend Hilfe-Ressourcen zurück.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { detectSafetySignals, getHelpResources } from "@/lib/safetyDetect";
import { addNotification, listModTeam, audit } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth" }, { status: 401 });

  let body = {};
  try { body = await req.json(); } catch {}
  const text = String(body?.text || "").slice(0, 4000);
  if (!text.trim()) return NextResponse.json({ risk: "none" });

  const result = detectSafetySignals(text);

  // Mod-Alarm bei hohem Risk oder Violence/Stalking
  if (result.risk === "high" || result.risk === "violence" || result.risk === "stalking") {
    try {
      const mods = listModTeam({ limit: 20 });
      const lead = mods.filter((m) => m.role === "admin" || m.role === "teamleitung");
      for (const m of lead) {
        try {
          addNotification({
            userId: m.id, actorId: me.id,
            type: "safety_alert", targetType: "user", targetId: me.id,
            preview: `🆘 SAFETY-ALERT: @${me.username} → ${result.risk.toUpperCase()} (${(result.hits.highRisk[0] || result.hits.violence[0] || result.hits.stalking[0] || "Signal")})`,
          });
        } catch {}
      }
      audit({ userId: me.id, action: "safety.signal_detected", detail: `risk=${result.risk}` });
    } catch {}
  }

  return NextResponse.json({
    risk: result.risk,
    suggestion: result.suggestion,
    help: getHelpResources(result.risk),
  });
}
