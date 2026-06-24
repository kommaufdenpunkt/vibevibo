// Admin-only Dev-Tool: legt ein Test-Bild in die Moderations-Queue.
// Ersetzt das CLI-Script für schnelle End-to-End-Tests, ohne in den
// Coolify-Container einsteigen zu müssen.
//
// POST /api/adminpanel/dev/seed-test-image
// Body (optional): { userId?: number, sourceType?: string, imageUrl?: string }

import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/adminAuth";
import { enqueueImageForReview } from "@/lib/imageModeration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  const me = await getAdminUser();
  if (!me) {
    return NextResponse.json({ error: "Admin-Login nötig." }, { status: 401 });
  }

  let body = {};
  try { body = await req.json(); } catch {}

  const userId = Number.isInteger(body.userId) && body.userId > 0
    ? body.userId
    : me.id;
  const sourceType = typeof body.sourceType === "string" ? body.sourceType : "profile";
  const seed = `dev-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const imageUrl = typeof body.imageUrl === "string" && body.imageUrl.startsWith("http")
    ? body.imageUrl
    : `https://picsum.photos/seed/${seed}/600/800`;

  try {
    const queueId = enqueueImageForReview({
      imageUrl,
      sourceType,
      uploadedByUserId: userId,
      fidolinAuto: false,
    });
    return NextResponse.json({
      ok: true,
      queueId,
      userId,
      imageUrl,
      sourceType,
      hint: "Sichtbar im Bildertool auf mcp.vibevibo.de/mcp/bilder",
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Insert fehlgeschlagen." }, { status: 500 });
  }
}
