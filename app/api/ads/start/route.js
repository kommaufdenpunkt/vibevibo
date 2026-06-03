import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { checkCanStartAd, createAdImpression } from "@/lib/db";
import { getProvider, getProviderConfig } from "@/lib/ads";

// Client moechte eine Rewarded-Ad starten.
// POST { slot: "home" | "shop_lowbal" | "vibo_hungry" | ... }
// Antwort: { token, provider, minWatchSeconds } — Client zeigt die Werbung an.
// Anti-Cheat: alle Caps + Cooldowns + IP-Sperre serverseitig geprueft.
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const slot = String(body?.slot || "default").slice(0, 32);
  // Echte IP holen — hinter Proxy aus X-Forwarded-For
  const ip = String(
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") || ""
  ).trim() || "unknown";

  const gate = checkCanStartAd(me.id, ip);
  if (!gate.allow) {
    return NextResponse.json({ error: gate.reason }, { status: 429 });
  }

  const session = createAdImpression(me.id, slot, getProvider(), ip);
  return NextResponse.json({
    ok: true,
    token: session.token,
    rewardAmount: session.rewardAmount,
    config: getProviderConfig(),
  });
}
