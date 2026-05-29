"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { relTime } from "@/lib/format";
import { useMessageStream } from "@/lib/useEventStream";
import Avatar from "@/components/Avatar";
import PresenceAvatar from "@/components/PresenceAvatar";
import { ColoredName } from "@/components/GenderAge";
import { getPresence } from "@/lib/presence";

function RoomMosaicAvatar({ room }) {
  const members = (room.members || []).slice(0, 4);
  if (!members.length) {
    return (
      <div className="vv-avatar vv-avatar-sm" style={{ background: "linear-gradient(135deg,#a1c4fd,#c2e9fb)", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {room.emoji || "💬"}
      </div>
    );
  }
  if (members.length === 1) {
    return <Avatar url={members[0].avatarUrl} name={members[0].displayName} className="vv-avatar vv-avatar-sm" />;
  }
  // 2-4 Mitglieder als Mosaik
  const cols = members.length === 2 ? "1fr 1fr" : "1fr 1fr";
  const rows = members.length === 2 ? "1fr" : "1fr 1fr";
  return (
    <div className="vv-avatar vv-avatar-sm" style={{ overflow: "hidden", display: "grid", gridTemplateColumns: cols, gridTemplateRows: rows, gap: 1, background: "#fff" }}>
      {members.map((m, i) => (
        <Avatar key={m.id || i} url={m.avatarUrl} name={m.displayName} className="" style={{ width: "100%", height: "100%", borderRadius: 0 }} />
      ))}
    </div>
  );
}

function CreateRoomDialog({ users, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("💬");
  const [picked, setPicked] = useState(() => new Set());
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() =>
    users.filter((u) => u.displayName.toLowerCase().includes(filter.toLowerCase()) || u.username.toLowerCase().includes(filter.toLowerCase())).slice(0, 80),
    [users, filter]
  );

  function toggle(u) {
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(u.username)) next.delete(u.username);
      else if (next.size < 24) next.add(u.username);
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const res = await api.createRoom(name.trim(), emoji, Array.from(picked));
      onCreated(res.room);
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ background: "#fff", borderRadius: 14, maxWidth: 480, width: "100%", maxHeight: "86vh", overflow: "auto", padding: 16, fontFamily: "Arial, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2 style={{ margin: 0, flex: 1, fontSize: 18 }}>👯 Gruppenchat erstellen</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888" }}>×</button>
        </div>
        <p style={{ color: "#666", fontSize: 12, marginTop: 4 }}>Bis zu 25 Mitglieder. Fidolin liest mit – sei nett.</p>

        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <input type="text" value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))} maxLength={4} className="vv-input" style={{ width: 60, fontSize: 20, textAlign: "center" }} />
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Gruppenname (z.B. „Mathe-AG“)" className="vv-input" style={{ flex: 1 }} />
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>Mitglieder hinzufügen ({picked.size}/24):</div>
          <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Person suchen…" className="vv-input" style={{ width: "100%" }} />
          <div style={{ marginTop: 8, maxHeight: 240, overflow: "auto", border: "1px solid #eee", borderRadius: 8, padding: 6 }}>
            {filtered.map((u) => {
              const on = picked.has(u.username);
              return (
                <label key={u.username} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", cursor: "pointer", borderRadius: 6, background: on ? "#eef3fb" : "transparent" }}>
                  <input type="checkbox" checked={on} onChange={() => toggle(u)} />
                  <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}><ColoredName gender={u.gender} age={u.age} name={u.displayName} /></div>
                    <div className="vv-muted" style={{ fontSize: 11 }}>@{u.username}</div>
                  </div>
                </label>
              );
            })}
            {filtered.length === 0 && <div className="vv-muted" style={{ padding: 8 }}>Niemand gefunden.</div>}
          </div>
        </div>

        {error && <div style={{ marginTop: 10, color: "#c2185b", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} className="vv-btn">Abbrechen</button>
          <button type="submit" disabled={busy || !name.trim()} className="vv-btn vv-btn-pink">{busy ? "…" : "Erstellen"}</button>
        </div>
      </form>
    </div>
  );
}

