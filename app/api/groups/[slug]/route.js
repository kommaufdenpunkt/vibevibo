import { NextResponse } from "next/server";
import {
  getGroup, getGroupMembers, getGroupPosts, isMember,
  blockedUserIdsFor,
} from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(_req, { params }) {
  const { slug } = await params;
  const g = getGroup(slug);
  if (!g) return NextResponse.json({ error: "not found" }, { status: 404 });
  const me = await getSessionUser();

  const allMembers = getGroupMembers(g.id);
  const allPosts = getGroupPosts(g.id);

  // 🚫 Block-Filter: blockierte User aus Mitgliederliste + Posts entfernen (bilateral)
  const hidden = me ? blockedUserIdsFor(me.id) : new Set();
  const filterById = (rows) => rows.filter((r) => {
    const uid = Number(r?.userId ?? r?.user_id ?? r?.id ?? r?.authorId ?? 0);
    return !uid || !hidden.has(uid);
  });
  const members = hidden.size === 0 ? allMembers : filterById(allMembers);
  const posts = hidden.size === 0 ? allPosts : filterById(allPosts);

  return NextResponse.json({
    group: g,
    members,
    posts,
    isMember: me ? isMember(g.id, me.id) : false,
  });
}
