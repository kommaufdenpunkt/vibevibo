import { cookies } from "next/headers";
import crypto from "node:crypto";

// Geräte-Kennung: langlebiges httpOnly-Cookie pro Browser/Gerät.
// Dient als Basis für den Geräte-Bann (kombiniert mit IP & User-Agent).
const COOKIE = "vv_device";
const FIVE_YEARS = 60 * 60 * 24 * 365 * 5;

export async function getOrCreateDeviceId() {
  const c = await cookies();
  let id = c.get(COOKIE)?.value;
  if (!id || id.length < 16) {
    id = crypto.randomBytes(16).toString("hex");
    c.set(COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // hinter Coolify/Traefik (TLS-Termination) sieht der Container HTTP
      path: "/",
      maxAge: FIVE_YEARS,
    });
  }
  return id;
}

export async function getDeviceId() {
  const c = await cookies();
  return c.get(COOKIE)?.value || null;
}

// Kurzes, lesbares Geräte-Label aus dem User-Agent (für die Admin-Ansicht).
export function deviceLabel(userAgent = "") {
  const ua = String(userAgent);
  let os = "Unbekannt";
  if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  let br = "Browser";
  if (/Edg\//i.test(ua)) br = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) br = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) br = "Safari";
  else if (/Firefox\//i.test(ua)) br = "Firefox";
  return `${br} · ${os}`;
}
