// 🎀 OAuth-Onboarding speichern
//
// GET  → { needsOnboarding, username, displayName, avatarUrl, email }
// POST { username, displayName, avatarUrl? } → { ok }

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { completeOnboarding, getOnboardingNeeded, getUserById } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  return NextResponse.json({
    needsOnboarding: getOnboardingNeeded(me.id),
    username: me.username,
    displayName: me.displayName,
    avatarUrl: me.avatarUrl,
    email: me.email || "",
  });
}

export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  try {
    completeOnboarding(me.id, {
      username: body?.username,
      displayName: body?.displayName,
      avatarUrl: body?.avatarUrl,
    });
    const updated = getUserById(me.id);
    return NextResponse.json({ ok: true, user: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
