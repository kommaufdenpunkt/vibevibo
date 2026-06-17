import { NextResponse } from "next/server";
import * as DB from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const COM_CREATE_COST = 500;

export async function GET(req) {
  const me = await getSessionUser();
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const sort = url.searchParams.get("sort") || "new";

  // Robust mit mehrstufigem Fallback — listGroupsExtended hat Schema-Probleme
  // (siehe coms-debug), nutzen wir listGroupsWithOwner als primäre Quelle.
  let groups = [];
  try {
    if (typeof DB.listGroupsWithOwner === "function") {
      groups = DB.listGroupsWithOwner();
    } else if (typeof DB.listGroupsExtended === "function") {
      groups = DB.listGroupsExtended({ category, sort });
    } else {
      groups = DB.listGroups();
    }
    // Kategorie-Filter im JS anwenden (falls Spalte da ist)
    if (category && groups.length > 0 && groups[0].category) {
      groups = groups.filter((g) => (g.category || "sonstiges") === category);
    }
    // Sort im JS anwenden
    if (sort === "members") {
      groups.sort((a, b) => (b.member_count || 0) - (a.member_count || 0));
    } else if (sort === "trending") {
      const now = Date.now();
      groups.sort((a, b) => {
        const ab = (a.boostUntil || 0) > now ? 1 : 0;
        const bb = (b.boostUntil || 0) > now ? 1 : 0;
        if (ab !== bb) return bb - ab;
        return (b.at || 0) - (a.at || 0);
      });
    }
    // "new" ist Default-Sort der Queries
  } catch (e1) {
    console.error("[groups] primary list failed:", e1.message);
    try {
      groups = DB.listGroups();
    } catch { groups = []; }
  }

  let mine = [];
  try {
    if (me) mine = DB.getMyGroups(me.id) || [];
  } catch (e) {
    console.error("[groups] getMyGroups failed:", e.message);
  }
  // Fallback: wenn getMyGroups leer ist, suche nach owner_id-Match in groups
  if (me && mine.length === 0 && groups.length > 0) {
    const ownerName = me.username;
    const ownedByMe = groups.filter((g) => g.owner_username === ownerName);
    if (ownedByMe.length > 0) {
      mine = ownedByMe.map((g) => ({
        id: g.id, slug: g.slug, name: g.name, emoji: g.emoji, role: "owner",
      }));
    }
  }

  return NextResponse.json({
    groups,
    mine,
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
