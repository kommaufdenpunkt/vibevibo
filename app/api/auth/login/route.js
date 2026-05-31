import { NextResponse } from "next/server";
import {
  verifyPassword, createSession, isDeviceBanned, recordDevice, sanctionTypes,
  recordFailedLogin, countRecentFailedLogins, countRecentFailedLoginsByIp, clearFailedLogins,
  audit, getUserTotpSecret, isTotpEnabled, bumpQuestProgress,
} from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { getOrCreateDeviceId } from "@/lib/device";
import { getClientIp } from "@/lib/ip";
import { rateLimit, resetRateLimit } from "@/lib/rateLimit";
import { checkIpReputation, shouldBlockByIntel } from "@/lib/ipIntel";
import { verifyTotp } from "@/lib/totp";

const MIN = 60_000;
const HOUR = 60 * MIN;
const STRAFANZEIGE_HINT = " Wiederholte Login-Versuche auf fremde Accounts sind nach §§ 202a/202c StGB strafbar — Vorgänge werden protokolliert.";

// Minimum-Antwortzeit, um Timing-Angriffe gegen Username-Existenz zu erschweren.
const MIN_RESPONSE_MS = 350;

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

  try {
    const deviceId = await getOrCreateDeviceId();
    if (isDeviceBanned(deviceId)) {
      audit({ action: "login.device_banned", ip, ua });
      return respond(403, { error: "Dieses Gerät ist für VibeVibo gesperrt." });
    }

    // 1) IP-Rate-Limit
    const ipLimit = rateLimit(`login:ip:${ip}`, 10, 15 * MIN);
    if (!ipLimit.allowed) {
      audit({ action: "login.ratelimit_ip", ip, ua, detail: `retryAfter=${ipLimit.retryAfterSec}` });
      return respond(429,
        { error: `Zu viele Login-Versuche von dieser Verbindung. Bitte in ~${Math.ceil(ipLimit.retryAfterSec / 60)} Min erneut versuchen.${STRAFANZEIGE_HINT}` },
        { "Retry-After": String(ipLimit.retryAfterSec) });
    }

    let body;
    try { body = await req.json(); } catch { body = {}; }
    const username = String(body?.username || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const totpCode = String(body?.totp || "").replace(/\D/g, "");

    if (!username || !password) {
      return respond(400, { error: "Benutzername und Passwort nötig." });
    }

    // 2) Anti-Enumeration: Lockout-Meldung gibt nicht preis, ob der Username existiert.
    // Statt accountweiter Sperre: "zu viele Versuche von dieser Verbindung".
    const recentFails = countRecentFailedLogins(username, HOUR);
    const ipFails24h = countRecentFailedLoginsByIp(ip, 24 * HOUR);
    if (recentFails >= 10 || ipFails24h >= 30) {
      audit({ action: "login.locked", ip, ua, detail: `username=${username},account_fails=${recentFails},ip_fails=${ipFails24h}` });
      return respond(429, { error: `Zu viele Login-Versuche von dieser Verbindung. Vorgang wird protokolliert.${STRAFANZEIGE_HINT}` });
    }

    // 3) IP-Reputation
    const intel = await checkIpReputation(ip);
    if (shouldBlockByIntel(intel, { strict: false })) {
      audit({ action: "login.bad_ip", ip, ua, detail: `tor=${intel.isTor},risk=${intel.riskScore}` });
      return respond(403, { error: "Login aus diesem Netzwerk nicht möglich (Tor / hohes Risiko)." });
    }
    if ((intel.isVpn || intel.isProxy || intel.isHosting) && recentFails >= 3) {
      audit({ action: "login.vpn_locked", ip, ua, detail: `username=${username},vpn=${intel.isVpn},proxy=${intel.isProxy}` });
      return respond(429, { error: `Aus VPN/Proxy-Netzen sind nur 3 Versuche möglich. Bitte normale Verbindung nutzen.${STRAFANZEIGE_HINT}` });
    }

    // 4) Passwort prüfen
    const user = verifyPassword(username, password);
    if (!user) {
      recordFailedLogin(username, ip);
      audit({ action: "login.fail", ip, ua, detail: `username=${username}` });
      return respond(401, { error: "Falscher Benutzername oder Passwort." });
    }
    if (user.status === "pending") {
      return respond(403, { error: "Du stehst noch auf der Warteliste – wir schalten dich bald frei! 💌" });
    }
    if (user.status === "blocked") {
      audit({ userId: user.id, action: "login.blocked_account", ip, ua });
      return respond(403, { error: "Dieser Account wurde gesperrt." });
    }
    if (sanctionTypes(user.id).has("full")) {
      audit({ userId: user.id, action: "login.sanctioned", ip, ua });
      return respond(403, { error: "Dein Zugang ist aktuell gesperrt." });
    }

    // 5) 2FA, falls aktiviert
    if (isTotpEnabled(user.id)) {
      if (!totpCode) {
        // Passwort war richtig, aber Code fehlt — UI fragt nach
        return respond(200, { needsTotp: true });
      }
      const { active } = getUserTotpSecret(user.id);
      if (!verifyTotp(active, totpCode)) {
        recordFailedLogin(username, ip);
        audit({ userId: user.id, action: "login.totp_fail", ip, ua });
        return respond(401, { error: "2FA-Code ist ungültig." });
      }
    }

    // Erfolg
    clearFailedLogins(username);
    resetRateLimit(`login:ip:${ip}`);
    recordDevice(deviceId, { userId: user.id, username: user.username, userAgent: ua, ip });
    const token = createSession(user.id);
    await setSessionCookie(token);
    audit({ userId: user.id, action: "login.ok", ip, ua, detail: `device=${deviceId.slice(0, 8)},2fa=${isTotpEnabled(user.id) ? "yes" : "no"}` });
    try { bumpQuestProgress(user.id, "login"); } catch {}
    return respond(200, { user });
  } catch (e) {
    return respond(400, { error: e.message || "Login fehlgeschlagen." });
  }
}
