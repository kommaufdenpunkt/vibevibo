"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { relTime } from "@/lib/format";
import { useMessageStream } from "@/lib/useEventStream";
import Avatar from "@/components/Avatar";
import PresenceAvatar from "@/components/PresenceAvatar";
import { ColoredName } from "@/components/GenderAge";
import CreateRoomDialog from "@/components/CreateRoomDialog";
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
