// 🔐 Facebook-OAuth · Start

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function randomState() {
  const arr = new Uint8Array(32);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET(req) {
  const appId = process.env.FACEBOOK_CLIENT_ID || "";
  if (!appId) {
    return NextResponse.json({
      error: "FACEBOOK_CLIENT_ID nicht konfiguriert. In Coolify als ENV setzen.",
    }, { status: 503 });
  }

  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/auth/facebook/callback`;
  const next = url.searchParams.get("next") || "/";

  const state = randomState();
  const c = await cookies();
  c.set("vv_oauth_state", state, {
    httpOnly: true, sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 600,
  });
  c.set("vv_oauth_next", next, {
    httpOnly: true, sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 600,
  });

  const authUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "email,public_profile");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
