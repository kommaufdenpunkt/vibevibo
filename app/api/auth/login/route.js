import { NextResponse } from "next/server";
import { verifyPassword, createSession, isDeviceBanned, recordDevice, sanctionTypes } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { getOrCreateDeviceId } from "@/lib/device";
import { getClientIp } from "@/lib/ip";

export async function POST(req) {
  try {
    const deviceId = await getOrCreateDeviceId();
    if (isDeviceBanned(deviceId)) {
      return NextResponse.json({ error: "Dieses Gerät ist für VibeVibo gesperrt." }, { status: 403 });
    }

    const { username, password } = await req.json();
    const user = verifyPassword(username, password);
    if (!user) {
      return NextResponse.json({ error: "Falscher Benutzername oder Passwort." }, { status: 401 });
    }
    if (user.status === "pending") {
      return NextResponse.json({ error: "Du stehst noch auf der Warteliste – wir schalten dich bald frei! 💌" }, { status: 403 });
    }
    if (user.status === "blocked") {
      return NextResponse.json({ error: "Dieser Account wurde gesperrt." }, { status: 403 });
    }
    // Komplett-Bann (full) sperrt den Login
    if (sanctionTypes(user.id).has("full")) {
      return NextResponse.json({ error: "Dein Zugang ist aktuell gesperrt." }, { status: 403 });
    }

    recordDevice(deviceId, { userId: user.id, username: user.username, userAgent: req.headers.get("user-agent") || "", ip: getClientIp(req) });
    const token = createSession(user.id);
    await setSessionCookie(token);
    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
