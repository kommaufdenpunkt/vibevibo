// Middleware:
// • 🛡 Hacker-Detection: 50+ Angriffsmuster → Permabann + 403
// • Session-Check für eingeloggte Bereiche
//
// Hinweis: Edge-Runtime hat keinen DB-Zugriff. Permabann-Liste wird per
// fire-and-forget POST an /api/_internal/ban gespeichert (läuft in Node-Runtime).
// Wiederholtes Bombardieren von derselben IP wird trotzdem direkt wieder erkannt
// und 403't (die Detection-Regel triggert ja jedes Mal).

import { NextResponse } from "next/server";
import { detectAttack, getClientIp, isWhitelisted } from "@/lib/hackerguard";

const COOKIE = "vv_session";

const PUBLIC_EXACT = new Set([
  "/",
  "/login",
  "/register",
  "/datenschutz",
  "/impressum",
  "/about",
  "/faq",
  "/hilfe",
  "/neu",
  "/favicon.ico",
  "/sw.js",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon.png",
  "/api/stripe/webhook",
]);

const PUBLIC_PREFIX = [
  "/_next/",
  "/api/auth/",
  "/api/ping",
  "/api/maintenance",
  "/api/push/key",
  "/api/admin/",
  "/api/_internal/",
  "/api/welcome-bonus",
  "/ads.txt",
];

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // === 🛡 HACKER-GUARD (vor allem anderen) ===
  const ip = getClientIp(req);
  if (!isWhitelisted(ip, req)) {
    const attack = detectAttack(req);
    if (attack) {
      // Fire-and-forget: schreibe Permabann ins DB
      try {
        const origin = req.nextUrl.origin;
        fetch(`${origin}/api/_internal/ban`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-token": process.env.VV_INTERNAL_TOKEN || "no-token",
          },
          body: JSON.stringify({
            ip,
            pattern: attack.pattern,
            severity: attack.severity,
            payload: attack.payload,
            method: req.method,
            path: pathname,
            userAgent: req.headers.get("user-agent") || "",
          }),
        }).catch(() => {});
      } catch {}
      return new NextResponse("Forbidden", {
        status: 403,
        headers: { "x-banned": "1" },
      });
    }
  }

  // === Session/Public-Check ===
  if (PUBLIC_EXACT.has(pathname)) return NextResponse.next();
  for (const p of PUBLIC_PREFIX) {
    if (pathname.startsWith(p)) return NextResponse.next();
  }
  if (pathname.endsWith("/manifest.webmanifest")) return NextResponse.next();

  const session = req.cookies.get(COOKIE)?.value;
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|otf|css|js|map)$).*)",
  ],
};
