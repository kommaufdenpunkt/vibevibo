import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createOAuthState } from "@/lib/db";
import { isProviderConfigured, buildAuthorizeUrl } from "@/lib/socialAuth";

// GET /api/auth/social/[provider]/start?next=...
// Startet OAuth-Flow. Wenn User eingeloggt: Link-Mode (an bestehenden Account binden).
// Wenn nicht eingeloggt: Login-Mode (Account erstellen oder existierenden finden).
export async function GET(req, { params }) {
  const { provider } = await params;
  if (!["facebook", "instagram", "snapchat"].includes(provider)) {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }
  if (!isProviderConfigured(provider)) {
    return NextResponse.json({ error: `${provider} ist nicht konfiguriert (Client-ID fehlt)` }, { status: 503 });
  }

  const me = await getSessionUser();
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || (me ? "/profile" : "/");
  const state = createOAuthState(provider, me?.id || null, next);

  const callbackUrl = `${url.protocol}//${url.host}/api/auth/social/${provider}/callback`;
  const authUrl = buildAuthorizeUrl(provider, state, callbackUrl);
  return NextResponse.redirect(authUrl, 302);
}
