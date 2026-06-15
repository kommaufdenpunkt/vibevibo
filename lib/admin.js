import { cookies } from "next/headers";
import crypto from "node:crypto";

// Admin-Zugang per Passwort aus Environment-Variable (in Coolify setzen).
// Kein Admin-Passwort gesetzt => Admin-Bereich komplett deaktiviert.
const ADMIN_PW = process.env.VV_ADMIN_PASSWORD || "";
const COOKIE = "vv_admin";

export function adminEnabled() {
  return ADMIN_PW.length >= 6;
}

function expectedToken() {
  // Deterministischer Token aus dem Passwort (kein Klartext im Cookie)
  return crypto.createHash("sha256").update("vv-admin:" + ADMIN_PW).digest("hex");
}

export function checkAdminPassword(pw) {
  if (!adminEnabled()) return false;
  const a = Buffer.from(String(pw || ""));
  const b = Buffer.from(ADMIN_PW);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Cookie-frei: Admin-Auth über Header x-admin-password ODER Query-Param ?pw=.
// Robust hinter TLS-Proxies (kein Cookie-/Subdomain-Timing nötig).
export function isAdminRequest(req) {
  const headerPw = req.headers.get("x-admin-password") || "";
  if (headerPw && checkAdminPassword(headerPw)) return true;
  try {
    const url = new URL(req.url);
    const queryPw = url.searchParams.get("pw") || "";
    if (queryPw && checkAdminPassword(queryPw)) return true;
  } catch {}
  return false;
}

export async function setAdminCookie() {
  const c = await cookies();
  c.set(COOKIE, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    // Explizit false: Coolify/Traefik terminiert TLS, der Container sieht intern HTTP.
    // Mit Secure würde der Browser den Cookie über die interne HTTP-Verbindung verwerfen.
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8, // 8 Stunden
  });
}

export async function clearAdminCookie() {
  const c = await cookies();
  c.set(COOKIE, "", { path: "/", maxAge: 0 });
}

export async function isAdmin() {
  if (!adminEnabled()) return false;
  const c = await cookies();
  const tok = c.get(COOKIE)?.value;
  if (!tok) return false;
  const exp = expectedToken();
  const a = Buffer.from(tok);
  const b = Buffer.from(exp);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
