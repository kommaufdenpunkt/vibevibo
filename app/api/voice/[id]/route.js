import { NextResponse } from "next/server";
import { consumeMessage } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Markiert eine einmalig-anhörbare Sprachnachricht als verbraucht
// und löscht das Audio physisch aus der DB.
export async function POST(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await params;
  const ok = consumeMessage(Number(id), me.id);
  return NextResponse.json({ ok });
}
