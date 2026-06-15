import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import * as DB from "@/lib/db";

export const dynamic = "force-dynamic";

// POST { action: "promote"|"demote"|"kick"|"deletepost"|"meta", targetUsername?, postId?, meta?  }
export async function POST(req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { slug } = await params;
  const g = typeof DB.getComsBySlug === "function" ? DB.getComsBySlug(slug) : null;
  if (!g) {
    return NextResponse.json({
      error: "Gruppe nicht gefunden (Helper-Funktion fehlt? — patch-coms.mjs auf Server ausführen)",
    }, { status: 404 });
  }

  // Rolle des Aufrufenden pruefen
  const myRole = DB.getComsRole(g.id, me.id);
  if (!myRole) return NextResponse.json({ error: "Du bist kein Mitglied dieser Gruppe." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "").trim();

  // Owner darf alles, Mod darf alles ausser promote/demote/meta (nur Owner)
  const isOwner = myRole === "owner";
  const isMod = myRole === "mod" || isOwner;

  if (action === "promote" || action === "demote") {
    if (!isOwner) return NextResponse.json({ error: "Nur der Besitzer kann Mod-Rollen vergeben." }, { status: 403 });
    const target = DB.getUserByUsername(body.targetUsername);
    if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
    if (target.id === me.id) return NextResponse.json({ error: "Dich selbst kannst du nicht promovieren/degradieren." }, { status: 400 });
    const newRole = action === "promote" ? "mod" : "member";
    const ok = DB.setComsRole(g.id, target.id, newRole);
    return NextResponse.json({ ok, newRole });
  }

  if (action === "kick") {
    if (!isMod) return NextResponse.json({ error: "Nur Mods/Besitzer dürfen kicken." }, { status: 403 });
    const target = DB.getUserByUsername(body.targetUsername);
    if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
    const targetRole = DB.getComsRole(g.id, target.id);
    if (targetRole === "owner") return NextResponse.json({ error: "Besitzer kann nicht gekickt werden." }, { status: 400 });
    if (targetRole === "mod" && !isOwner) return NextResponse.json({ error: "Mods können nur vom Besitzer gekickt werden." }, { status: 403 });
    const ok = DB.kickComsMember(g.id, target.id);
    return NextResponse.json({ ok });
  }

  if (action === "deletepost") {
    if (!isMod) return NextResponse.json({ error: "Nur Mods/Besitzer dürfen löschen." }, { status: 403 });
    const postId = Number(body.postId);
    if (!postId) return NextResponse.json({ error: "postId fehlt" }, { status: 400 });
    const ok = DB.deleteComsPost(postId);
    return NextResponse.json({ ok });
  }

  if (action === "meta") {
    if (!isOwner) return NextResponse.json({ error: "Nur der Besitzer kann Meta-Daten ändern." }, { status: 403 });
    const m = body.meta || {};
    // Whitelist + Validierung
    const patch = {};
    if (typeof m.name === "string" && m.name.trim()) patch.name = m.name.trim().slice(0, 60);
    if (typeof m.description === "string") patch.description = m.description.slice(0, 800);
    if (typeof m.emoji === "string" && m.emoji.length <= 4) patch.emoji = m.emoji;
    if (typeof m.motto === "string") patch.motto = m.motto.slice(0, 200);
    if (typeof m.rules === "string") patch.rules = m.rules.slice(0, 2000);
    if (typeof m.cover_emoji === "string" && m.cover_emoji.length <= 4) patch.cover_emoji = m.cover_emoji;
    if (["open", "request", "invite"].includes(m.join_mode)) patch.join_mode = m.join_mode;
    if (typeof m.theme_color === "string" && /^#[0-9a-fA-F]{6}$/.test(m.theme_color)) patch.theme_color = m.theme_color;
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Keine gültigen Felder" }, { status: 400 });
    const ok = DB.updateComsMeta(g.id, patch);
    return NextResponse.json({ ok });
  }

  return NextResponse.json({ error: "Unbekannte Action" }, { status: 400 });
}

// GET = Members + meine Rolle
export async function GET(_req, { params }) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const { slug } = await params;
  const g = typeof DB.getComsBySlug === "function" ? DB.getComsBySlug(slug) : null;
  if (!g) return NextResponse.json({ error: "Gruppe nicht gefunden" }, { status: 404 });

  const myRole = DB.getComsRole(g.id, me.id);
  const members = typeof DB.getComsMembers === "function" ? DB.getComsMembers(g.id) : [];

  return NextResponse.json({
    group: {
      id: g.id, slug: g.slug, name: g.name, emoji: g.emoji,
      description: g.description, motto: g.motto, rules: g.rules,
      cover_emoji: g.cover_emoji, join_mode: g.join_mode, theme_color: g.theme_color,
      welcome_post: g.welcome_post,
      memberCount: g.memberCount, postCount: g.postCount,
      ownerUsername: g.ownerUsername, ownerDisplayName: g.ownerDisplayName,
    },
    myRole,
    members,
  });
}
