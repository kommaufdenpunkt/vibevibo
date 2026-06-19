// ⚡ MCP-Auth — separater Login auf mcp.vibevibo.de mit eigenem Cookie.
import { cookies } from "next/headers";
import {
  getMcpSessionUser, isModeratorRole, isTeamleitungRole, isAdminRole,
  logMcpAction,
} from "./db";

const COOKIE = "vv_mcp_session";

export async function getMcpUser() {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  const user = getMcpSessionUser(token);
  if (!user) return null;
  // Nur Mods/Teamleitungen/Admins haben hier was zu suchen.
  if (!isModeratorRole(user.id)) return null;
  return user;
}

export async function setMcpSessionCookie(token) {
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearMcpSessionCookie() {
  const c = await cookies();
  c.set(COOKIE, "", { path: "/", maxAge: 0 });
}

export async function requireMcpUser() {
  const u = await getMcpUser();
  if (!u) throw new Error("mod-auth-required");
  return u;
}

export async function requireTeamleitung() {
  const u = await getMcpUser();
  if (!u) throw new Error("mod-auth-required");
  if (!isTeamleitungRole(u.id)) throw new Error("teamleitung-required");
  return u;
}

export async function requireMcpAdmin() {
  const u = await getMcpUser();
  if (!u) throw new Error("mod-auth-required");
  if (!isAdminRole(u.id)) throw new Error("admin-required");
  return u;
}

// 🛡 Public face — wie Mods nach außen erscheinen
export const MOD_PUBLIC_NAME = "VibeVibo-Team";

// Audit-Helper
export function audit(modId, actionType, opts = {}) {
  try {
    logMcpAction({
      modId, actionType,
      targetType: opts.targetType || null,
      targetId: opts.targetId || null,
      details: opts.details || "",
      viewedOnly: !!opts.viewedOnly,
    });
  } catch {}
}

// 🔒 PRIVACY-REGEL: Normale Mods dürfen NICHT die eigene Akte einsehen,
// NICHT die Akten anderer Moderatoren. Teamleitungen + Admin dürfen alles.
export function canViewAkte(modUser, targetUserId) {
  if (!modUser) return false;
  const tid = Number(targetUserId);
  // Teamleitung + Admin sehen alles (auch Akten von anderen Mods und sich selbst — für Audit)
  if (isTeamleitungRole(modUser.id)) return true;
  // Normale Mods: eigene Akte ist gesperrt
  if (modUser.id === tid) return false;
  // Normale Mods: Akten von anderen Mods sind gesperrt
  if (isModeratorRole(tid)) return false;
  return true;
}

// Variante für Audit-Trail (wer-hat-was-gemacht-Liste):
// Normale Mods sehen NUR ihre eigenen Aktionen. Teamleitungen sehen alles.
export function canViewModAudit(viewerUser, targetModId) {
  if (!viewerUser) return false;
  if (isTeamleitungRole(viewerUser.id)) return true;
  // Normale Mods sehen nur die eigenen Logs
  return viewerUser.id === Number(targetModId);
}
