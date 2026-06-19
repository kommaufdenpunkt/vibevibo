import { NextResponse } from "next/server";
import {
  verifyPassword, sanctionTypes, isDeviceBanned,
  createMcpSession, deleteMcpSession, isModeratorRole, getUserRole,
} from "@/lib/db";
import { setMcpSessionCookie, clearMcpSessionCookie, audit } from "@/lib/modAuth";
import { getClientIp } from "@/lib/ip";
import { getOrCreateDeviceId } from "@/lib/device";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST { username, password } — Mod-Login
export async function POST(req) {
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") || "";
  const deviceId = await getOrCreateDeviceId();
  if (isDeviceBanned(deviceId)) {
    return NextResponse.json({ error: "Gerät gesperrt." }, { status: 403 });
  }
  let body = {};
  try { body = await req.json(); } catch {}
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!username || !password) {
    return NextResponse.json({ error: "Benutzername und Passwort nötig." }, { status: 400 });
  }
  const user = verifyPassword(username, password);
  if (!user) {
    return NextResponse.json({ error: "Falscher Benutzername oder Passwort." }, { status: 401 });
  }
  if (user.status === "blocked" || sanctionTypes(user.id).has("full")) {
    return NextResponse.json({ error: "Dein Zugang ist gesperrt." }, { status: 403 });
  }
  if (!isModeratorRole(user.id)) {
    return NextResponse.json({
      error: "Du hast keine Berechtigung für das Mod-Panel.",
    }, { status: 403 });
  }
  const token = createMcpSession(user.id, { ip, userAgent: ua });
  await setMcpSessionCookie(token);
  audit(user.id, "mcp.login", { details: `ip=${ip.slice(0, 16)}` });
  return NextResponse.json({
    ok: true,
    user: {
      id: user.id, username: user.username, displayName: user.displayName,
      role: getUserRole(user.id),
    },
  });
}

// DELETE — Logout
export async function DELETE(req) {
  // Token vor dem Löschen lesen, um die DB-Session zu entfernen
  const cookieHeader = req.headers.get("cookie") || "";
  const m = cookieHeader.match(/(?:^|;\s*)vv_mcp_session=([^;]+)/);
  if (m) {
    try { deleteMcpSession(m[1]); } catch {}
  }
  await clearMcpSessionCookie();
  return NextResponse.json({ ok: true });
}
