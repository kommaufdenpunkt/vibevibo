import { NextResponse } from "next/server";
import { getStripe, STRIPE_PRICES } from "@/lib/stripe";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";
// WICHTIG: kein Body-Parsing — Stripe braucht den RAW-Body fuer die Signatur.
export const runtime = "nodejs";

export async function POST(req) {
  const sig = req.headers.get("stripe-signature") || "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET nicht gesetzt" }, { status: 500 });
  }

  const rawBody = await req.text();
  let stripe, event;
  try {
    stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: "Signatur-Pruefung fehlgeschlagen", detail: String(e?.message || e) }, { status: 400 });
  }

  // Nur abgeschlossene Checkout-Sessions zaehlen — alles andere ignorieren.
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const session = event.data.object;
  const md = session.metadata || {};
  const userId = Number(md.userId || 0);
  const priceId = String(md.priceId || "");
  const sessionId = String(session.id || "");
  if (!userId || !priceId || !sessionId) {
    return NextResponse.json({ error: "Metadata fehlt", session: sessionId }, { status: 400 });
  }

  const meta = STRIPE_PRICES[priceId];
  if (!meta) {
    return NextResponse.json({ error: "Unbekannte Price-ID", priceId }, { status: 400 });
  }

  // Defensive: Helpers werden via scripts/patch-stripe-helpers.mjs auf dem
  // Server eingespielt. Wenn sie noch fehlen, klare 500 zurueckgeben statt crashen.
  if (typeof DB.grantPaidVibes !== "function" || typeof DB.grantPaidVip !== "function") {
    return NextResponse.json({
      error: "Grant-Helpers fehlen — bitte `node scripts/patch-stripe-helpers.mjs` auf dem Server ausfuehren",
    }, { status: 500 });
  }

  try {
    if (meta.kind === "vibes") {
      const r = DB.grantPaidVibes(userId, meta.amount, sessionId);
      return NextResponse.json({ ok: true, kind: "vibes", ...r });
    }
    if (meta.kind === "vip") {
      const r = DB.grantPaidVip(userId, meta.days, sessionId);
      return NextResponse.json({ ok: true, kind: "vip", ...r });
    }
    return NextResponse.json({ error: "Unbekannter kind", kind: meta.kind }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: "Grant-Fehler", detail: String(e?.message || e) }, { status: 500 });
  }
}
