// 🛡 CSRF-Schutz via Double-Submit-Cookie-Pattern.
//
// Funktioniert so:
//   1. Middleware setzt bei jeder Response einen `vv_csrf`-Cookie (NICHT httpOnly,
//      damit JS ihn lesen kann) — pro Browser-Session konstant.
//   2. State-Changes (POST/PUT/DELETE/PATCH) MÜSSEN den gleichen Wert im Header
//      `x-csrf-token` mitschicken.
//   3. Server prüft Cookie === Header. Wenn nicht → 403.
//
// Sichere Methoden (GET, HEAD, OPTIONS) brauchen keinen Token.
//
// Web-Auth-Endpoints (Login, Register) sind ausgenommen — sonst kommt der
// User nie rein.

import { cookies } from "next/headers";
import crypto from "node:crypto";

export const CSRF_COOKIE = "vv_csrf";
export const CSRF_HEADER = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Endpunkte, die ohne CSRF-Token aufgerufen werden dürfen (Initial-Login etc.)
const CSRF_EXEMPT_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/_internal/", // Internal Server-to-Server
  "/api/stripe/webhook", // Stripe signiert selbst
  "/api/ping",
];

export function generateCsrfToken() {
  return crypto.randomBytes(24).toString("base64url");
}

/**
 * Setzt das CSRF-Cookie auf der gegebenen Response, falls noch nicht vorhanden.
 * Verwendung in middleware.js.
 */
export function ensureCsrfCookie(req, res) {
  const existing = req.cookies?.get?.(CSRF_COOKIE)?.value;
  if (existing && existing.length >= 16) return existing;
  const token = generateCsrfToken();
  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false, // JS muss lesen können, damit Frontend Header setzen kann
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return token;
}

/**
 * Liest den CSRF-Token aus dem Cookie (Server-Side).
 */
export async function getCsrfToken() {
  const c = await cookies();
  return c.get(CSRF_COOKIE)?.value || "";
}

/**
 * Verifiziert eine Request. Wirft NICHT, sondern liefert { ok, reason }.
 *
 * Verwendung in API-Routes:
 *   const csrf = verifyCsrf(req);
 *   if (!csrf.ok) return NextResponse.json({ error: csrf.reason }, { status: 403 });
 */
export function verifyCsrf(req) {
  const method = (req.method || "GET").toUpperCase();
  if (SAFE_METHODS.has(method)) return { ok: true, reason: "" };

  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;
  for (const p of CSRF_EXEMPT_PREFIXES) {
    if (path.startsWith(p)) return { ok: true, reason: "exempt" };
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const m = cookieHeader.match(new RegExp(`(?:^|;\\\\s*)${CSRF_COOKIE}=([^;]+)`));
  const cookieTok = m ? decodeURIComponent(m[1]) : "";
  const hdrTok = req.headers.get(CSRF_HEADER) || "";

  if (!cookieTok || !hdrTok) {
    return { ok: false, reason: "CSRF-Token fehlt." };
  }
  if (cookieTok.length !== hdrTok.length) {
    return { ok: false, reason: "CSRF-Token ungültig." };
  }
  // Konstante-Zeit-Vergleich
  let diff = 0;
  for (let i = 0; i < cookieTok.length; i++) {
    diff |= cookieTok.charCodeAt(i) ^ hdrTok.charCodeAt(i);
  }
  if (diff !== 0) {
    return { ok: false, reason: "CSRF-Token ungültig." };
  }
  return { ok: true, reason: "" };
}

/**
 * Origin/Referer-Check als zweiter Riegel. Verlangt dass Request von gleicher
 * Origin kommt (oder von einer in ALLOWED_ORIGINS).
 */
export function verifyOrigin(req, allowed = ["https://vibevibo.de", "https://mcp.vibevibo.de"]) {
  const method = (req.method || "GET").toUpperCase();
  if (SAFE_METHODS.has(method)) return { ok: true };

  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  const host = req.headers.get("host") || "";

  // Same-host ist immer ok (gleicher Server, gleiche Domain)
  if (origin) {
    try {
      const o = new URL(origin);
      if (o.host === host) return { ok: true };
      if (allowed.some((a) => origin.startsWith(a))) return { ok: true };
    } catch {}
    return { ok: false, reason: "Origin nicht erlaubt." };
  }
  if (referer) {
    try {
      const r = new URL(referer);
      if (r.host === host) return { ok: true };
      if (allowed.some((a) => referer.startsWith(a))) return { ok: true };
    } catch {}
    return { ok: false, reason: "Referer nicht erlaubt." };
  }
  // Weder Origin noch Referer? In Dev manchmal so. In Prod blocken.
  if (process.env.NODE_ENV === "production") {
    return { ok: false, reason: "Origin/Referer fehlt." };
  }
  return { ok: true };
}
