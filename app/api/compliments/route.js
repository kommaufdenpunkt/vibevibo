import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getUserByUsername, sendCompliment, complimentsSentToday, spendCredits, bumpXP,
  COMPLIMENT_DAILY_CAP, COMPLIMENT_COST, COMPLIMENT_COST_CUSTOM,
} from "@/lib/db";

// Vordefinierte Komplimente — kuratiert, freundlich, keine sexuellen Anspielungen.
// Wer mehr will, schreibt eigenen Text (kostet mehr Vibes, Fidolin moderiert spaeter).
export const STANDARD_COMPLIMENTS = [
  { emoji: "🌸", text: "Du machst diesen Ort schoener." },
  { emoji: "✨", text: "Dein Profil hat richtig guten Vibe." },
  { emoji: "💖", text: "Danke dass es dich gibt." },
  { emoji: "🌟", text: "Du strahlst heute besonders." },
  { emoji: "🎵", text: "Dein Musikgeschmack ist Gold wert." },
  { emoji: "📸", text: "Deine Fotos haben Stil." },
  { emoji: "😄", text: "Du bringst mich immer zum Laecheln." },
  { emoji: "🦋", text: "Du hast eine wunderschoene Seele." },
  { emoji: "🌈", text: "Du bist ein Lichtblick in der Timeline." },
  { emoji: "🏆", text: "Du verdienst nur das Beste." },
  { emoji: "🔥", text: "Dein letzter Post war Feuer." },
  { emoji: "🌻", text: "Du hast die nettesten Augen." },
];

// POST /api/compliments
// body: { toUsername, presetId? (Index in STANDARD_COMPLIMENTS), text?, anonymous? }
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const toUsername = String(body?.toUsername || "").trim();
  if (!toUsername) return NextResponse.json({ error: "toUsername required" }, { status: 400 });
  const target = getUserByUsername(toUsername);
  if (!target) return NextResponse.json({ error: "Nutzer nicht gefunden" }, { status: 404 });
  if (target.id === me.id) return NextResponse.json({ error: "Komplimente an dich selbst gehen nicht 😉" }, { status: 400 });

  // Daily-Cap (Anti-Spam)
  const sentToday = complimentsSentToday(me.id);
  if (sentToday >= COMPLIMENT_DAILY_CAP) {
    return NextResponse.json({
      error: `Du hast heute schon ${COMPLIMENT_DAILY_CAP} Komplimente verschickt. Morgen wieder!`,
    }, { status: 429 });
  }

  // Standard-Kompliment ODER eigener Text
  let text, emoji, cost;
  const presetId = Number.isInteger(body?.presetId) ? body.presetId : -1;
  if (presetId >= 0 && presetId < STANDARD_COMPLIMENTS.length) {
    const p = STANDARD_COMPLIMENTS[presetId];
    text = p.text; emoji = p.emoji; cost = COMPLIMENT_COST;
  } else if (typeof body?.text === "string" && body.text.trim()) {
    text = body.text.trim().slice(0, 200);
    emoji = (typeof body?.emoji === "string" && body.emoji.length <= 4) ? body.emoji : "💖";
    cost = COMPLIMENT_COST_CUSTOM;
    if (text.length < 6) {
      return NextResponse.json({ error: "Eigener Text mindestens 6 Zeichen." }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Wähle ein Kompliment oder schreib einen eigenen Text." }, { status: 400 });
  }

  // Vibes abbuchen (atomar, gegen Doppel-Klick)
  const spend = spendCredits(me.id, cost, `compliment:${presetId >= 0 ? "preset" : "custom"}`, {
    type: "compliment", id: target.id,
  });
  if (!spend.ok) {
    return NextResponse.json({
      error: `Nicht genug Vibes (${cost} ✨ benötigt, du hast ${spend.balance} ✨).`,
    }, { status: 402 });
  }

  const anonymous = body?.anonymous !== false; // default: anonym
  const id = sendCompliment(me.id, target.id, { text, emoji, anonymous });
  try { bumpXP(me.id, "compliment_send"); bumpXP(target.id, "compliment_recv"); } catch {}
  return NextResponse.json({ ok: true, id, balance: spend.balance, sentToday: sentToday + 1, cap: COMPLIMENT_DAILY_CAP });
}

// GET /api/compliments?presets=1  — nur die Standard-Liste fuer den Picker
export async function GET(req) {
  const url = new URL(req.url);
  if (url.searchParams.get("presets")) {
    return NextResponse.json({
      presets: STANDARD_COMPLIMENTS,
      cost: COMPLIMENT_COST,
      costCustom: COMPLIMENT_COST_CUSTOM,
      dailyCap: COMPLIMENT_DAILY_CAP,
    });
  }
  return NextResponse.json({ error: "use POST or ?presets=1" }, { status: 400 });
}
