#!/usr/bin/env node
// 🤝 Com-Meetups — echte Treffen mit Ort, Datum, Zusagen (yes/no/maybe).

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const DB_PATH = join(ROOT, "lib", "db.js");

const MARK_TABLE = "/* 🤝 COM_MEETUPS_TABLE_V1 */";
const MARK_FN = "// 🤝 COM_MEETUPS_FN_V1";

let src = readFileSync(DB_PATH, "utf-8");
let changed = false;

if (!src.includes(MARK_TABLE)) {
  const ANCHOR = "CREATE TABLE IF NOT EXISTS group_posts (";
  if (!src.includes(ANCHOR)) {
    console.error("✗ Anker group_posts nicht gefunden");
    process.exit(1);
  }
  const INJECT = `${MARK_TABLE}
    CREATE TABLE IF NOT EXISTS com_meetups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      host_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      location TEXT NOT NULL,
      starts_at INTEGER NOT NULL,
      ends_at INTEGER,
      max_attendees INTEGER DEFAULT 0,
      cancelled INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_com_meetups_group ON com_meetups(group_id, starts_at DESC);

    CREATE TABLE IF NOT EXISTS com_meetup_rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meetup_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'yes',
      created_at INTEGER NOT NULL,
      UNIQUE(meetup_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_com_meetup_rsvps ON com_meetup_rsvps(meetup_id, status);

    ${ANCHOR}`;
  src = src.replace(ANCHOR, INJECT);
  changed = true;
  console.log("✓ com_meetups + com_meetup_rsvps Tabellen ergänzt.");
}

