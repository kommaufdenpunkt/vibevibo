import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getUserByUsername, sendCompliment, complimentsReceived,
  markComplimentsSeen, addNotification,
} from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — Liste der Komplimente eines Users (anonym, auch öffentlich sichtbar).
// Wir nutzen das bestehende complimentsReceived(); es entfernt selbst Sender-Daten bei anonymous=1.
export async function GET(req, { params }) {
  const { username } = await params;
  const target = getUserByUsername(String(username).toLowerCase());
  if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
  const me = await getSessionUser();
  const isOwner = me && me.id === target.id;
  // Markiere als gelesen wenn Owner anschaut
  if (isOwner) {
    try { markComplimentsSeen(target.id); } catch {}
  }
  const list = complimentsReceived(target.id, 50);
  return NextResponse.json({
    compliments: list.map((c) => ({
      id: c.id,
      body: c.text,                    // Mapping aufs Frontend-Schema
      emoji: c.emoji,
      createdAt: c.createdAt,
      hidden: false,                   // Hide-Feature nicht im bestehenden System
    })),
    isOwner: !!isOwner,
  });
}

// POST — neues anonymes Kompliment senden
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Login nötig" }, { status: 401 });
  const { username } = await params;
  const target = getUserByUsername(String(username).toLowerCase());
  if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
  let body = {};
  try { body = await req.json(); } catch {}
  const text = String(body?.body || body?.text || "").trim();
  const emoji = String(body?.emoji || "💌");
  if (!text) return NextResponse.json({ error: "Kompliment ist leer" }, { status: 400 });
  if (Number(me.id) === Number(target.id)) {
    return NextResponse.json({ error: "Du kannst dir selbst keins schicken" }, { status: 400 });
  }
  try {
    const id = sendCompliment(me.id, target.id, { text, emoji, anonymous: true });
    try {
      addNotification({
        userId: target.id, actorId: null,
        type: "compliment", targetType: "compliment", targetId: id,
        preview: `${emoji} Jemand hat dir ein anonymes Kompliment geschickt!`,
      });
    } catch {}
    try {
      sendPushToUser(target.id, {
        title: `${emoji} Anonymes Kompliment!`,
        body: "Jemand findet was an dir toll. Schau auf dein Profil.",
        url: `/u/${target.username}`,
        kind: "compliment",
      }).catch(() => {});
    } catch {}
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
