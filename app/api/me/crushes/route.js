// 💕 Geheime-Schwarm-Slots — meine 3 Crushes + Matches.
//
// GET  → { slots: [...3 max], matches: [...], slotsTotal: 3, slotsUsed: N }
// POST { username } → { ok, matched, partner? }   // fügt Slot hinzu

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getUserByUsername,
  listMyCrushes, listMyMatches, countMyCrushes,
  addSecretCrush, addNotification,
} from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SLOTS = 3;

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const slots = listMyCrushes(me.id);
  const matches = listMyMatches(me.id);
  return NextResponse.json({
    slots,
    matches,
    slotsTotal: MAX_SLOTS,
    slotsUsed: countMyCrushes(me.id),
  });
}

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  let body = {};
  try { body = await req.json(); } catch {}
  const username = String(body?.username || "").trim().toLowerCase();
  if (!username) return NextResponse.json({ error: "username fehlt" }, { status: 400 });

  const target = getUserByUsername(username);
  if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });

  const result = addSecretCrush(me.id, target.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  // 💥 Match — beide Seiten benachrichtigen
  if (result.matched && result.partner) {
    try {
      addNotification({
        userId: me.id, actorId: target.id, type: "crush_match",
        targetType: "user", targetId: target.id,
        preview: \`💥 Es hat gefunkt mit \${result.partner.displayName}!\`,
      });
    } catch {}
    try {
      addNotification({
        userId: target.id, actorId: me.id, type: "crush_match",
        targetType: "user", targetId: me.id,
        preview: \`💥 Es hat gefunkt mit \${me.displayName}!\`,
      });
    } catch {}
    // Push an beide
    const myDn = me.displayName || me.username;
    const partnerDn = result.partner.displayName || result.partner.username;
    sendPushToUser(me.id, {
      title: "💥 Es hat gefunkt!",
      body: \`Du und @\${result.partner.username} habt euch gegenseitig als geheimen Schwarm eingetragen.\`,
      url: "/crushes",
      tag: \`crush-match-\${result.partner.username}\`,
      kind: "message",
    }).catch(() => {});
    sendPushToUser(target.id, {
      title: "💥 Es hat gefunkt!",
      body: \`Du und @\${me.username} habt euch gegenseitig als geheimen Schwarm eingetragen.\`,
      url: "/crushes",
      tag: \`crush-match-\${me.username}\`,
      kind: "message",
      fromUsername: me.username,
      fromDisplayName: myDn,
      fromUserId: me.id,
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    matched: result.matched,
    partner: result.partner || null,
  });
}
