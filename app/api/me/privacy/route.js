import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";
import { privacyStatusForUser } from "@/lib/privacy";

export const dynamic = "force-dynamic";

// GET = aktueller Stand
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const u = DB.getUserById(me.id);
  return NextResponse.json({ privacy: privacyStatusForUser(u) });
}

// POST body: { dmPolicy?, wallPolicy?, hideVisits?, shieldMode? }
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const updateFn = DB.updateUserPrivacyV2 || DB.updateUserPrivacy;
  if (typeof updateFn !== "function") {
    return NextResponse.json({
      error: "Privacy-Helper fehlt — bitte `node scripts/patch-privacy.mjs` (V1) und `node scripts/patch-privacy-v2.mjs` (V2) auf dem Server ausführen",
    }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));

  // Whitelist
  const DM_VALS   = new Set(["open", "friends", "verified", "nobody"]);
  const WALL_VALS = new Set(["open", "friends", "nobody"]);

  const patch = {};
  if (typeof body.dmPolicy === "string" && DM_VALS.has(body.dmPolicy)) patch.dm_policy = body.dmPolicy;
  if (typeof body.wallPolicy === "string" && WALL_VALS.has(body.wallPolicy)) patch.wall_policy = body.wallPolicy;
  if (typeof body.hideVisits === "boolean") patch.hide_visits = body.hideVisits ? 1 : 0;
  if (typeof body.shieldMode === "boolean") patch.shield_mode = body.shieldMode ? 1 : 0;
  // V2-Felder
  if (body.quietFromHour === null || (Number.isInteger(body.quietFromHour) && body.quietFromHour >= 0 && body.quietFromHour <= 23)) {
    patch.quiet_from_hour = body.quietFromHour;
  }
  if (body.quietToHour === null || (Number.isInteger(body.quietToHour) && body.quietToHour >= 0 && body.quietToHour <= 23)) {
    patch.quiet_to_hour = body.quietToHour;
  }
  if (typeof body.strictFirstMsg === "boolean") patch.strict_first_msg = body.strictFirstMsg ? 1 : 0;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Keine gültigen Felder" }, { status: 400 });
  }

  updateFn(me.id, patch);
  const u = DB.getUserById(me.id);
  return NextResponse.json({ ok: true, privacy: privacyStatusForUser(u) });
}
