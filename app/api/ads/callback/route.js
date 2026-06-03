// Server-to-Server-Callback vom Werbeanbieter.
// Dieser Endpoint ist OEFFENTLICH erreichbar (keine User-Session noetig),
// dafuer streng signaturgeprueft.
//
// Provider sendet hierhin nach abgeschlossenem Video:
//   POST /api/ads/callback?provider=<name>
//   Body: { token, signature, ... }
// Wir validieren die Signatur mit dem Shared-Secret (ENV).

import { NextResponse } from "next/server";
import { completeAdImpression } from "@/lib/db";
import { verifyProviderCallback } from "@/lib/ads";

export async function POST(req) {
  const url = new URL(req.url);
  const provider = String(url.searchParams.get("provider") || "").toLowerCase();
  if (!provider) return NextResponse.json({ error: "provider fehlt" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const headers = Object.fromEntries(req.headers);

  // Anti-Cheat: Signatur muss verifizierbar sein
  const verified = verifyProviderCallback(provider, body, headers);
  if (!verified) return NextResponse.json({ error: "signature invalid" }, { status: 403 });

  const token = String(body?.token || body?.transaction_id || "");
  if (!token) return NextResponse.json({ error: "token fehlt" }, { status: 400 });

  const result = completeAdImpression(token, {
    providerVerified: true,
    payload: JSON.stringify({ provider, body }),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
