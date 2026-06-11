import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createOAuthState } from "@/lib/db";
import { isProviderConfigured, buildAuthorizeUrl } from "@/lib/socialAuth";
import { getPublicBaseUrl } from "@/lib/publicUrl";

// GET /api/auth/social/[provider]/start?next=...
export async function GET(req, { params }) {
  const { provider } = await params;
  if (!["facebook", "instagram", "snapchat", "google"].includes(provider)) {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }
  if (!isProviderConfigured(provider)) {
    return NextResponse.json({ error: `${provider} ist nicht konfiguriert (Client-ID fehlt)` }, { status: 503 });
  }

  const me = await getSessionUser();
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || (me ? "/profile" : "/");
  const state = createOAuthState(provider, me?.id || null, next);

  const base = getPublicBaseUrl(req);
  const callbackUrl = `${base}/api/auth/social/${provider}/callback`;
  const authUrl = buildAuthorizeUrl(provider, state, callbackUrl);
  return NextResponse.redirect(authUrl, 302);
}
