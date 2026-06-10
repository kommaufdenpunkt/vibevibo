import { encryptToken, decryptToken } from "@/lib/db";

// Verschluesselter Onboarding-Payload (im Cookie).
// 30 Min TTL ab Erstellung, AES-GCM via tokenKey().
export function signPayload(obj) {
  const data = { ...obj, expiresAt: Date.now() + 30 * 60 * 1000 };
  return encryptToken(JSON.stringify(data));
}

export function verifyPayload(token) {
  if (!token) return null;
  try {
    const json = decryptToken(token);
    if (!json) return null;
    const data = JSON.parse(json);
    if (!data || typeof data !== "object") return null;
    if (!data.expiresAt || data.expiresAt < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export const ONBOARD_COOKIE = "vv_social_onboard";
