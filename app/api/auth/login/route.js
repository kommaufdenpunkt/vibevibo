import { NextResponse } from "next/server";
import { verifyPassword, createSession } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req) {
  try {
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
    const token = createSession(user.id);
    await setSessionCookie(token);
    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
