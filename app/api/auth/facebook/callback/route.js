// 🔐 Facebook-OAuth · Callback

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  findUserByFacebookId, findUserByEmailFB, linkFacebookAccount,
  createUserFromFacebook, createSession, audit, getUserById,
} from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errRedirect(url, msg) {
  const u = new URL("/login", url);
  u.searchParams.set("error", msg);
  return NextResponse.redirect(u.toString());
}

export async function GET(req) {
  const appId = process.env.FACEBOOK_CLIENT_ID || "";
  const appSecret = process.env.FACEBOOK_CLIENT_SECRET || "";
  if (!appId || !appSecret) {
    return errRedirect(req.url, "Facebook-Login nicht konfiguriert");
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) return errRedirect(req.url, `Facebook-Login abgebrochen (${oauthError})`);
  if (!code || !stateParam) return errRedirect(req.url, "Ungültige Facebook-Antwort");

  const c = await cookies();
  const stateCookie = c.get("vv_oauth_state")?.value || "";
  const next = c.get("vv_oauth_next")?.value || "/";
  c.set("vv_oauth_state", "", { path: "/", maxAge: 0 });
  c.set("vv_oauth_next", "", { path: "/", maxAge: 0 });

  if (!stateCookie || stateCookie !== stateParam) {
    return errRedirect(req.url, "Sicherheits-Check fehlgeschlagen (state mismatch)");
  }

  const redirectUri = `${url.origin}/api/auth/facebook/callback`;

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
      return errRedirect(req.url, "Token-Tausch fehlgeschlagen");
    }
  } catch {
    return errRedirect(req.url, "Netzwerk-Fehler bei Facebook");
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
      return errRedirect(req.url, "Facebook-User-Info konnte nicht geladen werden");
    }
  } catch {
    return errRedirect(req.url, "Netzwerk-Fehler bei Facebook-User-Info");
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
        return errRedirect(req.url, `Account-Erstellung fehlgeschlagen: ${e.message}`);
      }
    }
  } else {
    audit({ userId: user.id, action: "oauth.fb.login" });
  }

  if (user.status === "blocked") return errRedirect(req.url, "Dieser Account wurde gesperrt");

  // 4) Session + Redirect
  const token = createSession(user.id);
  await setSessionCookie(token);
  const safeNext = (next && next.startsWith("/") && !next.startsWith("//")) ? next : "/";
  return NextResponse.redirect(new URL(safeNext, url.origin).toString());
}
