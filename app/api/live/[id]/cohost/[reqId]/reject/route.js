import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { rejectHostRequest, publishLive } from "@/lib/db";

export async function POST(_req, ctx) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id, reqId } = await ctx.params;
  try {
    rejectHostRequest(Number(id), Number(reqId), me.id);
    publishLive(Number(id), "cohost_decided", { requestId: Number(reqId), approved: false });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
