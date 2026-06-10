import { NextResponse } from "next/server";
import {
  consumeOAuthState, findUserByLinkedAccount, upsertLinkedAccount,
  createUser, getUserById, getUserByUsername, createSession, audit, updateUser,
} from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { getOrCreateDeviceId } from "@/lib/device";
import { getClientIp } from "@/lib/ip";
import { exchangeCodeForToken, fetchUserProfile, isProviderConfigured } from "@/lib/socialAuth";
import { getPublicBaseUrl } from "@/lib/publicUrl";

function slugifyName(name, providerUserId) {
  let base = String(name || "").toLowerCase()
    .replace(/[^a-z0-9_.]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  if (!base || base.length < 3) base = "user_" + String(providerUserId || Date.now()).slice(-6);
  return base.slice(0, 22);
}

async function uniqueUsername(base) {
  let candidate = base;
  for (let i = 0; i < 20; i++) {
    if (!getUserByUsername(candidate)) return candidate;
    candidate = `${base}${Math.floor(Math.random() * 9999)}`.slice(0, 22);
  }
  return base + Date.now().toString(36);
}

// GET /api/auth/social/[provider]/callback?code=...&state=...
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

  // Link-Mode: existierender User verknuepft Provider
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
      // Session erstellen → einloggen
      const ip = getClientIp(req);
      const ua = req.headers.get("user-agent") || "";
      const deviceId = await getOrCreateDeviceId();
      const sessionToken = createSession(existing.id);
      await setSessionCookie(sessionToken);
      audit({ userId: existing.id, action: `social.${provider}.login`, ip, ua });
      // Token aktualisieren
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

  // Neuer Account anlegen
  const baseName = slugifyName(profile.displayName, profile.providerUserId);
  const username = await uniqueUsername(baseName);
  const displayName = profile.displayName || username;
  // Random Password (User loggt sich nur ueber Social ein bis er ein Passwort setzt)
  const randomPw = require("crypto").randomBytes(24).toString("hex");
  const ip = getClientIp(req);
  let user;
  try {
    user = createUser({
      username, displayName, password: randomPw,
      emoji: "🙂", regIp: ip,
    });
  } catch (e) {
    audit({ action: `social.${provider}.signup_fail`, ip, detail: e.message || "" });
    return NextResponse.redirect(new URL(`/login?err=signup_failed`, getPublicBaseUrl(req)));
  }

  // Link verknuepfen
  upsertLinkedAccount(user.id, provider, {
    providerUserId: profile.providerUserId,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: token.expiresIn ? Date.now() + token.expiresIn * 1000 : 0,
    scope: token.scope,
    rawProfile: profile.raw,
  });

  // Avatar-URL als Avatar-Vorschlag (geht durch Fidolin-Review beim Speichern)
  if (profile.avatarUrl) {
    try {
      updateUser(user.id, { /* placeholder — Avatar wird ueber pic-Upload spaeter geprueft */ });
    } catch {}
  }

  // Session
  const sessionToken = createSession(user.id);
  await setSessionCookie(sessionToken);
  audit({ userId: user.id, action: `social.${provider}.signup`, ip });

  return NextResponse.redirect(new URL((state.next_url || "/profile") + "?new=" + provider, getPublicBaseUrl(req)));
}
