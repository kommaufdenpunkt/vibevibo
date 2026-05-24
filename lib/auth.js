import { cookies } from "next/headers";
import { getUserBySession, touchUser } from "./db";

const COOKIE = "vv_session";

export async function getSessionUser() {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  const user = getUserBySession(token);
  if (user) touchUser(user.id);
  return user;
}

export async function setSessionCookie(token) {
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // hinter Coolify/Traefik (TLS-Termination) sieht der Container HTTP
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.set(COOKIE, "", { path: "/", maxAge: 0 });
}

export async function getSessionToken() {
  const c = await cookies();
  return c.get(COOKIE)?.value || null;
}
