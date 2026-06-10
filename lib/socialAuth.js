// 🔗 OAuth-Provider-Definitionen: Facebook, Instagram (via Meta), Snapchat.
// Client-Credentials liegen in Settings (DB) oder ENV. Wenn nicht gesetzt,
// gibt isProviderConfigured(p) false zurueck und die Login-Buttons gehen aus.

import { getSetting } from "./db.js";

// Effektiver Lesepfad: DB-Setting > ENV > Default
function readCfg(key, def = "") {
  try {
    const s = getSetting(key);
    if (s) return s;
  } catch {}
  return process.env[key] || def;
}

export function getProviderConfig(provider) {
  if (provider === "facebook") {
    return {
      provider: "facebook",
      clientId:     readCfg("FACEBOOK_CLIENT_ID"),
      clientSecret: readCfg("FACEBOOK_CLIENT_SECRET"),
      authorizeUrl: "https://www.facebook.com/v22.0/dialog/oauth",
      tokenUrl:     "https://graph.facebook.com/v22.0/oauth/access_token",
      // Reicht fuer Login + Avatar; user_birthday/gender brauchen App-Review
      defaultScope: "public_profile,email",
      profileUrl:   "https://graph.facebook.com/me",
      profileFields: "id,name,first_name,last_name,email,picture.width(512)",
    };
  }
  if (provider === "instagram") {
    return {
      provider: "instagram",
      // Instagram Basic Display API ist 2024 abgekuendigt → wir nutzen
      // Instagram Login via Meta-Plattform (gleicher App-Setup wie Facebook)
      clientId:     readCfg("INSTAGRAM_CLIENT_ID"),
      clientSecret: readCfg("INSTAGRAM_CLIENT_SECRET"),
      authorizeUrl: "https://api.instagram.com/oauth/authorize",
      tokenUrl:     "https://api.instagram.com/oauth/access_token",
      defaultScope: "user_profile,user_media",
      profileUrl:   "https://graph.instagram.com/me",
      profileFields: "id,username,account_type,media_count",
    };
  }
  if (provider === "snapchat") {
    return {
      provider: "snapchat",
      clientId:     readCfg("SNAPCHAT_CLIENT_ID"),
      clientSecret: readCfg("SNAPCHAT_CLIENT_SECRET"),
      authorizeUrl: "https://accounts.snapchat.com/accounts/oauth2/auth",
      tokenUrl:     "https://accounts.snapchat.com/accounts/oauth2/token",
      defaultScope: "https://auth.snapchat.com/oauth2/api/user.display_name https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar",
      // Snap-API ist GraphQL, eigene Profile-Fetch-Logik im Helper unten
      profileUrl:   "https://kit.snapchat.com/v1/me",
      profileFields: "",
    };
  }
  return null;
}

export function isProviderConfigured(provider) {
  const c = getProviderConfig(provider);
  return !!(c && c.clientId && c.clientSecret);
}

export function buildAuthorizeUrl(provider, state, redirectUri) {
  const c = getProviderConfig(provider);
  if (!c) return null;
  const params = new URLSearchParams({
    client_id:     c.clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         c.defaultScope,
    state,
  });
  // Snap erwartet leichten Twist: response_type=code + scope-Whitespace
  return `${c.authorizeUrl}?${params.toString()}`;
}

// Tausche code gegen access_token. Provider-abhaengig.
export async function exchangeCodeForToken(provider, code, redirectUri) {
  const c = getProviderConfig(provider);
  if (!c) throw new Error("provider not configured");

  if (provider === "facebook") {
    const url = `${c.tokenUrl}?` + new URLSearchParams({
      client_id: c.clientId, client_secret: c.clientSecret,
      redirect_uri: redirectUri, code,
    });
    const r = await fetch(url);
    const json = await r.json();
    if (!r.ok) throw new Error(json?.error?.message || "Facebook OAuth fehler");
    return {
      accessToken:  json.access_token,
      expiresIn:    json.expires_in || 0,
      refreshToken: "",
      scope:        c.defaultScope,
    };
  }

  if (provider === "instagram") {
    // Instagram tauscht via x-www-form-urlencoded POST
    const body = new URLSearchParams({
      client_id: c.clientId, client_secret: c.clientSecret,
      grant_type: "authorization_code", redirect_uri: redirectUri, code,
    });
    const r = await fetch(c.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = await r.json();
    if (!r.ok) throw new Error(json?.error_message || json?.error?.message || "Instagram OAuth fehler");
    return {
      accessToken:  json.access_token,
      expiresIn:    json.expires_in || 0,
      refreshToken: "",
      scope:        c.defaultScope,
    };
  }

  if (provider === "snapchat") {
    // Snap erwartet HTTP-Basic-Auth mit Client-Credentials + form-encoded body
    const basic = Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64");
    const body = new URLSearchParams({
      grant_type: "authorization_code", code, redirect_uri: redirectUri,
    });
    const r = await fetch(c.tokenUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const json = await r.json();
    if (!r.ok) throw new Error(json?.error_description || json?.error || "Snapchat OAuth fehler");
    return {
      accessToken:  json.access_token,
      expiresIn:    json.expires_in || 0,
      refreshToken: json.refresh_token || "",
      scope:        c.defaultScope,
    };
  }

  throw new Error("unknown provider");
}

// User-Profil holen + auf eine einheitliche Form mappen
export async function fetchUserProfile(provider, accessToken) {
  const c = getProviderConfig(provider);
  if (!c) throw new Error("provider not configured");

  if (provider === "facebook") {
    const url = `${c.profileUrl}?` + new URLSearchParams({
      fields: c.profileFields, access_token: accessToken,
    });
    const r = await fetch(url);
    const json = await r.json();
    if (!r.ok) throw new Error(json?.error?.message || "Facebook profile fehler");
    return {
      providerUserId: String(json.id),
      displayName:    json.name || `${json.first_name || ""} ${json.last_name || ""}`.trim(),
      email:          json.email || "",
      avatarUrl:      json.picture?.data?.url || "",
      raw: json,
    };
  }

  if (provider === "instagram") {
    const url = `${c.profileUrl}?` + new URLSearchParams({
      fields: c.profileFields, access_token: accessToken,
    });
    const r = await fetch(url);
    const json = await r.json();
    if (!r.ok) throw new Error(json?.error?.message || "Instagram profile fehler");
    return {
      providerUserId: String(json.id),
      displayName:    json.username || "",
      email:          "", // Instagram liefert keine Email
      avatarUrl:      "",
      raw: json,
    };
  }

  if (provider === "snapchat") {
    // Snap-Kit-API: GraphQL
    const query = `{ me { displayName bitmoji { avatar } externalId } }`;
    const r = await fetch(c.profileUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    const json = await r.json();
    if (!r.ok) throw new Error(json?.error || "Snapchat profile fehler");
    const me = json?.data?.me || {};
    return {
      providerUserId: String(me.externalId || ""),
      displayName:    me.displayName || "",
      email:          "",
      avatarUrl:      me.bitmoji?.avatar || "",
      raw: json,
    };
  }

  throw new Error("unknown provider");
}

export const PROVIDER_LABELS = {
  facebook:  { name: "Facebook",  emoji: "📘", color: "#1877f2" },
  instagram: { name: "Instagram", emoji: "📸", color: "#e4405f" },
  snapchat:  { name: "Snapchat",  emoji: "👻", color: "#fffc00" },
};
