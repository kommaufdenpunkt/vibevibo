// 🛡 Admin-Auth — gehärteter Admin-Login.
// Schutzlagen: Rate-Limit (IP+Username) · IP-Intel · DB-Throttle ·
//              Timing-Protection · Audit-Trail · CSRF-Origin-Check.
// Trennt sich von MCP über:
//   • eigenes Cookie (vv_admin_session)
//   • strengere Rollenprüfung (isAdminRole statt isModeratorRole)

import { NextResponse } from "next/server";
import {
  sanctionTypes, isDeviceBanned,
  createMcpSession, deleteMcpSession, isAdminRole, getUserRole,
  recordMcpLoginAttempt, countMcpFailsByUsername, countMcpFailsByIp, clearMcpFails,
  isMcpTotpEnabled, verifyMcpTotpCode,
  verifyPassword,
} from "@/lib/db";
import { hasMcpPassword, verifyMcpPassword } from "@/lib/mcpCredentials";
import { setAdminSessionCookie, clearAdminSessionCookie, auditAdmin } from "@/lib/adminAuth";
import { getClientIp } from "@/lib/ip";
import { getOrCreateDeviceId } from "@/lib/device";
import { rateLimit, resetRateLimit } from "@/lib/rateLimit";
import { checkIpReputation, shouldBlockByIntel } from "@/lib/ipIntel";
import { verifyOrigin } from "@/lib/csrf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIN = 60_000;
const HOUR = 60 * MIN;
const MIN_RESPONSE_MS = 400;

const STRAFANZEIGE_HINT =
  " Wiederholte Login-Versuche auf das Admin-Panel werden protokolliert (§§ 202a/202c StGB).";

