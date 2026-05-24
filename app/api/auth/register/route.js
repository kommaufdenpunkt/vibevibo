import { NextResponse } from "next/server";
import { createUser, isIpBlocked, countRecentRegistrationsByIp } from "@/lib/db";
import { getClientIp } from "@/lib/ip";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

export async function POST(req) {
  const ip = getClientIp(req);

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
    createUser({ username, displayName, password, emoji, regIp: ip });
    // KEINE Session - User ist auf der Warteliste
    return NextResponse.json({
      waitlist: true,
      message: "Du stehst jetzt auf der Warteliste! Wir schalten dich frei, sobald du dran bist. 💌",
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Registrierung fehlgeschlagen." }, { status: 400 });
  }
}
