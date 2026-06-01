"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { relTime } from "@/lib/format";
import SmileyPicker from "@/components/SmileyPicker";

export default function GroupPage() {
  const params = useParams();
  const slug = decodeURIComponent(params.slug || "");
  const { me } = useMe();
  const [data, setData] = useState(undefined);
  const [text, setText] = useState("");

  const reload = useCallback(async () => {
    try {
      const d = await api.getGroup(slug);
      setData(d);
    } catch (e) {
      if (e.status === 404) setData(null);
    }
  }, [slug]);

  useEffect(() => { reload(); }, [reload]);

  if (data === undefined) return <div className="vv-card">Lädt...</div>;
  if (data === null) {
    return (
      <div className="vv-card">
        <h2>👻 Gruppe nicht gefunden</h2>
        <Link href="/gruppen" className="vv-btn">← Zurück</Link>
      </div>
    );
  }

  const { group, members, posts, isMember } = data;

  async function join() {
    try { await api.joinGroup(slug); reload(); }
    catch (e) { alert(e.message); }
  }
  async function leave() {
    if (!confirm("Gruppe wirklich verlassen?")) return;
    try { await api.leaveGroup(slug); reload(); }
    catch (e) { alert(e.message); }
  }
  async function post(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api.postGroup(slug, text);
      setText("");
      reload();
    } catch (err) { alert(err.message); }
  }

  return (
    <>
      <div className="vv-card">
        <div className="vv-row" style={{ gap: 16 }}>
          <div className="vv-avatar" style={{ fontSize: 64 }}>{group.emoji}</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>{group.name}</h2>
            <div className="vv-muted">/{group.slug} · {members.length} Mitglieder</div>
            <p className="vv-mt-8">{group.description}</p>
          </div>
          <div>
            {me ? (
              isMember ? (
                <button className="vv-btn" onClick={leave}>↩ Verlassen</button>
              ) : (
                <button className="vv-btn vv-btn-pink" onClick={join}>+ Beitreten</button>
              )
            ) : (
              <Link className="vv-btn vv-btn-pink" href="/login">🔑 Einloggen zum Beitreten</Link>
            )}
          </div>
        </div>
      </div>

      <div className="vv-grid-2">
        <div>
          <div className="vv-card">
            <h3>💬 Gruppen-Wand</h3>
            {isMember && (
              <form onSubmit={post}>
                <textarea
                  className="vv-textarea"
                  placeholder={`Was läuft in ${group.name}?`}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <div className="vv-row vv-mt-8">
                  <SmileyPicker onPick={(s) => setText((t) => t + s)} />
                  <div className="vv-spacer" />
                  <button type="submit" className="vv-btn vv-btn-pink">✎ Posten</button>
                </div>
              </form>
            )}

            <div className="vv-mt-12">
              {posts.length === 0 && <div className="vv-muted vv-center">Noch keine Posts.</div>}
              {posts.map((p) => (
                <div className="vv-pinnwand-entry" key={p.id}>
                  <div className="vv-pinnwand-meta">
                    <Link href={`/u/${p.username}`}>
                      <strong>{p.displayName}</strong> {p.emoji}
                    </Link>
                    {" · "}{relTime(p.at)}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{p.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="vv-card">
            <h3>👥 Mitglieder ({members.length})</h3>
            <div className="vv-friends-grid">
              {members.map((m) => (
                <Link key={m.username} href={`/u/${m.username}`} className="vv-friend-tile">
                  <div className="vv-avatar vv-avatar-md">{m.emoji}</div>
                  <span className="vv-friend-name">{m.displayName}</span>
                  {m.role === "owner" && <span className="vv-muted">👑 Owner</span>}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
