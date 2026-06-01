import { NextResponse } from "next/server";
import { getGroup, getGroupMembers, getGroupPosts, isMember } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(_req, { params }) {
  const { slug } = await params;
  const g = getGroup(slug);
  if (!g) return NextResponse.json({ error: "not found" }, { status: 404 });
  const me = await getSessionUser();
  return NextResponse.json({
    group: g,
    members: getGroupMembers(g.id),
    posts: getGroupPosts(g.id),
    isMember: me ? isMember(g.id, me.id) : false,
  });
}
