import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStripe, STRIPE_PRICES, publicBaseUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// POST { priceId } → { url } (Stripe Checkout Session)
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const priceId = String(body?.priceId || "").trim();
  const meta = STRIPE_PRICES[priceId];
  if (!meta) return NextResponse.json({ error: "unbekannte Price-ID" }, { status: 400 });

  let stripe;
  try { stripe = getStripe(); }
  catch (e) {
    return NextResponse.json({ error: "Stripe nicht konfiguriert", detail: String(e?.message || e) }, { status: 500 });
  }

  const base = publicBaseUrl();
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/shop?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/shop?stripe=cancel`,
      // Idempotenz + Audit: User-ID, Paket-Info reisen mit der Session mit
      metadata: {
        userId: String(me.id),
        username: String(me.username || ""),
        priceId,
        kind: meta.kind,
        amount: String(meta.amount || ""),
        days: String(meta.days || ""),
      },
      // Hinweis im Stripe-Dashboard
      client_reference_id: String(me.id),
      // Wir setzen kein customer_email — User koennen auch ohne Mail kaufen.
      // Wenn der User eine Mail hat, koennten wir sie hier vorausfuellen.
      ...(me.email ? { customer_email: me.email } : {}),
    });
    return NextResponse.json({ url: session.url, id: session.id });
  } catch (e) {
    return NextResponse.json({ error: "Stripe-Fehler", detail: String(e?.message || e) }, { status: 500 });
  }
}
