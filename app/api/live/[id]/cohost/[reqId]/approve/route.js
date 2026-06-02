import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { approveHostRequest, publishLive } from "@/lib/db";

export async function POST(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id, reqId } = await ctx.params;
  try {
    const r = approveHostRequest(Number(id), Number(reqId), me.id);
    publishLive(Number(id), "cohost_decided", { requestId: Number(reqId), approved: true, userId: r.userId });
    publishLive(Number(id), "host", { userId: r.userId, joined: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