if (!src.includes(MARK_FN)) {
  const FN = `

${MARK_FN}
// 🤝 Meetup-Helpers

function _parseMeetupRow(r, byUserId = null) {
  if (!r) return null;
  const counts = db().prepare(\`
    SELECT status, COUNT(*) AS c FROM com_meetup_rsvps WHERE meetup_id = ? GROUP BY status
  \`).all(r.id);
  const countMap = { yes: 0, no: 0, maybe: 0 };
  for (const c of counts) countMap[c.status] = c.c;
  let myRsvp = null;
  if (byUserId) {
    const rs = db().prepare("SELECT status FROM com_meetup_rsvps WHERE meetup_id = ? AND user_id = ?")
      .get(Number(r.id), Number(byUserId));
    if (rs) myRsvp = rs.status;
  }
  return {
    id: r.id,
    groupId: r.group_id,
    hostId: r.host_id,
    hostUsername: r.host_username || null,
    hostDisplayName: r.host_display_name || null,
    hostEmoji: r.host_emoji || null,
    title: r.title,
    description: r.description || "",
    location: r.location,
    startsAt: r.starts_at,
    endsAt: r.ends_at || null,
    maxAttendees: r.max_attendees || 0,
    cancelled: !!r.cancelled,
    createdAt: r.created_at,
    rsvpCounts: countMap,
    myRsvp,
  };
}

export function createComMeetup({ groupId, hostId, title, description, location, startsAt, endsAt, maxAttendees }) {
  const t = String(title || "").trim();
  if (!t) throw new Error("Titel fehlt.");
  if (t.length > 160) throw new Error("Titel zu lang (max 160 Zeichen).");
  const loc = String(location || "").trim();
  if (!loc) throw new Error("Treffpunkt fehlt.");
  if (loc.length > 240) throw new Error("Treffpunkt zu lang (max 240 Zeichen).");
  const desc = String(description || "").trim().slice(0, 2000);
  const ts = Number(startsAt);
  if (!Number.isFinite(ts) || ts < Date.now() - 24 * 3600 * 1000) {
    throw new Error("Startzeit fehlt oder liegt in der Vergangenheit.");
  }
  const te = endsAt ? Number(endsAt) : null;
  if (te && te < ts) throw new Error("Endzeit liegt vor Startzeit.");
  const max = Math.max(0, Math.min(500, Number(maxAttendees) || 0));
  const info = db().prepare(\`
    INSERT INTO com_meetups (group_id, host_id, title, description, location, starts_at, ends_at, max_attendees, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  \`).run(Number(groupId), Number(hostId), t.slice(0, 160), desc, loc.slice(0, 240),
    ts, te, max, Date.now());
  return info.lastInsertRowid;
}

export function getComMeetup(meetupId, { byUserId = null } = {}) {
  const r = db().prepare(\`
    SELECT m.*, u.username AS host_username, u.display_name AS host_display_name, u.emoji AS host_emoji
      FROM com_meetups m LEFT JOIN users u ON u.id = m.host_id
     WHERE m.id = ?
  \`).get(Number(meetupId));
  return _parseMeetupRow(r, byUserId);
}

export function listComMeetups(groupId, { limit = 30, byUserId = null } = {}) {
  const rows = db().prepare(\`
    SELECT m.*, u.username AS host_username, u.display_name AS host_display_name, u.emoji AS host_emoji
      FROM com_meetups m LEFT JOIN users u ON u.id = m.host_id
     WHERE m.group_id = ?
     ORDER BY
       CASE WHEN m.starts_at >= ? AND m.cancelled = 0 THEN 0 ELSE 1 END,
       m.starts_at ASC
     LIMIT ?
  \`).all(Number(groupId), Date.now() - 24 * 3600 * 1000, Number(limit));
  return rows.map((r) => _parseMeetupRow(r, byUserId));
}

export function setMeetupRsvp(meetupId, userId, status) {
  const allowed = new Set(["yes", "no", "maybe", "none"]);
  if (!allowed.has(status)) throw new Error("Ungültiger RSVP-Status.");
  const m = db().prepare("SELECT cancelled, max_attendees FROM com_meetups WHERE id = ?").get(Number(meetupId));
  if (!m) throw new Error("Meetup existiert nicht.");
  if (m.cancelled) throw new Error("Meetup wurde abgesagt.");

  if (status === "none") {
    db().prepare("DELETE FROM com_meetup_rsvps WHERE meetup_id = ? AND user_id = ?")
      .run(Number(meetupId), Number(userId));
    return { status: null };
  }

  // Max-Attendees-Check nur für status='yes' und nur wenn nicht schon zugesagt
  if (status === "yes" && m.max_attendees > 0) {
    const existing = db().prepare("SELECT status FROM com_meetup_rsvps WHERE meetup_id = ? AND user_id = ?")
      .get(Number(meetupId), Number(userId));
    if (!existing || existing.status !== "yes") {
      const yesCount = db().prepare("SELECT COUNT(*) AS c FROM com_meetup_rsvps WHERE meetup_id = ? AND status = 'yes'")
        .get(Number(meetupId)).c || 0;
      if (yesCount >= m.max_attendees) {
        throw new Error("Meetup ist voll — versuch's mit „Vielleicht“.");
      }
    }
  }

  const now = Date.now();
  db().prepare(\`
    INSERT INTO com_meetup_rsvps (meetup_id, user_id, status, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(meetup_id, user_id) DO UPDATE SET status = excluded.status
  \`).run(Number(meetupId), Number(userId), status, now);
  return { status };
}

export function listMeetupAttendees(meetupId, { status = "yes", limit = 100 } = {}) {
  return db().prepare(\`
    SELECT u.id AS userId, u.username, u.display_name AS displayName, u.emoji,
           u.avatar_url AS avatarUrl, u.avatar_status AS avatarStatus,
           r.status, r.created_at AS rsvpAt
      FROM com_meetup_rsvps r JOIN users u ON u.id = r.user_id
     WHERE r.meetup_id = ? AND r.status = ?
     ORDER BY r.created_at ASC
     LIMIT ?
  \`).all(Number(meetupId), String(status), Number(limit))
    .map((row) => ({
      ...row,
      avatarUrl: row.avatarStatus === "approved" ? row.avatarUrl : "",
    }));
}

export function getComMeetupHost(meetupId) {
  const r = db().prepare("SELECT host_id, group_id FROM com_meetups WHERE id = ?").get(Number(meetupId));
  return r ? { hostId: r.host_id, groupId: r.group_id } : null;
}

export function cancelComMeetup(meetupId) {
  db().prepare("UPDATE com_meetups SET cancelled = 1 WHERE id = ?").run(Number(meetupId));
}

export function deleteComMeetup(meetupId) {
  const tx = db().transaction(() => {
    db().prepare("DELETE FROM com_meetup_rsvps WHERE meetup_id = ?").run(Number(meetupId));
    db().prepare("DELETE FROM com_meetups WHERE id = ?").run(Number(meetupId));
  });
  tx();
}
`;
  src += FN;
  changed = true;
  console.log("✓ Meetup-Helpers angefügt.");
}

if (changed) {
  writeFileSync(DB_PATH, src);
  console.log("\\n✓ db.js gepatched.");
} else {
  console.log("\\n✓ Nichts zu tun.");
}
