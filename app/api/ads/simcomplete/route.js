import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { completeAdImpression, getAdImpressionByToken } from "@/lib/db";
import { PROVIDER, getProviderConfig } from "@/lib/ads";

// Simulator-Modus: Client meldet "Video durchgesehen" nach Mindest-Wartezeit.
// SICHERHEIT: der Server prueft die Wartezeit selber ueber started_at.
// Der Client kann NICHT betruegen indem er sofort einen Reward triggert.
//
// In Produktion (ADS_PROVIDER != "simulator") ist dieser Endpoint deaktiviert —
// der echte Reward kommt nur per /api/ads/callback vom Provider-Server.

export async function POST(req) {
  if (PROVIDER !== "simulator") {
    return NextResponse.json({ error: "Simulator-Endpunkt im Produktiv-Modus deaktiviert." }, { status: 403 });
  }
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const token = String(body?.token || "");
  if (!token || token.length !== 64) return NextResponse.json({ error: "Ungueltiger Token." }, { status: 400 });

  // Session holen + verifizieren dass sie zu DIESEM User gehoert
  const row = getAdImpressionByToken(token);
  if (!row) return NextResponse.json({ error: "Unbekannter Token." }, { status: 400 });
  if (row.user_id !== me.id) return NextResponse.json({ error: "Token gehoert nicht zu dir." }, { status: 403 });

  // Server prueft Wartezeit — der Client kann das NICHT manipulieren
  const cfg = getProviderConfig();
  const elapsed = Date.now() - row.started_at;
  const minMs = cfg.minWatchSeconds * 1000;
  if (elapsed < minMs) {
    return NextResponse.json({
      error: `Zu frueh — bitte noch ${Math.ceil((minMs - elapsed) / 1000)} Sek warten.`,
    }, { status: 425 });
  }

  // OK — providerVerified im Simulator-Modus = true (kein externer Anbieter da)
  const result = completeAdImpression(token, {
    providerVerified: true,
    payload: JSON.stringify({ simulator: true, elapsedMs: elapsed }),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, balance: result.balance, rewarded: result.rewarded });
}