export default function MessengerListPage() {
  const router = useRouter();
  const { me, loading } = useMe();
  const [conversations, setConversations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [creating, setCreating] = useState(false);

  async function reload() {
    if (!me) return;
    const [c, u, r] = await Promise.all([api.listConversations(), api.listUsers(), api.listRooms()]);
    setConversations(c.conversations);
    setUsers(u.users.filter((x) => x.username !== me.username));
    setRooms(r.rooms || []);
  }

  useEffect(() => {
    if (loading) return;
    if (!me) { router.push("/login"); return; }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, loading, router]);

  useMessageStream(!!me, { onMessage: reload, onRoomMessage: reload });

  if (!me) return null;

  const totalUnread =
    conversations.reduce((s, c) => s + (c.unread || 0), 0) +
    rooms.reduce((s, r) => s + (r.unread || 0), 0);

  return (
    <div className="vv-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px",
        background: "linear-gradient(180deg, #5fb0ff 0%, #2d7dd2 55%, #1f5fa8 100%)",
        color: "#fff", fontFamily: "Arial, sans-serif",
        borderBottom: "1px solid rgba(0,0,0,0.15)",
        textShadow: "0 1px 0 rgba(0,0,0,0.25)",
      }}>
        <span style={{ fontSize: 22 }}>💬</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "bold", fontSize: 16 }}>VibeVibo Messenger</div>
          <div style={{ fontSize: 11, opacity: 0.95 }}>
            {totalUnread > 0 ? <><strong>{totalUnread}</strong> ungelesen</> : "Alles gelesen ✓"}
            {" · "}{conversations.length} Chats · {rooms.length} Gruppen
          </div>
        </div>
        <button type="button" onClick={() => setCreating(true)} style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>+ Gruppe</button>
        <a href="#install" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event("vv-pwa-install")); }}
           style={{ color: "#fff", textDecoration: "underline", fontSize: 12, opacity: 0.95 }}>📱 als App</a>
      </div>

      <div style={{ padding: 14 }}>
        {rooms.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ marginTop: 0 }}>👯 Gruppen</h3>
            {rooms.map((r) => (
              <Link key={r.id} href={`/messenger/rooms/${r.id}`} className="vv-conv-entry">
                <div style={{ position: "relative", flexShrink: 0, fontSize: 22, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#f7e0b0,#ffd9ec)", borderRadius: 10 }}>
                  <span>{r.emoji || "💬"}</span>
                  {r.unread > 0 && (
                    <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px", background: "#ff3e9d", color: "#fff", borderRadius: 9, fontSize: 11, fontWeight: "bold", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                      {r.unread > 99 ? "99+" : r.unread}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="vv-conv-name">{r.name} <span className="vv-muted" style={{ fontWeight: "normal", fontSize: 11 }}>· {r.memberCount} dabei</span></div>
                  <div className="vv-conv-preview" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: r.unread > 0 ? "bold" : "normal" }}>
                    {r.lastText || <span className="vv-muted">Noch nichts geschrieben.</span>}
                  </div>
                </div>
                {r.lastAt && <div className="vv-muted" style={{ fontSize: 11 }}>{relTime(r.lastAt)}</div>}
              </Link>
            ))}
          </div>
        )}

        <div className="vv-grid-2">
          <div>
            <h3 style={{ marginTop: 0 }}>Aktive Gespräche</h3>
            {conversations.length === 0 ? (
              <div className="vv-muted">Noch keine Nachrichten. Schreib jemandem!</div>
            ) : (
              conversations.map((c) => (
                <Link key={c.partnerUsername} href={`/messenger/${c.partnerUsername}`} className="vv-conv-entry">
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Avatar url={c.partnerAvatar} name={c.partnerDisplayName} className="vv-avatar vv-avatar-sm" />
                    {c.unread > 0 && (
                      <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px", background: "#ff3e9d", color: "#fff", borderRadius: 9, fontSize: 11, fontWeight: "bold", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                        {c.unread > 99 ? "99+" : c.unread}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="vv-conv-name">
                      <ColoredName gender={c.partnerGender} age={c.partnerAge} name={c.partnerDisplayName} />
                    </div>
                    <div className="vv-conv-preview" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: c.unread > 0 ? "bold" : "normal" }}>
                      {c.fromMe ? "Du: " : ""}{c.lastText}
                    </div>
                  </div>
                  <div className="vv-muted" style={{ fontSize: 11 }}>{relTime(c.at)}</div>
                </Link>
              ))
            )}
          </div>

          <div>
            <h3 style={{ marginTop: 0 }}>Neue Nachricht an…</h3>
            <div className="vv-friends-grid">
              {users.map((u) => {
                const presenceInfo = getPresence({ statusText: u.mood, presence: u.presence, online: u.online });
                return (
                  <Link key={u.username} href={`/messenger/${u.username}`} className="vv-friend-tile">
                    <PresenceAvatar url={u.avatarUrl} name={u.displayName} presenceInfo={presenceInfo} size={46} className="vv-avatar vv-avatar-md" />
                    <span className="vv-friend-name">
                      <ColoredName gender={u.gender} age={u.age} name={u.displayName} size="0.9em" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {creating && (
        <CreateRoomDialog
          users={users}
          onClose={() => setCreating(false)}
          onCreated={(room) => { setCreating(false); router.push(`/messenger/rooms/${room.id}`); }}
        />
      )}
    </div>
  );
}
