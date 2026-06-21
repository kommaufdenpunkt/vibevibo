// 🔐 Facebook-OAuth · Callback

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  findUserByFacebookId, findUserByEmailFB, linkFacebookAccount,
  createUserFromFacebook, createSession, audit, getUserById,
  getOnboardingNeeded,
} from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { getPublicOrigin } from "@/lib/publicUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errRedirect(origin, msg) {
  const u = new URL("/login", origin);
  u.searchParams.set("error", msg);
  return NextResponse.redirect(u.toString());
}

export async function GET(req) {
  const appId = process.env.FACEBOOK_CLIENT_ID || "";
  const appSecret = process.env.FACEBOOK_CLIENT_SECRET || "";
  const publicOrigin = getPublicOrigin(req);

  if (!appId || !appSecret) {
    return errRedirect(publicOrigin, "Facebook-Login nicht konfiguriert");
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) return errRedirect(publicOrigin, `Facebook-Login abgebrochen (${oauthError})`);
  if (!code || !stateParam) return errRedirect(publicOrigin, "Ungültige Facebook-Antwort");

  const c = await cookies();
  const stateCookie = c.get("vv_oauth_state")?.value || "";
  const next = c.get("vv_oauth_next")?.value || "/";
  c.set("vv_oauth_state", "", { path: "/", maxAge: 0 });
  c.set("vv_oauth_next", "", { path: "/", maxAge: 0 });

  if (!stateCookie || stateCookie !== stateParam) {
    return errRedirect(publicOrigin, "Sicherheits-Check fehlgeschlagen (state mismatch)");
  }

  const redirectUri = `${publicOrigin}/api/auth/facebook/callback`;

  // 1) Token tauschen (GET bei Facebook)
  let tokens;
  try {
    const tokenUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);
    const r = await fetch(tokenUrl.toString());
    tokens = await r.json();
    if (!r.ok || !tokens.access_token) {
      audit({ action: "oauth.fb.token_fail", detail: JSON.stringify(tokens).slice(0, 200) });
      return errRedirect(publicOrigin, "Token-Tausch fehlgeschlagen");
    }
  } catch {
    return errRedirect(publicOrigin, "Netzwerk-Fehler bei Facebook");
  }

  // 2) User-Info
  let info;
  try {
    const infoUrl = new URL("https://graph.facebook.com/me");
    infoUrl.searchParams.set("fields", "id,email,name,picture.width(400)");
    infoUrl.searchParams.set("access_token", tokens.access_token);
    const r = await fetch(infoUrl.toString());
    info = await r.json();
    if (!r.ok || !info.id) {
      audit({ action: "oauth.fb.userinfo_fail", detail: JSON.stringify(info).slice(0, 200) });
      return errRedirect(publicOrigin, "Facebook-User-Info konnte nicht geladen werden");
    }
  } catch {
    return errRedirect(publicOrigin, "Netzwerk-Fehler bei Facebook-User-Info");
  }

  const email = info.email || "";
  const avatarUrl = info.picture?.data?.url || "";

  // 3) User finden oder anlegen
  let user = findUserByFacebookId(info.id);

  if (!user) {
    const byEmail = email ? findUserByEmailFB(email) : null;
    if (byEmail) {
      linkFacebookAccount(byEmail.id, info.id, email);
      user = getUserById(byEmail.id);
      audit({ userId: user.id, action: "oauth.fb.linked", detail: `email=${email}` });
    } else {
      try {
        user = createUserFromFacebook({
          facebookId: info.id, email,
          displayName: info.name || (email ? email.split("@")[0] : "fb-user"),
          avatarUrl,
        });
        audit({ userId: user.id, action: "oauth.fb.signup", detail: `email=${email}` });
      } catch (e) {
        return errRedirect(publicOrigin, `Account-Erstellung fehlgeschlagen: ${e.message}`);
      }
    }
  } else {
    audit({ userId: user.id, action: "oauth.fb.login" });
  }

  if (user.status === "blocked") return errRedirect(publicOrigin, "Dieser Account wurde gesperrt");
  if (user.status === "pending") {
    return errRedirect(publicOrigin, "Du stehst auf der Warteliste – wir schalten dich bald frei! 💌");
  }

  // 4) Session + Redirect
  const token = createSession(user.id);
  await setSessionCookie(token);

  // 5) Onboarding-Check: wenn User noch keinen eigenen Username/Anzeigenamen
  //    gewählt hat → erst zur /willkommen-Seite, dann erst zum eigentlichen Ziel
  if (getOnboardingNeeded(user.id)) {
    return NextResponse.redirect(new URL("/willkommen", publicOrigin).toString());
  }

  const safeNext = (next && next.startsWith("/") && !next.startsWith("//")) ? next : "/";
  return NextResponse.redirect(new URL(safeNext, publicOrigin).toString());
}
