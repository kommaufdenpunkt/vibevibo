import { NextResponse } from "next/server";
import { createUser, isIpBlocked, countRecentRegistrationsByIp, isDeviceBanned, recordDevice } from "@/lib/db";
import { getClientIp } from "@/lib/ip";
import { getOrCreateDeviceId } from "@/lib/device";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

export async function POST(req) {
  const ip = getClientIp(req);
  const deviceId = await getOrCreateDeviceId();

  // 0) Gerät gesperrt? (Geräte-Bann von Fidolin/Admin)
  if (isDeviceBanned(deviceId)) {
    return NextResponse.json({ error: "Dieses Gerät ist für VibeVibo gesperrt." }, { status: 403 });
  }

  // 1) IP gesperrt?
  if (isIpBlocked(ip)) {
    return NextResponse.json({ error: "Registrierung von dieser Adresse ist nicht möglich." }, { status: 403 });
  }

  // 2) Rate-Limit gegen Massen-/Bot-Anmeldungen
  if (countRecentRegistrationsByIp(ip, HOUR) >= 3) {
    return NextResponse.json({ error: "Zu viele Anmeldungen. Bitte später erneut versuchen." }, { status: 429 });
  }
  if (countRecentRegistrationsByIp(ip, DAY) >= 8) {
    return NextResponse.json({ error: "Tageslimit für Anmeldungen erreicht." }, { status: 429 });
  }

  try {
    const { username, displayName, password, emoji } = await req.json();
    const user = createUser({ username, displayName, password, emoji, regIp: ip });
    recordDevice(deviceId, { userId: user.id, username: user.username, userAgent: req.headers.get("user-agent") || "", ip });
    // KEINE Session - User ist auf der Warteliste
    return NextResponse.json({
      waitlist: true,
      message: "Du stehst jetzt auf der Warteliste! Wir schalten dich frei, sobald du dran bist. 💌",
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Registrierung fehlgeschlagen." }, { status: 400 });
  }
}
