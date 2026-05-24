"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import { relTime } from "@/lib/format";
import SmileyPicker from "@/components/SmileyPicker";
import { useMessageStream } from "@/lib/useEventStream";

export default function ChatPage() {
  const params = useParams();
  const partnerName = decodeURIComponent(params.username || "");
  const router = useRouter();
  const { me, loading } = useMe();

  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState(null);

  const scrollRef = useRef(null);

  const reload = useCallback(async () => {
    if (!me) return;
    try {
      const [chat, list] = await Promise.all([
        api.getConversation(partnerName),
        api.listConversations(),
      ]);
      setPartner(chat.partner);
      setMessages(chat.messages);
      setConversations(list.conversations);
      setError(null);
    } catch (e) {
      if (e.status === 404) setError("User nicht gefunden.");
      else setError(e.message);
    }
  }, [me, partnerName]);

  useEffect(() => {
    if (loading) return;
    if (!me) { router.push("/login"); return; }
    reload();
  }, [me, loading, router, reload]);

  useMessageStream(!!me, (ev) => {
    if (
      (ev.from?.username === partnerName && ev.to?.username === me?.username) ||
      (ev.from?.username === me?.username && ev.to?.username === partnerName)
    ) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === ev.id)) return prev;
        return [...prev, { id: ev.id, text: ev.text, at: ev.at, fromMe: ev.fromMe }];
      });
    }
    api.listConversations().then((d) => setConversations(d.conversations)).catch(() => {});
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function submit(e) {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    try {
      await api.sendMessage(partnerName, v);
      setText("");
    } catch (err) {
      alert(err.message);
    }
  }

  if (!me) return null;
  if (error) {
    return (
      <div className="vv-card">
        <h2>👻 {error}</h2>
        <Link href="/messenger" className="vv-btn">← Zurück</Link>
      </div>
    );
  }
  if (!partner) return <div className="vv-card">Lädt...</div>;

  return (
    <div className="vv-card">
      <h2>✉️ Chat mit {partner.displayName} {partner.emoji}</h2>
      <div className="vv-msg-list">
        <div className="vv-conversation-list">
          {conversations.length === 0 && <div className="vv-muted">Noch keine Gespräche.</div>}
          {conversations.map((c) => (
            <Link
              key={c.partnerUsername}
              href={`/messenger/${c.partnerUsername}`}
              className={`vv-conv-entry${c.partnerUsername === partnerName ? " active" : ""}`}
            >
              <div className="vv-avatar vv-avatar-sm">{c.partnerEmoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="vv-conv-name">{c.partnerDisplayName}</div>
                <div className="vv-conv-preview" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.lastText}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="vv-chat-window">
          <div className="vv-row" style={{ paddingBottom: 6, borderBottom: "1px dotted #999" }}>
            <Link href={`/u/${partner.username}`}>
              <div className="vv-avatar vv-avatar-sm">{partner.emoji}</div>
            </Link>
            <div>
              <strong>{partner.displayName}</strong>
              <div className="vv-muted">@{partner.username} · {partner.mood}</div>
            </div>
          </div>
          <div className="vv-chat-messages" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="vv-muted vv-center" style={{ marginTop: 30 }}>
                Sag „Hi 👋"!
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`vv-chat-row${m.fromMe ? " vv-me" : ""}`}>
                <div>
                  <div className={`vv-chat-bubble${m.fromMe ? " vv-me" : ""}`}>{m.text}</div>
                  <div className="vv-chat-meta" style={{ textAlign: m.fromMe ? "right" : "left" }}>{relTime(m.at)}</div>
                </div>
              </div>
            ))}
          </div>
          <form className="vv-chat-input-row" onSubmit={submit}>
            <SmileyPicker onPick={(s) => setText((t) => t + s)} />
            <input
              className="vv-input"
              placeholder={`Schreib was an ${partner.displayName}...`}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="vv-btn vv-btn-pink">▶ Senden</button>
          </form>
        </div>
      </div>
    </div>
  );
}
