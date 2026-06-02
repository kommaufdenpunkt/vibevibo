import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getInventory } from "@/lib/db";
import { ITEMS } from "@/lib/world";

// Zusätzliche Inventar-Kinds, die nicht auf der Karte spawnen (z.B. Angeln).
const EXTRA = {
  fish:        { name: "Fische",        emoji: "🐟", color: "#38bdf8", description: "Beim Angeln gefangen" },
  fish_trophy: { name: "Angel-Trophäen", emoji: "🏆", color: "#fbbf24", description: "Seltene Fänge (Goldfisch, Schatz)" },
};

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const raw = getInventory(me.id);
  // Möbel (furn_*) gehören ins Zimmer, nicht ins Welt-Inventar → ausblenden
  const items = raw
    .filter((r) => !r.kind.startsWith("furn_"))
    .map((r) => {
      const def = ITEMS[r.kind] || EXTRA[r.kind] || {};
      return {
        kind: r.kind, count: r.count,
        name: def.name || r.kind,
        emoji: def.emoji || "📦",
        description: def.description || "",
        color: def.color || "#999",
      };
    });
  return NextResponse.json({ items });
}
