import { NextResponse } from "next/server";
import { createUser, isIpBlocked, countRecentRegistrationsByIp, isDeviceBanned, recordDevice, addProfilePic, MAX_PROFILE_PICS } from "@/lib/db";
import { getClientIp } from "@/lib/ip";
import { getOrCreateDeviceId } from "@/lib/device";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const MAX_IMG_BYTES = 700_000;
const IMG_RE = /^data:image\/(png|jpeg|jpg|webp);base64,/;

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
    const { username, displayName, password, emoji, images } = await req.json();
    const user = createUser({ username, displayName, password, emoji, regIp: ip });
    recordDevice(deviceId, { userId: user.id, username: user.username, userAgent: req.headers.get("user-agent") || "", ip });

    // Optional bei der Registrierung hochgeladene Profilbilder -> in Prüfung (Fidolin/Moderation)
    if (Array.isArray(images)) {
      let n = 0;
      for (const img of images) {
        if (n >= MAX_PROFILE_PICS) break;
        const s = String(img || "");
        if (IMG_RE.test(s) && s.length <= MAX_IMG_BYTES) {
          addProfilePic(user.id, s, "pending", "Bei Registrierung – wartet auf Freigabe");
          n++;
        }
      }
    }

    // KEINE Session - User ist auf der Warteliste
    return NextResponse.json({
      waitlist: true,
      message: "Du stehst jetzt auf der Warteliste! Wir schalten dich frei, sobald du dran bist. 💌",
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Registrierung fehlgeschlagen." }, { status: 400 });
  }
}
