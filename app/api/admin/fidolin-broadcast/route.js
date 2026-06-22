// 🎀 Admin-Endpoint für Fidolin-Broadcast (separates Endpoint vom system-Broadcast).
//
// GET → { lastBroadcastKey, lastBroadcastAt, recipientCount, newEntries, draftText }
// POST { text, lastChangelogKey? } → broadcast text als Fidolin

import { NextResponse } from "next/server";
import { isAdminRequest, adminEnabled } from "@/lib/admin";
import {
  broadcastFromFidolin, countFidolinBroadcastRecipients,
  getSetting, setSetting,
} from "@/lib/db";
import { sendPushToUser } from "@/lib/push";
import { CHANGELOG_PUBLIC } from "@/lib/changelog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function guard(req) {
  if (!adminEnabled()) return NextResponse.json({ error: "admin disabled" }, { status: 503 });
  if (!isAdminRequest(req)) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return null;
}

function getNewEntries() {
  const lastKey = getSetting("fidolin_broadcast_last_key", "");
  if (!lastKey) return CHANGELOG_PUBLIC.slice(0, 5);
  const idx = CHANGELOG_PUBLIC.findIndex((e) => e.key === lastKey);
  if (idx < 0) return CHANGELOG_PUBLIC.slice(0, 10);
  return CHANGELOG_PUBLIC.slice(0, idx);
}

function composeDraft(entries) {
  if (!entries.length) return "";
  const date = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
  const lines = entries.slice(0, 8).map((e) => {
    const emoji = e.emoji || "•";
    const title = String(e.title || "").slice(0, 180);
    return `${emoji} ${title}`;
  });
  return [
    `🎀 Hey du! Es gibt was Neues auf VibeVibo (${date}):`,
    "",
    ...lines,
    "",
    "Schau gerne im NEU-Bereich vorbei für alle Details!",
    "— Fidolin 🎀",
  ].join("\n");
}

export async function GET(req) {
  const g = guard(req); if (g) return g;
  const newEntries = getNewEntries();
  return NextResponse.json({
    lastBroadcastKey: getSetting("fidolin_broadcast_last_key", ""),
    lastBroadcastAt: Number(getSetting("fidolin_broadcast_last_at", 0) || 0),
    lastBroadcastCount: Number(getSetting("fidolin_broadcast_last_count", 0) || 0),
    recipientCount: countFidolinBroadcastRecipients(),
    newEntries: newEntries.map((e) => ({
      key: e.key, at: e.at, emoji: e.emoji, title: e.title,
    })),
    draftText: composeDraft(newEntries),
  });
}

export async function POST(req) {
  const g = guard(req); if (g) return g;
  let body = {};
  try { body = await req.json(); } catch {}
  const text = String(body?.text || "").trim();
  const lastChangelogKey = String(body?.lastChangelogKey || "");

  if (!text) return NextResponse.json({ error: "Text fehlt" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Text zu lang (max 2000)" }, { status: 400 });

  try {
    const result = broadcastFromFidolin(text);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Broadcast fehlgeschlagen" }, { status: 500 });
    }

    // Push parallel (best-effort, non-blocking)
    setSetting("fidolin_broadcast_last_at", String(Date.now()));
    setSetting("fidolin_broadcast_last_count", String(result.count));
    if (lastChangelogKey) {
      setSetting("fidolin_broadcast_last_key", lastChangelogKey);
    }
    return NextResponse.json({
      ok: true, count: result.count,
      recipientCount: countFidolinBroadcastRecipients(),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 500 });
  }
}
