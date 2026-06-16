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
    if (!isOwner) return NextResponse.json({ error: "Nur der Besitzer kann Officer-Rollen vergeben." }, { status: 403 });
    const target = DB.getUserByUsername(body.targetUsername);
    if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
    if (target.id === me.id) return NextResponse.json({ error: "Dich selbst kannst du nicht promovieren/degradieren." }, { status: 400 });
    const newRole = action === "promote" ? "mod" : "member";
    const ok = DB.setComsRole(g.id, target.id, newRole);
    // Beim Promote: standardmäßig alle Standard-Officer-Rechte
    if (newRole === "mod" && typeof DB.setOfficerPerms === "function") {
      DB.setOfficerPerms(g.id, target.id, ["kick","delete-posts","pin-threads","lock-threads","delete-threads"]);
    }
    return NextResponse.json({ ok, newRole });
  }

  if (action === "set-perms") {
    if (!isOwner) return NextResponse.json({ error: "Nur der Besitzer kann Officer-Rechte ändern." }, { status: 403 });
    const target = DB.getUserByUsername(body.targetUsername);
    if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
    const targetRole = DB.getComsRole(g.id, target.id);
    if (targetRole !== "mod") return NextResponse.json({ error: "Nur Officer haben Rechte. Erst promoten." }, { status: 400 });
    const newPerms = DB.setOfficerPerms(g.id, target.id, Array.isArray(body.perms) ? body.perms : []);
    return NextResponse.json({ ok: true, perms: newPerms });
  }

  if (action === "transfer-owner") {
    if (!isOwner) return NextResponse.json({ error: "Nur der aktuelle Owner kann übergeben." }, { status: 403 });
    const target = DB.getUserByUsername(body.targetUsername);
    if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
    if (target.id === me.id) return NextResponse.json({ error: "An dich selbst kannst du nicht übergeben." }, { status: 400 });
    try {
      DB.transferComOwnership(g.id, me.id, target.id);
      return NextResponse.json({ ok: true, newOwner: target.username });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }

  if (action === "release-owner") {
    if (!isOwner) return NextResponse.json({ error: "Nur der Owner kann abdanken." }, { status: 403 });
    try {
      DB.releaseComOwnership(g.id, me.id);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }

  if (action === "claim-owner") {
    if (myRole !== "mod") return NextResponse.json({ error: "Nur Officer können besitzerlose Coms übernehmen." }, { status: 403 });
    try {
      DB.claimOrphanCom(g.id, me.id);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }

  if (action === "ban-user") {
    if (!isMod) return NextResponse.json({ error: "Nur Officer/Owner dürfen bannen." }, { status: 403 });
    const target = DB.getUserByUsername(body.targetUsername);
    if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
    const targetRole = DB.getComsRole(g.id, target.id);
    if (targetRole === "owner") return NextResponse.json({ error: "Owner kann nicht gebannt werden." }, { status: 400 });
    if (targetRole === "mod" && !isOwner) return NextResponse.json({ error: "Officer kann nur vom Owner gebannt werden." }, { status: 403 });
    DB.addComBan({ groupId: g.id, userId: target.id, bannedBy: me.id, reason: body.reason || "Bann durch " + (isOwner ? "Owner" : "Officer") });
    return NextResponse.json({ ok: true });
  }

  if (action === "unban-user") {
    if (!isMod) return NextResponse.json({ error: "Nur Officer/Owner dürfen entbannen." }, { status: 403 });
    const target = DB.getUserByUsername(body.targetUsername);
    if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
    DB.removeComBan(g.id, target.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "set-meta-ext") {
    if (!isOwner) return NextResponse.json({ error: "Nur Owner kann Meta-Daten setzen." }, { status: 403 });
    const ok = DB.setComMetaExtended(g.id, body.meta || {});
    return NextResponse.json({ ok });
  }

  if (action === "boost") {
    const v = Number(body.vibes);
    if (!Number.isFinite(v) || v < 1) return NextResponse.json({ error: "Ungültige Vibes-Anzahl" }, { status: 400 });
    const r = DB.boostCom({ groupId: g.id, userId: me.id, vibes: v });
    if (!r.ok) return NextResponse.json({ error: `Dir fehlen ${r.missing} ✨` }, { status: 402 });
    return NextResponse.json(r);
  }

  if (action === "news-create") {
    if (!isOwner && !DB.hasOfficerPerm(g.id, me.id, "post-news")) {
      return NextResponse.json({ error: "Du hast kein post-news-Recht." }, { status: 403 });
    }
    try {
      const id = DB.createComNews({ groupId: g.id, authorId: me.id, title: body.title, body: body.body });
      return NextResponse.json({ ok: true, id });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }

  if (action === "news-delete") {
    if (!isMod) return NextResponse.json({ error: "Nur Officer/Owner dürfen News löschen." }, { status: 403 });
    DB.deleteComNews(Number(body.newsId));
    return NextResponse.json({ ok: true });
  }

  if (action === "news-pin") {
    if (!isMod) return NextResponse.json({ error: "Nur Officer/Owner dürfen pinnen." }, { status: 403 });
    DB.pinComNews(Number(body.newsId), !!body.pinned);
    return NextResponse.json({ ok: true });
  }

  if (action === "clear-fidolin") {
    if (!isMod) return NextResponse.json({ error: "Nur Officer/Owner dürfen Fidolin overrulen." }, { status: 403 });
    DB.clearFidolinAction({ targetType: body.targetType, targetId: body.targetId });
    return NextResponse.json({ ok: true });
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

  // Officer-Permissions je Mod ermitteln
  const officerPerms = {};
  if (typeof DB.getOfficerPerms === "function") {
    for (const m of members) {
      if (m.role === "mod") {
        try { officerPerms[m.username] = DB.getOfficerPerms(g.id, m.userId); } catch {}
      }
    }
  }

  // Bans nur für Officer/Owner
  let bans = [];
  if (myRole === "owner" || myRole === "mod") {
    try { bans = DB.listComBans(g.id); } catch {}
  }

  // Custom Sparkles parsen
  let sparkles = [];
  try { sparkles = JSON.parse(g.sparkles || "[]"); } catch {}

  return NextResponse.json({
    group: {
      id: g.id, slug: g.slug, name: g.name, emoji: g.emoji,
      description: g.description, motto: g.motto, rules: g.rules,
      cover_emoji: g.cover_emoji, join_mode: g.join_mode, theme_color: g.theme_color,
      welcome_post: g.welcome_post,
      category: g.category || "sonstiges",
      sparkles,
      boost_until: g.boost_until || 0,
      boost_total: g.boost_total || 0,
      memberCount: g.memberCount, postCount: g.postCount,
      ownerUsername: g.ownerUsername, ownerDisplayName: g.ownerDisplayName,
      ownerless: g.owner_id == null,
    },
    myRole,
    members,
    officerPerms,
    availablePerms: DB.OFFICER_PERMS || [],
    bans,
    categories: DB.COM_CATEGORIES || [],
  });
}
