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

function tokenMatches(tok) {
  if (!tok) return false;
  const exp = expectedToken();
  const a = Buffer.from(String(tok));
  const b = Buffer.from(exp);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Admin-Auth über (1) Cookie, (2) Header x-admin-password, (3) Query-Param ?pw=
// Cookie ist die saubere Methode — die anderen sind für Backward-Compat / API-Tools
// noch akzeptiert, sollten aber neue Aufrufer nicht mehr nutzen.
export function isAdminRequest(req) {
  if (!adminEnabled()) return false;
  // (1) Cookie — sauberster Weg
  try {
    const tok = req.cookies?.get?.(COOKIE)?.value;
    if (tokenMatches(tok)) return true;
  } catch {}
  // (2) Header — für API-Clients
  const headerPw = req.headers.get("x-admin-password") || "";
  if (headerPw && checkAdminPassword(headerPw)) return true;
  // (3) Query — LEGACY, leakt Passwort in URL/Logs. Bitte vermeiden.
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
  return tokenMatches(c.get(COOKIE)?.value);
}
