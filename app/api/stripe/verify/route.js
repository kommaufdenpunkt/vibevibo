import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStripe, STRIPE_PRICES } from "@/lib/stripe";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 💳 Fallback-Verify (für wenn Stripe-Webhooks nicht durchkommen)
// Wird vom Frontend nach erfolgreichem Redirect aufgerufen.
// Holt die Session von Stripe, prüft Payment-Status + Metadata,
// und schreibt Vibes/VIP idempotent gut.
//
// POST { sessionId } → { ok, balance? }
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sessionId = String(body?.sessionId || "").trim();
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  let stripe;
  try { stripe = getStripe(); }
  catch (e) {
    return NextResponse.json({ error: "Stripe nicht konfiguriert", detail: String(e?.message || e) }, { status: 500 });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (e) {
    return NextResponse.json({ error: "Session nicht gefunden", detail: String(e?.message || e) }, { status: 404 });
  }

  // Nur bezahlte Sessions geben Vibes/VIP
  if (session.payment_status !== "paid") {
    return NextResponse.json({ ok: false, reason: "not_paid", status: session.payment_status });
  }

  // Sicherheit: Metadata muss zum eingeloggten User passen
  const md = session.metadata || {};
  const userId = Number(md.userId || 0);
  if (userId !== me.id) {
    return NextResponse.json({ error: "Session gehoert anderem User" }, { status: 403 });
  }

  const priceId = String(md.priceId || "");
  const meta = STRIPE_PRICES[priceId];
  if (!meta) {
    return NextResponse.json({ error: "Unbekannte Price-ID", priceId }, { status: 400 });
  }

  if (typeof DB.grantPaidVibes !== "function" || typeof DB.grantPaidVip !== "function") {
    return NextResponse.json({
      error: "Grant-Helpers fehlen — patch-stripe-helpers.mjs noetig",
    }, { status: 500 });
  }

  try {
    if (meta.kind === "vibes") {
      const r = DB.grantPaidVibes(me.id, meta.amount, sessionId);
      return NextResponse.json({ ok: true, kind: "vibes", ...r });
    }
    if (meta.kind === "vip") {
      const r = DB.grantPaidVip(me.id, meta.days, sessionId);
      return NextResponse.json({ ok: true, kind: "vip", ...r });
    }
    return NextResponse.json({ error: "Unbekannter kind", kind: meta.kind }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: "Grant-Fehler", detail: String(e?.message || e) }, { status: 500 });
  }
}
