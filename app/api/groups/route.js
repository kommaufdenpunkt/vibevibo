import { NextResponse } from "next/server";
import * as DB from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const COM_CREATE_COST = 500;

export async function GET(req) {
  const me = await getSessionUser();
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const sort = url.searchParams.get("sort") || "new";
  const groups = typeof DB.listGroupsExtended === "function"
    ? DB.listGroupsExtended({ category, sort })
    : typeof DB.listGroupsWithOwner === "function"
      ? DB.listGroupsWithOwner()
      : DB.listGroups();
  return NextResponse.json({
    groups,
    mine: me ? DB.getMyGroups(me.id) : [],
    createCost: COM_CREATE_COST,
    categories: DB.COM_CATEGORIES || [],
  });
}

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  try {
    const { slug, name, description, emoji } = await req.json();
    const spend = DB.spendCredits(me.id, COM_CREATE_COST, "com_create", { slug });
    if (!spend.ok) {
      return NextResponse.json({
        error: `Du brauchst ${COM_CREATE_COST} ✨ um eine Com zu gründen. Dir fehlen noch ${spend.missing} ✨.`,
      }, { status: 402 });
    }
    try {
      const g = DB.createGroup({ slug, name, description, emoji, ownerId: me.id });
      return NextResponse.json({ group: g, cost: COM_CREATE_COST });
    } catch (e) {
      DB.awardCredits(me.id, COM_CREATE_COST, "com_create_refund", { slug });
      throw e;
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
