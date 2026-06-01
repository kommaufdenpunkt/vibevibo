import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listUserRoom, getUserRoomMeta, getInventory } from "@/lib/db";
import { FURNITURE_MAP, slotLayout, levelInfo, nextLevelInfo, timeOfDay } from "@/lib/room";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const meta = getUserRoomMeta(me.id);
  const li = levelInfo(meta.level);
  const next = nextLevelInfo(meta.level);
  const layout = slotLayout(li.capacity);

  const placed = listUserRoom(me.id).map((r) => {
    const def = FURNITURE_MAP[r.kind];
    const pos = layout[r.slot] || { x: 50, y: 50, area: "back" };
    return def ? {
      slot: r.slot, kind: r.kind, name: def.name, emoji: def.emoji,
      w: def.w, h: def.h, footprint: def.footprint,
      x: pos.x, y: pos.y, area: pos.area,
    } : null;
  }).filter(Boolean);

  // Inventar: nur Möbel-Items
  const inv = getInventory(me.id)
    .filter((i) => i.kind.startsWith("furn_") && i.count > 0)
    .map((i) => {
      const def = FURNITURE_MAP[i.kind];
      return def ? { kind: i.kind, name: def.name, emoji: def.emoji, count: i.count } : null;
    })
    .filter(Boolean);

  return NextResponse.json({
    meta: {
      level: meta.level,
      levelLabel: li.label,
      capacity: li.capacity,
      nextLevel: next ? { level: next.level, label: next.label, capacity: next.capacity, cost: next.upgradeCost } : null,
    },
    slots: layout,
    placed,
    inventory: inv,
    time: timeOfDay(),
  });
}
