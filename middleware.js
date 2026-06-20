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
import { applySecurityHeaders } from "@/lib/securityHeaders";
import { ensureCsrfCookie } from "@/lib/csrf";

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
  "/agb",
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
  "/api/ads/public-",  // 🍪 Public-Ad-Config für anonyme Besucher
  "/api/cron/",        // ⏰ Cron-Endpoints — eigene x-cron-secret-Auth pro Route
  "/ads.txt",
];

// ⚡ MCP — wenn Host = mcp.vibevibo.de, alle Pfade nach /mcp/* umleiten
// (außer /api/ und _next-Assets, die normal durchgereicht werden).
function isMcpHost(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return h === "mcp.vibevibo.de" || h.startsWith("mcp.vibevibo.de:");
}

// 🛡 Wrapper: liefert NextResponse mit Security-Headers + CSRF-Cookie
function harden(req, res, { isMcp, isApi }) {
  applySecurityHeaders(res, { isMcp, isApi });
  // CSRF-Cookie nur auf Nicht-API-Responses ausstellen (für HTML-Seiten),
  // damit das Token im Browser landet bevor das Frontend POSTen will.
  if (!isApi) {
    try { ensureCsrfCookie(req, res); } catch {}
  }
  return res;
}

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  const isMcp = isMcpHost(hostname) || pathname === "/mcp" || pathname.startsWith("/mcp/");
  const isApi = pathname.startsWith("/api/");

  // === ⚡ MCP-Hostname-Routing ===
  if (isMcpHost(hostname)) {
    // API + Next-Assets durchreichen ohne Rewrite (aber mit Security-Headers)
    if (pathname.startsWith("/_next/") || pathname.startsWith("/api/") ||
        pathname === "/favicon.ico" || pathname === "/robots.txt" ||
        pathname === "/sitemap.xml" || pathname === "/ads.txt" ||
        pathname.startsWith("/icon-") || pathname === "/apple-icon.png" ||
        pathname === "/manifest.webmanifest") {
      return harden(req, NextResponse.next(), { isMcp: true, isApi });
    }
    // Schon unter /mcp? Dann nicht doppelt rewriten
    if (pathname === "/mcp" || pathname.startsWith("/mcp/")) {
      return harden(req, NextResponse.next(), { isMcp: true, isApi: false });
    }
    // Rewrite zu /mcp + originaler Pfad
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/mcp" : `/mcp${pathname}`;
    return harden(req, NextResponse.rewrite(url), { isMcp: true, isApi: false });
  }

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
  if (PUBLIC_EXACT.has(pathname)) return harden(req, NextResponse.next(), { isMcp, isApi });
  for (const p of PUBLIC_PREFIX) {
    if (pathname.startsWith(p)) return harden(req, NextResponse.next(), { isMcp, isApi });
  }
  if (pathname.endsWith("/manifest.webmanifest")) return harden(req, NextResponse.next(), { isMcp, isApi });
  // ⚡ MCP-Routen: Auth-Check macht das MCP-Layout selbst
  if (pathname === "/mcp" || pathname.startsWith("/mcp/")) return harden(req, NextResponse.next(), { isMcp: true, isApi });

  const session = req.cookies.get(COOKIE)?.value;
  if (session) return harden(req, NextResponse.next(), { isMcp, isApi });

  if (pathname.startsWith("/api/")) {
    return harden(req, NextResponse.json({ error: "auth required" }, { status: 401 }), { isMcp, isApi: true });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return harden(req, NextResponse.redirect(url), { isMcp, isApi });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|otf|css|js|map)$).*)",
  ],
};
