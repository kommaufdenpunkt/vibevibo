"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { relTime } from "@/lib/format";
import { useMessageStream } from "@/lib/useEventStream";
import Avatar from "@/components/Avatar";

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

  return (
    <div className="vv-card">
      <h2>✉️ Nachrichten</h2>
      <div className="vv-grid-2">
        <div>
          <h3>Aktive Gespräche</h3>
          {conversations.length === 0 ? (
            <div className="vv-muted">Noch keine Nachrichten. Schreib jemandem!</div>
          ) : (
            conversations.map((c) => (
              <Link key={c.partnerUsername} href={`/messenger/${c.partnerUsername}`} className="vv-conv-entry">
                <Avatar url={c.partnerAvatar} name={c.partnerDisplayName} className="vv-avatar vv-avatar-sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="vv-conv-name">{c.partnerDisplayName}</div>
                  <div className="vv-conv-preview" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.fromMe ? "Du: " : ""}{c.lastText}
                  </div>
                </div>
                <div className="vv-muted">{relTime(c.at)}</div>
              </Link>
            ))
          )}
        </div>

        <div>
          <h3>Neue Nachricht an...</h3>
          <div className="vv-friends-grid">
            {users.map((u) => (
              <Link key={u.username} href={`/messenger/${u.username}`} className="vv-friend-tile">
                <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-md" />
                <span className="vv-friend-name">
                  {u.online && <span className="vv-online-dot" />}
                  {u.displayName}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
