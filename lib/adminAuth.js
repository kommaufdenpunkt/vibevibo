// 🔐 Admin-Auth — separater Login auf admin.vibevibo.de mit eigenem Cookie.
// Bewusste Trennung von MCP: Defense-in-Depth.
// Reuses MCP-Session-Tabelle in der DB (createMcpSession/getMcpSessionUser),
// aber mit anderem Cookie-Namen, damit Sessions Subdomain-isoliert sind.

import { cookies } from "next/headers";
import {
  getMcpSessionUser,
  isAdminRole,
  logMcpAction,
} from "./db";

const COOKIE = "vv_admin_session";

export async function getAdminUser() {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  const user = getMcpSessionUser(token);
  if (!user) return null;
  // 🛡 Nur Admins+ dürfen hier rein — STRENGER als MCP (Mods reichen NICHT).
  if (!isAdminRole(user.id)) return null;
  return user;
}

export async function setAdminSessionCookie(token) {
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",   // 🛡 strikt: nie cross-site übertragen
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    // Kein `domain`-Attribut → Host-Only Cookie. Bleibt auf admin.vibevibo.de
    // und leakt nicht zu anderen Subdomains.
  });
}

export async function clearAdminSessionCookie() {
  const c = await cookies();
  c.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function requireAdminUser() {
  const u = await getAdminUser();
  if (!u) throw new Error("admin-auth-required");
  return u;
}

export function auditAdmin(userId, actionType, { details = "" } = {}) {
  try {
    logMcpAction({ modId: userId, actionType: `admin.${actionType}`, details });
  } catch {}
}
