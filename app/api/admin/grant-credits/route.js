import { NextResponse } from "next/server";
import { isAdminRequest, adminEnabled } from "@/lib/admin";
import { adminGrantCredits, getUserByUsername, getCredits } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST { username, amount, reason? } — gewährt einem User Vibes.
// Auth: VV_ADMIN_PASSWORD im Header X-Admin-Password oder ?pw=
export async function POST(req) {
  if (!adminEnabled()) return NextResponse.json({ error: "admin disabled" }, { status: 503 });
  if (!isAdminRequest(req)) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const amount = Number(body.amount);
  const reason = String(body.reason || "admin_grant").slice(0, 80);

  if (!username) return NextResponse.json({ error: "username fehlt" }, { status: 400 });
  if (!Number.isFinite(amount) || amount === 0) {
    return NextResponse.json({ error: "amount muss eine Zahl ungleich 0 sein" }, { status: 400 });
  }
  if (Math.abs(amount) > 100000) {
    return NextResponse.json({ error: "amount zu groß (max ±100000)" }, { status: 400 });
  }

  const user = getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "user nicht gefunden" }, { status: 404 });

  adminGrantCredits(user.id, amount, reason);
  const c = getCredits(user.id);
  return NextResponse.json({
    ok: true,
    username,
    granted: amount,
    newBalance: c.balance,
    reason,
  });
}
