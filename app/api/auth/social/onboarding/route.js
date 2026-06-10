import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createUser, upsertLinkedAccount, getUserByUsername,
  countRecentRegistrationsByIp, isIpBlocked, audit,
} from "@/lib/db";
import { getClientIp } from "@/lib/ip";
import { verifyPayload, ONBOARD_COOKIE } from "@/lib/socialOnboarding";

// GET: Liefert Onboarding-Payload-Vorschau (vorausgefuellte Felder) an die Page
export async function GET() {
  const c = await cookies();
  const token = c.get(ONBOARD_COOKIE)?.value;
  const payload = verifyPayload(token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 410 });
  return NextResponse.json({
    provider: payload.provider,
    displayName: payload.displayName || "",
    suggestedUsername: payload.suggestedUsername || "",
    email: payload.email || "",
    avatarUrl: payload.avatarUrl || "",
  });
}

// POST: Account erstellen, in Warteliste schicken, Session NICHT setzen.
export async function POST(req) {
  const c = await cookies();
  const token = c.get(ONBOARD_COOKIE)?.value;
  const payload = verifyPayload(token);
  if (!payload) {
    return NextResponse.json({ error: "Sitzung abgelaufen — bitte neu mit Facebook starten." }, { status: 410 });
  }

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  // Honeypot
  if (body.hp && String(body.hp).trim() !== "") {
    audit({ action: `social.${payload.provider}.honeypot`, ip: getClientIp(req) });
    return NextResponse.json({ error: "Bot erkannt." }, { status: 400 });
  }

  // Captcha (clientseitig generierter Sum-Check, Server haelt nur min Zeit auf der Seite ein)
  const expectedSum = Number(body.captchaSum);
  if (!Number.isFinite(expectedSum) || Number(body.captcha) !== expectedSum) {
    return NextResponse.json({ error: "Captcha falsch." }, { status: 400 });
  }
  // Min 2 Sekunden Bedenkzeit
  if (Date.now() - Number(payload.startedAt || 0) < 2000) {
    return NextResponse.json({ error: "Zu schnell." }, { status: 400 });
  }

  // AGB
  if (!body.accepted) {
    return NextResponse.json({ error: "AGB muessen akzeptiert werden." }, { status: 400 });
  }

  const ip = getClientIp(req);
  if (isIpBlocked(ip)) {
    audit({ action: `social.${payload.provider}.blocked_ip`, ip });
    return NextResponse.json({ error: "Registrierung von dieser IP nicht erlaubt." }, { status: 403 });
  }

  // Doppelaccount-Schutz: max 3 Neuregistrierungen pro IP in 24h
  const recent = countRecentRegistrationsByIp(ip, 24 * 60 * 60 * 1000);
  if (recent >= 3) {
    audit({ action: `social.${payload.provider}.too_many_per_ip`, ip, detail: String(recent) });
    return NextResponse.json({ error: "Zu viele Registrierungen von dieser IP. Bitte spaeter erneut versuchen." }, { status: 429 });
  }

  // Validierung der Eingaben
  const username = String(body.username || "").toLowerCase().trim();
  const displayName = String(body.displayName || "").trim();
  const gender = body.gender === "m" || body.gender === "w" ? body.gender : "";
  const birthdate = String(body.birthdate || "").trim();

  if (getUserByUsername(username)) {
    return NextResponse.json({ error: "Username schon vergeben." }, { status: 409 });
  }

  // Random Password — der User kann sich danach nur ueber Social einloggen
  const randomPw = require("crypto").randomBytes(24).toString("hex") + "Aa1!";

  let user;
  try {
    user = createUser({
      username, displayName, password: randomPw,
      emoji: "🙂", regIp: ip, gender, birthdate,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Anlegen fehlgeschlagen" }, { status: 400 });
  }

  // Provider-Link anlegen (gleiche Daten aus dem Onboarding-Cookie)
  upsertLinkedAccount(user.id, payload.provider, {
    providerUserId: payload.providerUserId,
    displayName: payload.displayName,
    avatarUrl: payload.avatarUrl,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    expiresAt: payload.expiresAt || 0,
    scope: payload.scope || "",
    rawProfile: { email: payload.email },
  });

  audit({ userId: user.id, action: `social.${payload.provider}.signup_pending`, ip });

  // Cookie loeschen — User landet im Warteraum, KEINE Session
  const res = NextResponse.json({ ok: true, redirect: "/warteliste" });
  res.cookies.set(ONBOARD_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
