// Middleware:
// • 🛡 Hacker-Detection: 50+ Angriffsmuster → Permabann + 403
// • Session-Check für eingeloggte Bereiche
// • 🛡 Security-Hardening V2 (HSTS preload + strict CSP + Cross-Origin-Isolation)
//
// 🔐 Admin-Subdomain (admin.vibevibo.de) wird auf /adminpanel/* gemapped
// (statt /admin/*, da bereits ein existing app/admin/* existiert).

import { NextResponse } from "next/server";
import { detectAttack, getClientIp, isWhitelisted } from "@/lib/hackerguard";
import { applySecurityHeaders } from "@/lib/securityHeaders";
import { applyHardeningV2 } from "@/lib/securityHardeningV2";
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
  "/api/adminpanel/",
  "/api/_internal/",
  "/api/welcome-bonus",
  "/api/ads/public-",
  "/api/cron/",
  "/ads.txt",
];

function isMcpHost(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return h === "mcp.vibevibo.de" || h.startsWith("mcp.vibevibo.de:");
}

function isAdminHost(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return h === "admin.vibevibo.de" || h.startsWith("admin.vibevibo.de:");
}

function harden(req, res, { isMcp, isApi, isAdmin = false }) {
  applySecurityHeaders(res, { isMcp, isApi });
  applyHardeningV2(res, { isMcp, isApi, isAdmin });
  if (!isApi) {
    try { ensureCsrfCookie(req, res); } catch {}
  }
  return res;
}

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  const isMcp = isMcpHost(hostname) || pathname === "/mcp" || pathname.startsWith("/mcp/");
  const isAdmin = isAdminHost(hostname)
    || pathname === "/adminpanel" || pathname.startsWith("/adminpanel/");
  const isApi = pathname.startsWith("/api/");

  // === 🔐 Admin-Hostname-Routing — admin.vibevibo.de wird auf /adminpanel/* gemapped ===
  if (isAdminHost(hostname)) {
    // API + Next-Assets durchreichen ohne Rewrite
    if (pathname.startsWith("/_next/") || pathname.startsWith("/api/") ||
        pathname === "/favicon.ico" || pathname === "/robots.txt" ||
        pathname === "/sitemap.xml" || pathname === "/ads.txt" ||
        pathname.startsWith("/icon-") || pathname === "/apple-icon.png" ||
        pathname === "/manifest.webmanifest") {
      return harden(req, NextResponse.next(), { isMcp: false, isApi, isAdmin: true });
    }

    // Schon unter /adminpanel? Nicht doppelt rewriten
    if (pathname === "/adminpanel" || pathname.startsWith("/adminpanel/")) {
      return harden(req, NextResponse.next(), { isMcp: false, isApi: false, isAdmin: true });
    }

    // Strip leading /admin (Compat für alte URLs wie admin.vibevibo.de/admin/login)
    let cleanPath = pathname;
    if (cleanPath === "/admin") cleanPath = "/";
    else if (cleanPath.startsWith("/admin/")) cleanPath = cleanPath.slice(6) || "/";

    // Rewrite zu /adminpanel + cleanPath
    const url = req.nextUrl.clone();
    url.pathname = cleanPath === "/" ? "/adminpanel" : `/adminpanel${cleanPath}`;
    return harden(req, NextResponse.rewrite(url), { isMcp: false, isApi: false, isAdmin: true });
  }

  // === ⚡ MCP-Hostname-Routing ===
  if (isMcpHost(hostname)) {
    if (pathname.startsWith("/_next/") || pathname.startsWith("/api/") ||
        pathname === "/favicon.ico" || pathname === "/robots.txt" ||
        pathname === "/sitemap.xml" || pathname === "/ads.txt" ||
        pathname.startsWith("/icon-") || pathname === "/apple-icon.png" ||
        pathname === "/manifest.webmanifest") {
      return harden(req, NextResponse.next(), { isMcp: true, isApi });
    }
    if (pathname === "/mcp" || pathname.startsWith("/mcp/")) {
      return harden(req, NextResponse.next(), { isMcp: true, isApi: false });
    }
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/mcp" : `/mcp${pathname}`;
    return harden(req, NextResponse.rewrite(url), { isMcp: true, isApi: false });
  }

  // === 🛡 HACKER-GUARD ===
  const ip = getClientIp(req);
  if (!isWhitelisted(ip, req)) {
    const attack = detectAttack(req);
    if (attack) {
      try {
        const origin = req.nextUrl.origin;
        fetch(`${origin}/api/_internal/ban`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-token": process.env.VV_INTERNAL_TOKEN || "no-token",
          },
          body: JSON.stringify({
            ip, pattern: attack.pattern, severity: attack.severity,
            payload: attack.payload, method: req.method, path: pathname,
            userAgent: req.headers.get("user-agent") || "",
          }),
        }).catch(() => {});
      } catch {}
      return new NextResponse("Forbidden", { status: 403, headers: { "x-banned": "1" } });
    }
  }

  // === Session/Public-Check ===
  if (PUBLIC_EXACT.has(pathname)) return harden(req, NextResponse.next(), { isMcp, isApi });
  for (const p of PUBLIC_PREFIX) {
    if (pathname.startsWith(p)) return harden(req, NextResponse.next(), { isMcp, isApi });
  }
  if (pathname.endsWith("/manifest.webmanifest")) return harden(req, NextResponse.next(), { isMcp, isApi });
  if (pathname === "/mcp" || pathname.startsWith("/mcp/")) return harden(req, NextResponse.next(), { isMcp: true, isApi });
  // /adminpanel/* — Auth wird im Layout selbst geprüft
  if (pathname === "/adminpanel" || pathname.startsWith("/adminpanel/")) {
    return harden(req, NextResponse.next(), { isMcp: false, isApi, isAdmin: true });
  }

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
