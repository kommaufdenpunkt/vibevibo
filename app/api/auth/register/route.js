import { NextResponse } from "next/server";
import { createUser, createSession } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req) {
  try {
    const { username, displayName, password, emoji } = await req.json();
    const user = createUser({ username, displayName, password, emoji });
    const token = createSession(user.id);
    await setSessionCookie(token);
    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Registrierung fehlgeschlagen." }, { status: 400 });
  }
}
