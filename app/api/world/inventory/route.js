import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getInventory } from "@/lib/db";
import { ITEMS } from "@/lib/world";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const raw = getInventory(me.id);
  const items = raw.map((r) => ({
    kind: r.kind, count: r.count,
    name: ITEMS[r.kind]?.name || r.kind,
    emoji: ITEMS[r.kind]?.emoji || "📦",
    description: ITEMS[r.kind]?.description || "",
    color: ITEMS[r.kind]?.color || "#999",
  }));
  return NextResponse.json({ items });
}