// POST { username, password } — Admin-Login
export async function POST(req) {
  const t0 = Date.now();
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") || "";

  async function respond(status, body, headers = {}) {
    const elapsed = Date.now() - t0;
    if (elapsed < MIN_RESPONSE_MS) {
      await new Promise((r) => setTimeout(r, MIN_RESPONSE_MS - elapsed));
    }
    return NextResponse.json(body, { status, headers });
  }

  // 0) Origin/Referer-Check
  const origin = verifyOrigin(req);
  if (!origin.ok) {
    recordMcpLoginAttempt({ ip, ua, success: false, reason: "admin:bad_origin" });
    return respond(403, { error: "Login-Anfrage abgewiesen (Origin-Check)." });
  }

  try {
    // 1) Gerät gesperrt?
    const deviceId = await getOrCreateDeviceId();
    if (isDeviceBanned(deviceId)) {
      recordMcpLoginAttempt({ ip, ua, success: false, reason: "admin:device_banned" });
      return respond(403, { error: "Dieses Gerät ist für VibeVibo gesperrt." });
    }

    // 2) Memory-Rate-Limit pro IP
    const ipLimit = rateLimit(`admin-login:ip:${ip}`, 8, 15 * MIN);
    if (!ipLimit.allowed) {
      recordMcpLoginAttempt({ ip, ua, success: false, reason: "admin:ratelimit_ip" });
      return respond(429,
        { error: `Zu viele Login-Versuche. Bitte in ~${Math.ceil(ipLimit.retryAfterSec / 60)} Min erneut versuchen.${STRAFANZEIGE_HINT}` },
        { "Retry-After": String(ipLimit.retryAfterSec) });
    }

    // 3) Body parsen
    let body = {};
    try { body = await req.json(); } catch {}
    const username = String(body?.username || "").trim().toLowerCase().slice(0, 64);
    const password = String(body?.password || "");
    if (!username || !password) {
      recordMcpLoginAttempt({ username, ip, ua, success: false, reason: "admin:missing_credentials" });
      return respond(400, { error: "Benutzername und Passwort nötig." });
    }

    // 4) DB-Lockout
    const userFails15min = countMcpFailsByUsername(username, 15 * MIN);
    const ipFails1h = countMcpFailsByIp(ip, HOUR);
    const ipFails24h = countMcpFailsByIp(ip, 24 * HOUR);
    if (userFails15min >= 5) {
      recordMcpLoginAttempt({ username, ip, ua, success: false, reason: "admin:user_lockout" });
      return respond(429, { error: `Account-Lockout: 5 falsche Versuche. Bitte 15 Min warten.${STRAFANZEIGE_HINT}` });
    }
    if (ipFails1h >= 15 || ipFails24h >= 40) {
      recordMcpLoginAttempt({ username, ip, ua, success: false, reason: "admin:ip_lockout" });
      return respond(429, { error: `Zu viele Fehlversuche von dieser Verbindung. Vorgang wird protokolliert.${STRAFANZEIGE_HINT}` });
    }

    // 5) IP-Intel — Admin ist STRENGER: kein VPN/Proxy/Hosting allowed.
    const intel = await checkIpReputation(ip);
    if (shouldBlockByIntel(intel, { strict: true })) {
      recordMcpLoginAttempt({ username, ip, ua, success: false, reason: `admin:bad_ip:tor=${intel.isTor},risk=${intel.riskScore}` });
      return respond(403, { error: "Login aus diesem Netzwerk nicht möglich (Tor / VPN / hohes Risiko)." });
    }
    if ((intel.isVpn || intel.isProxy || intel.isHosting) && userFails15min >= 1) {
      recordMcpLoginAttempt({ username, ip, ua, success: false, reason: "admin:vpn_lockout" });
      return respond(429, { error: `Admin-Login aus VPN/Proxy nicht erlaubt. Bitte normale Verbindung nutzen.${STRAFANZEIGE_HINT}` });
    }

    // 6) Passwort prüfen — bevorzugt MCP-Passwort (scrypt), fallback auf normales Passwort
    let user = null;
    let pwSource = "site";
    if (hasMcpPassword(username)) {
      user = verifyMcpPassword(username, password);
      pwSource = "mcp";
    } else {
      user = verifyPassword(username, password);
    }
    if (!user) {
      recordMcpLoginAttempt({ username, ip, ua, success: false, reason: `admin:wrong_password:${pwSource}` });
      return respond(401, { error: "Falscher Benutzername oder Passwort." });
    }

    // 7) Account-Status
    if (user.status === "blocked" || sanctionTypes(user.id).has("full")) {
      recordMcpLoginAttempt({ username, userId: user.id, ip, ua, success: false, reason: "admin:account_blocked" });
      return respond(403, { error: "Dein Zugang ist gesperrt." });
    }

    // 8) Rolle prüfen — STRENGER als MCP: NUR Admins+ (kein moderator/teamleitung)
    if (!isAdminRole(user.id)) {
      recordMcpLoginAttempt({ username, userId: user.id, ip, ua, success: false, reason: "admin:no_admin_role" });
      return respond(401, { error: "Falscher Benutzername oder Passwort." });
    }

    // 9) 🔐 2FA-Challenge falls aktiv
    if (typeof isMcpTotpEnabled === "function" && isMcpTotpEnabled(user.id)) {
      const totpCode = String(body?.totp || "").replace(/\D/g, "");
      if (!totpCode) {
        return respond(200, { needsTotp: true });
      }
      if (!verifyMcpTotpCode(user.id, totpCode)) {
        recordMcpLoginAttempt({ username, userId: user.id, ip, ua, success: false, reason: "admin:totp_fail" });
        return respond(401, { error: "2FA-Code ist ungültig.", needsTotp: true });
      }
    }

    // ─── Erfolg ───
    clearMcpFails(username);
    resetRateLimit(`admin-login:ip:${ip}`);
    const token = createMcpSession(user.id, { ip, userAgent: ua });
    await setAdminSessionCookie(token);
    recordMcpLoginAttempt({
      username, userId: user.id, ip, ua, success: true,
      reason: `admin:role=${getUserRole(user.id)},pw=${pwSource}`,
    });
    auditAdmin(user.id, "login", { details: `ip=${ip.slice(0, 16)},ua=${ua.slice(0, 32)},pw=${pwSource}` });
    return respond(200, {
      ok: true,
      user: {
        id: user.id, username: user.username, displayName: user.displayName,
        role: getUserRole(user.id),
      },
    });
  } catch (e) {
    recordMcpLoginAttempt({ ip, ua, success: false, reason: "admin:internal_error" });
    return respond(500, { error: "Login fehlgeschlagen (Server-Fehler)." });
  }
}

// DELETE — Logout
export async function DELETE(req) {
  const cookieHeader = req.headers.get("cookie") || "";
  const m = cookieHeader.match(/(?:^|;\s*)vv_admin_session=([^;]+)/);
  if (m) {
    try { deleteMcpSession(m[1]); } catch {}
  }
  await clearAdminSessionCookie();
  return NextResponse.json({ ok: true });
}
