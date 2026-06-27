// 🚩 Zentrale Melde-API — ALLES landet im kategorisierten mcp_reports-Tool (/mcp/meldungen).
//
// Akzeptiert:
//   { targetType, targetId, category?, reason?, contentSnapshot?, targetOwnerId? }
//   ODER legacy { messageId, reason }
//
// category-Werte (frei, vom ReportButton gesetzt):
//   Notfall: suizid · gewalt · minderjaehrige
//   Normal:  beleidigung · spam · nsfw · drogen · betrug · sonstiges
//
// Jede Meldung wird via createMcpReport protokolliert (DB = Audit). Notfälle
// werden im Mod-Tool automatisch nach oben priorisiert + rot markiert.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createMcpReport, addMessageReport } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Wo darf gemeldet werden (Content-Stellen).
const ALLOWED_TARGETS = new Set([
  "message", "buschfunk_post", "buschfunk_comment", "pinnwand", "guestbook",
  "photo", "photo_comment", "com_thread", "com_post", "profile", "voice", "live", "user",
]);

const CRITICAL = new Set(["suizid", "selbstverletzung", "gewalt", "drohung", "minderjaehrige", "missbrauch"]);

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Bitte einloggen." }, { status: 401 });

  let body = {};
  try { body = await req.json(); } catch {}

  const reason = String(body?.reason || "").slice(0, 300);
  const category = String(body?.category || "sonstiges").toLowerCase().slice(0, 40);
  const contentSnapshot = String(body?.contentSnapshot || "").slice(0, 1000);
  const targetOwnerId = body?.targetOwnerId ? Number(body.targetOwnerId) : null;

  // Ziel ermitteln (legacy messageId ODER generic targetType/targetId).
  let targetType = String(body?.targetType || "");
  let targetId = Number(body?.targetId) || 0;
  if (body?.messageId) {
    targetType = "message";
    targetId = Number(body.messageId) || 0;
    try { addMessageReport(targetId, me.id, reason); } catch {} // Legacy-Kompat (Dashboard-Zähler)
  }

  if (!ALLOWED_TARGETS.has(targetType)) {
    return NextResponse.json({ error: "Ungültiger Melde-Typ." }, { status: 400 });
  }
  if (!targetId) {
    return NextResponse.json({ error: "Ungültiges Ziel." }, { status: 400 });
  }

  try {
    const id = createMcpReport({
      reporterId: me.id,
      targetType,
      targetId,
      targetOwnerId,
      category,
      contentSnapshot,
      reason,
    });
    const critical = CRITICAL.has(category);
    return NextResponse.json({
      ok: true,
      id,
      critical,
      // Bei Notfall: Hilfe-Ressourcen an den Melder zurückgeben (Client zeigt sie an).
      help: critical ? {
        title: "Du bist nicht allein.",
        lines: [
          "Telefonseelsorge (kostenlos, anonym, 24/7): 0800 111 0 111 oder 0800 111 0 222",
          "Auch per Chat: telefonseelsorge.de",
          "Im akuten Notfall: 112",
        ],
      } : null,
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Melden fehlgeschlagen." }, { status: 400 });
  }
}
