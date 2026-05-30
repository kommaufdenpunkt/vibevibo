import { NextResponse } from "next/server";
import {
  createUser, isIpBlocked, countRecentRegistrationsByIp, isDeviceBanned, recordDevice,
  addProfilePic, MAX_PROFILE_PICS, audit,
} from "@/lib/db";
import { getClientIp } from "@/lib/ip";
import { getOrCreateDeviceId } from "@/lib/device";
import { checkIpReputation, shouldBlockByIntel } from "@/lib/ipIntel";
import { rateLimit } from "@/lib/rateLimit";
import { isPwnedPassword } from "@/lib/pwnedPasswords";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const MAX_IMG_BYTES = 700_000;
const IMG_RE = /^data:image\/(png|jpeg|jpg|webp);base64,/;

export async function POST(req) {
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") || "";
  const deviceId = await getOrCreateDeviceId();

  // 0) Gerät gesperrt?
  if (isDeviceBanned(deviceId)) {
    audit({ action: "register.device_banned", ip, ua });
    return NextResponse.json({ error: "Dieses Gerät ist für VibeVibo gesperrt." }, { status: 403 });
  }

  // 1) IP-Sperre / Rate-Limit
  if (isIpBlocked(ip)) {
    return NextResponse.json({ error: "Registrierung von dieser Adresse ist nicht möglich." }, { status: 403 });
  }
  const ipLimit = rateLimit(`register:ip:${ip}`, 5, HOUR);
  if (!ipLimit.allowed) {
    audit({ action: "register.ratelimit", ip, ua });
    return NextResponse.json({ error: "Zu viele Registrierungs-Versuche. Bitte später erneut." }, { status: 429 });
  }
  if (countRecentRegistrationsByIp(ip, HOUR) >= 3) {
    return NextResponse.json({ error: "Zu viele Anmeldungen. Bitte später erneut versuchen." }, { status: 429 });
  }
  if (countRecentRegistrationsByIp(ip, DAY) >= 8) {
    return NextResponse.json({ error: "Tageslimit für Anmeldungen erreicht." }, { status: 429 });
  }

  // 2) IP-Reputation — bei Registrierung STRICT: kein VPN/Proxy/Tor/Hoster
  const intel = await checkIpReputation(ip);
  if (shouldBlockByIntel(intel, { strict: true })) {
    audit({ action: "register.bad_ip", ip, ua, detail: `vpn=${intel.isVpn},tor=${intel.isTor},proxy=${intel.isProxy},host=${intel.isHosting},risk=${intel.riskScore}` });
    return NextResponse.json({
      error: "Registrierung aus VPN/Proxy/Tor-Netzen nicht erlaubt. Bitte mit normaler Internet-Verbindung anmelden.",
    }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { username, displayName, password, emoji, images, gender, birthdate } = body;

    // 3) Honeypot: versteckte Felder die nur Bots ausfüllen
    if (body?.website || body?.confirmEmail || body?.fax) {
      audit({ action: "register.honeypot", ip, ua, detail: `username=${username}` });
      // Vortäuschen dass es geklappt hat — Bot bekommt keine Info
      return NextResponse.json({ waitlist: true, message: "Du stehst jetzt auf der Warteliste!" });
    }

    // 4) Pwned-Password-Check (haveibeenpwned k-Anonymity)
    const pwn = await isPwnedPassword(password);
    if (pwn.pwned) {
      audit({ action: "register.pwned_pw", ip, ua, detail: `count=${pwn.count}` });
      return NextResponse.json({
        error: `Dieses Passwort taucht in bekannten Datenlecks ${pwn.count}× auf. Bitte ein anderes wählen — z.B. mit einem Passwort-Manager.`,
      }, { status: 400 });
    }

    const user = createUser({ username, displayName, password, emoji, regIp: ip, gender, birthdate });
    recordDevice(deviceId, { userId: user.id, username: user.username, userAgent: ua, ip });
    audit({ userId: user.id, action: "register", ip, ua, detail: `username=${user.username}` });

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

    return NextResponse.json({
      waitlist: true,
      message: "Du stehst jetzt auf der Warteliste! Wir schalten dich frei, sobald du dran bist. 💌",
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Registrierung fehlgeschlagen." }, { status: 400 });
  }
}
