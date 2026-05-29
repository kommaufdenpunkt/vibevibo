"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { relTime } from "@/lib/format";
import { useMessageStream } from "@/lib/useEventStream";
import Avatar from "@/components/Avatar";
import { ColoredName } from "@/components/GenderAge";

export default function MessengerListPage() {
  const router = useRouter();
  const { me, loading } = useMe();
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);

  async function reload() {
    if (!me) return;
    const [c, u] = await Promise.all([api.listConversations(), api.listUsers()]);
    setConversations(c.conversations);
    setUsers(u.users.filter((x) => x.username !== me.username));
  }

  useEffect(() => {
    if (loading) return;
    if (!me) { router.push("/login"); return; }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, loading, router]);

  useMessageStream(!!me, () => reload());

  if (!me) return null;

  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);

  return (
    <div className="vv-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* MSN-/ICQ-style Titelleiste */}
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
            {" · "}{conversations.length} Gespräche
          </div>
        </div>
        <a href="#install" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event("vv-pwa-install")); }}
           style={{ color: "#fff", textDecoration: "underline", fontSize: 12, opacity: 0.95 }}>📱 als App</a>
      </div>

      <div style={{ padding: 14 }}>
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
              {users.map((u) => (
                <Link key={u.username} href={`/messenger/${u.username}`} className="vv-friend-tile">
                  <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-md" />
                  <span className="vv-friend-name">
                    {u.online && <span className="vv-online-dot" />}
                    <ColoredName gender={u.gender} age={u.age} name={u.displayName} size="0.9em" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
