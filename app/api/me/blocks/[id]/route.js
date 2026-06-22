// 🚫 Unblock — Block-Eintrag entfernen
// DELETE /api/me/blocks/[id]   (id = blocked_user_id)

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { unblockUser, listMyBlocks, countMyBlocks } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const params = await ctx.params;
  const blockedId = Number(params?.id);
  if (!blockedId) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  try {
    unblockUser(me.id, blockedId);
    return NextResponse.json({
      ok: true,
      blocks: listMyBlocks(me.id),
      count: countMyBlocks(me.id),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 400 });
  }
}
