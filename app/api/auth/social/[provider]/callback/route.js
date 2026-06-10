import { NextResponse } from "next/server";
import {
  consumeOAuthState, findUserByLinkedAccount, upsertLinkedAccount,
  getUserById, getUserByUsername, createSession, audit,
} from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { getClientIp } from "@/lib/ip";
import { exchangeCodeForToken, fetchUserProfile, isProviderConfigured } from "@/lib/socialAuth";
import { getPublicBaseUrl } from "@/lib/publicUrl";
import { signPayload, ONBOARD_COOKIE } from "@/lib/socialOnboarding";

function slugifyName(name, providerUserId) {
  let base = String(name || "").toLowerCase()
    .replace(/[^a-z0-9_.]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  if (!base || base.length < 3) base = "user_" + String(providerUserId || Date.now()).slice(-6);
  return base.slice(0, 17);
}

function suggestUsername(base) {
  if (!getUserByUsername(base)) return base;
  for (let i = 0; i < 10; i++) {
    const cand = `${base}${Math.floor(Math.random() * 9999)}`.slice(0, 17);
    if (!getUserByUsername(cand)) return cand;
  }
  return base.slice(0, 12) + Date.now().toString(36).slice(-4);
}

export async function GET(req, { params }) {
  const { provider } = await params;
  if (!isProviderConfigured(provider)) {
    return NextResponse.redirect(new URL("/login?err=provider_off", getPublicBaseUrl(req)));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  if (!code || !stateParam) {
    return NextResponse.redirect(new URL("/login?err=oauth_missing", getPublicBaseUrl(req)));
  }
  const state = consumeOAuthState(stateParam);
  if (!state || state.provider !== provider) {
    return NextResponse.redirect(new URL("/login?err=oauth_state", getPublicBaseUrl(req)));
  }

  const callbackUrl = `${getPublicBaseUrl(req)}/api/auth/social/${provider}/callback`;

  let token, profile;
  try {
    token = await exchangeCodeForToken(provider, code, callbackUrl);
    profile = await fetchUserProfile(provider, token.accessToken);
  } catch (e) {
    audit({ action: `social.${provider}.fail`, ip: getClientIp(req), detail: e.message || "" });
    return NextResponse.redirect(new URL(`/login?err=oauth_token`, getPublicBaseUrl(req)));
  }

  // Link-Mode: existierender, eingeloggter User verknuepft Provider
  if (state.user_id) {
    upsertLinkedAccount(state.user_id, provider, {
      providerUserId: profile.providerUserId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresIn ? Date.now() + token.expiresIn * 1000 : 0,
      scope: token.scope,
      rawProfile: profile.raw,
    });
    audit({ userId: state.user_id, action: `social.${provider}.linked`, ip: getClientIp(req) });
    return NextResponse.redirect(new URL((state.next_url || "/profile") + "?linked=" + provider, getPublicBaseUrl(req)));
  }

  // Login-Mode: existiert schon ein verknuepfter Account?
  const existingUserId = findUserByLinkedAccount(provider, profile.providerUserId);
  if (existingUserId) {
    const existing = getUserById(existingUserId);
    if (existing) {
      const ip = getClientIp(req);
      const ua = req.headers.get("user-agent") || "";
      const sessionToken = createSession(existing.id);
      await setSessionCookie(sessionToken);
      audit({ userId: existing.id, action: `social.${provider}.login`, ip, ua });
      upsertLinkedAccount(existing.id, provider, {
        providerUserId: profile.providerUserId,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresIn ? Date.now() + token.expiresIn * 1000 : 0,
        scope: token.scope,
        rawProfile: profile.raw,
      });
      return NextResponse.redirect(new URL(state.next_url || "/", getPublicBaseUrl(req)));
    }
  }

  // Neuer Account: Profile-Daten in signed Cookie -> Onboarding-Page (Pflichtfelder + AGB + Captcha)
  const baseName = slugifyName(profile.displayName, profile.providerUserId);
  const suggested = suggestUsername(baseName);
  const payload = signPayload({
    provider,
    providerUserId: profile.providerUserId,
    displayName: profile.displayName || "",
    email: profile.email || "",
    avatarUrl: profile.avatarUrl || "",
    suggestedUsername: suggested,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: token.expiresIn ? Date.now() + token.expiresIn * 1000 : 0,
    scope: token.scope,
    nextUrl: state.next_url || "/profile",
    startedAt: Date.now(),
  });

  audit({ action: `social.${provider}.onboard_start`, ip: getClientIp(req) });

  const res = NextResponse.redirect(new URL("/onboarding/social", getPublicBaseUrl(req)));
  res.cookies.set(ONBOARD_COOKIE, payload, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
  });
  return res;
}
