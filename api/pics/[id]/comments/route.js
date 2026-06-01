import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProfilePic, getPicComments, addPicComment } from "@/lib/db";
import { checkTextPost, isMuted } from "@/lib/moderate";

export async function GET(_req, { params }) {
  const { id } = await params;
  const pic = getProfilePic(Number(id));
  if (!pic) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ comments: getPicComments(Number(id)) });
}

export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (isMuted(me.id)) return NextResponse.json({ error: "Du hast aktuell einen Kommunikationsbann." }, { status: 403 });
  const { id } = await params;
  const picId = Number(id);
  const pic = getProfilePic(picId);
  if (!pic || pic.status !== "approved") return NextResponse.json({ error: "Bild nicht verfügbar." }, { status: 404 });

  const body = await req.json();
  const text = String(body.text || "").trim().slice(0, 1000);
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });

  // Antwort-Ebene: parent muss zum selben Bild gehören und selbst Top-Level sein
  let parentId = null;
  if (body.parentId) {
    const parent = getPicComments(picId).find((c) => c.id === Number(body.parentId));
    if (parent) parentId = parent.parentId ? parent.parentId : parent.id;
  }

  const verdict = await checkTextPost(me.id, "bildkommentar", text);
  if (!verdict.ok) return NextResponse.json({ error: `Fidolin hat das blockiert: ${verdict.reason}` }, { status: 422 });

  addPicComment(picId, me.id, text, parentId);
  return NextResponse.json({ comments: getPicComments(picId) });
}
