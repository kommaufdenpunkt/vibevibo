import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { updateUser, addStatusUpdate } from "@/lib/db";

// Status setzen (vorgefertigt). optional oeffentlich in den Buschfunk posten.
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json();
  const text = String(body.text || "").trim().slice(0, 60);
  updateUser(me.id, { mood: text });
  if (body.public && text) addStatusUpdate(me.id, text);
  return NextResponse.json({ ok: true, mood: text });
}
