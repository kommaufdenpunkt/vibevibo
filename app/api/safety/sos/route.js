// 🆘 SOS-Knopf — User klickt auf Profil "Sorgst du dich um diesen User?"
//   1. Banner mit Hilfe-Resourcen erscheint auf betroffenem User-Profil
//   2. Mod-Alarm sofort
//   3. Audit-Log

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getUserByUsername, addNotification, listModTeam, audit,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Login nötig" }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  const targetUsername = String(body?.targetUsername || "").trim().toLowerCase();
  const concern = String(body?.concern || "").slice(0, 500);
  if (!targetUsername) return NextResponse.json({ error: "Empfänger fehlt" }, { status: 400 });
  const target = getUserByUsername(targetUsername);
  if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });

  // 1) Hilfe-Banner an betroffenen User (anonym — er weiß nicht WER sich gesorgt hat)
  try {
    addNotification({
      userId: target.id, actorId: null,
      type: "safety_sos", targetType: "user", targetId: target.id,
      preview: "💛 Jemand sorgt sich um dich. Hier sind Hilfe-Angebote: Telefonseelsorge 0800-111-0-111 · krisenchat.de",
    });
  } catch {}

  // 2) Mod-Alarm
  try {
    const mods = listModTeam({ limit: 20 });
    const lead = mods.filter((m) => m.role === "admin" || m.role === "teamleitung");
    for (const m of lead) {
      try {
        addNotification({
          userId: m.id, actorId: me.id,
          type: "safety_alert", targetType: "user", targetId: target.id,
          preview: `🆘 SOS: @${me.username} sorgt sich um @${target.username}${concern ? ` — „${concern.slice(0, 80)}"` : ""}`,
        });
      } catch {}
    }
    audit({ userId: target.id, action: "safety.sos_triggered", detail: `by=${me.id},concern=${concern.slice(0, 100)}` });
  } catch {}

  return NextResponse.json({ ok: true });
}
