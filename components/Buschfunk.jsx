"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { relTime } from "@/lib/format";
import { findGift } from "@/lib/gifts";
import { ColoredName } from "./GenderAge";
import OnlineName from "./OnlineName";
import PremiumBadges from "./PremiumBadges";
import MentionText from "./MentionText";
import EmbeddedMedia from "./EmbeddedMedia";
import Avatar from "./Avatar";

const NODE_COLOR = {
  pinnwand: "#ff8fd0",
  gift: "#ffd23f",
  grouppost: "#7ec8ff",
  newuser: "#8be28b",
  newpic: "#c79bff",
  status: "#ff6fae",
};

function userChip(u) {
  if (!u) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      <Link href={`/u/${u.username}`} style={{ textDecoration: "none" }}>
        <OnlineName lastSeen={u.lastSeen}>
          <ColoredName gender={u.gender} age={u.age} name={u.displayName} />
        </OnlineName>
      </Link>
      <PremiumBadges badges={u.premiumBadges} size={13} />
    </span>
  );
}

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// Kommentar-Reihe (mit optionalem Reply-Indent)
function CommentRow({ c, me, isReply, allComments, onReply, onDelete, onReport }) {
  const parent = c.replyToId
    ? allComments.find((x) => x.id === c.replyToId)
    : null;
  const canDelete = me && (c.isMine || c.from.username === me.username);

  return (
    <div className="vv-bf-comment" data-reply={isReply ? "1" : "0"}>
      <Link href={`/u/${c.from.username}`} className="vv-bf-comment-avatar-link">
        <Avatar url={c.from.avatarUrl} name={c.from.displayName} className="vv-avatar vv-avatar-sm" />
      </Link>
      <div className="vv-bf-comment-body">
        <div className="vv-bf-comment-head">
          <Link href={`/u/${c.from.username}`} style={{ textDecoration: "none" }}>
            <ColoredName gender={c.from.gender} age={c.from.age} name={c.from.displayName} nameColor={c.from.nameColor} size="13px" />
          </Link>
          {parent && !parent.deleted && (
            <span className="vv-bf-comment-reply-ref">
              ↪ <Link href={`/u/${parent.from.username}`} style={{ color: "#831843", textDecoration: "none" }}>@{parent.from.username}</Link>
            </span>
          )}
          <span className="vv-bf-comment-time">{relTime(c.at)}</span>
        </div>
        {c.deleted ? (
          <div className="vv-bf-comment-deleted">
            🗑 Kommentar gelöscht
            {c.deletedReason === "fidolin" && " (von Fidolin geprüft)"}
          </div>
        ) : (
          <>
            <div className="vv-bf-comment-text">
              <MentionText text={c.text} />
            </div>
            {me && (
              <div className="vv-bf-comment-actions">
                <button type="button" onClick={() => onReply(c)} className="vv-bf-comment-action">
                  ↩ Antworten
                </button>
                <button type="button" onClick={() => onReport(c)} className="vv-bf-comment-action vv-bf-comment-action-report">
                  🚩 Melden
                </button>
                {canDelete && (
                  <button type="button" onClick={() => onDelete(c)} className="vv-bf-comment-action vv-bf-comment-action-delete">
                    🗑 Löschen
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Comments-Sektion unter einem Buschfunk-Post
function CommentsSection({ postId }) {
  const { me } = useMe();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [count, setCount] = useState(null);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  async function load() {
    try {
      const r = await api.listBuschfunkComments(postId);
      setComments(r.comments || []);
      setCount((r.comments || []).filter((x) => !x.deleted).length);
    } catch {}
  }

  useEffect(() => {
    // Lazy-Count beim Mount
    api.listBuschfunkComments(postId).then((r) => {
      const list = r.comments || [];
      setComments(list);
      setCount(list.filter((x) => !x.deleted).length);
    }).catch(() => setCount(0));
  }, [postId]);

  async function send() {
    const t = draft.trim();
    if (!t) return;
    if (!me) { setFlash("⚠ Bitte einloggen"); return; }
    setBusy(true);
    try {
      const replyToId = replyTo?.id || 0;
      const effective = replyTo && !t.includes("@") ? `@${replyTo.from.username} ${t}` : t;
      const r = await api.addBuschfunkComment(postId, effective, replyToId);
      setComments(r.comments || []);
      setCount((r.comments || []).filter((x) => !x.deleted).length);
      setDraft("");
      setReplyTo(null);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 5000);
    } finally { setBusy(false); }
  }

  async function onDelete(c) {
    if (!confirm("Kommentar wirklich löschen?")) return;
    try {
      const r = await api.deleteBuschfunkComment(postId, c.id);
      setComments(r.comments || []);
      setCount((r.comments || []).filter((x) => !x.deleted).length);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 4000);
    }
  }

  async function onReport(c) {
    const reason = prompt("Warum meldest du diesen Kommentar?", "");
    if (reason === null) return;
    try {
      await api.reportBuschfunkComment(c.id, reason);
      setFlash("✅ Kommentar gemeldet — Fidolin schaut drauf.");
      setTimeout(() => setFlash(""), 3500);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 4000);
    }
  }

  return (
    <div className="vv-bf-comments">
      {!open ? (
        <button type="button" onClick={() => { setOpen(true); load(); }} className="vv-bf-comments-toggle">
          💬 {count == null ? "Kommentare" : count === 0 ? "Kommentieren" : `${count} ${count === 1 ? "Kommentar" : "Kommentare"} anzeigen`}
        </button>
      ) : (
        <>
          <div className="vv-bf-comments-head">
            <span>💬 Kommentare</span>
            <button type="button" onClick={() => setOpen(false)} className="vv-bf-comments-close">×</button>
          </div>
          {comments.length === 0 ? (
            <div className="vv-bf-comments-empty">Noch keine Kommentare — sei der/die Erste!</div>
          ) : (
            <div className="vv-bf-comments-list">
              {comments.map((c) => (
                <CommentRow key={c.id} c={c} me={me} isReply={!!c.replyToId}
                  allComments={comments}
                  onReply={(x) => { setReplyTo(x); setDraft(""); }}
                  onDelete={onDelete}
                  onReport={onReport} />
              ))}
            </div>
          )}

          {flash && (
            <div className="vv-bf-comments-flash" data-tone={flash.startsWith("⚠") ? "warn" : "ok"}>
              {flash}
            </div>
          )}

          {me ? (
            <div className="vv-bf-comments-composer">
              {replyTo && (
                <div className="vv-bf-comments-reply-hint">
                  ↩ Antwort an <b>@{replyTo.from.username}</b>
                  <button type="button" onClick={() => setReplyTo(null)}>×</button>
                </div>
              )}
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={replyTo ? `Antwort an @${replyTo.from.username}…` : "Kommentar schreiben (mit @user kannst du markieren)…"}
                rows={2}
                maxLength={500}
                className="vv-bf-comments-textarea"
              />
              <div className="vv-bf-comments-footer">
                <span className="vv-bf-comments-counter">{draft.length} / 500</span>
                <button type="button" onClick={send} disabled={busy || !draft.trim()} className="vv-bf-comments-send">
                  {busy ? "…" : "💌 Posten"}
                </button>
              </div>
            </div>
          ) : (
            <div className="vv-bf-comments-loginhint">
              🔑 <Link href="/login">Einloggen</Link> um zu kommentieren.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function renderEvent(ev, i, isLast) {
  const actor = userChip(ev.actor);
  const target = userChip(ev.target);
  let icon = "✨";
  let text = null;

  if (ev.type === "pinnwand") {
    icon = "📌";
    const self = ev.actor.username === ev.target.username;
    text = self
      ? <>{actor} postet: „<MentionText text={truncate(ev.detail, 80)} />"</>
      : <>{actor} schrieb an {target}: „<MentionText text={truncate(ev.detail, 60)} />"</>;
  } else if (ev.type === "gift") {
    const g = findGift(ev.gift);
    icon = g?.icon || "🎁";
    text = <>{actor} schenkte {target} {g ? `${g.icon} ${g.name}` : "ein Geschenk"}</>;
  } else if (ev.type === "grouppost") {
    icon = "🏘️";
    text = <>{actor} postete in <Link href={`/gruppen/${ev.group.slug}`}>{ev.group.name}</Link>: „{truncate(ev.detail, 55)}"</>;
  } else if (ev.type === "newuser") {
    icon = "🎉";
    text = <>{actor} ist neu bei VibeVibo – sag Hallo!</>;
  } else if (ev.type === "newpic") {
    icon = "🖼️";
    text = <>{actor} hat ein neues Profilbild!</>;
  } else if (ev.type === "status") {
    icon = "💬";
    text = <>{actor}: <strong><MentionText text={ev.detail} /></strong></>;
  }

  const isBoosted = ev.type === "status" && (ev.boostedUntil || 0) > Date.now();
  return (
    <div key={i} style={{
      position: "relative", display: "flex", gap: 10, paddingBottom: isLast ? 0 : 14,
      ...(isBoosted ? {
        background: "linear-gradient(135deg, #fff7ed, #fef3c7)",
        border: "2px solid #f59e0b",
        borderRadius: 12, padding: 10, marginBottom: 8,
        boxShadow: "0 0 14px rgba(245,158,11,0.3)",
      } : {}),
    }}>
      {!isLast && !isBoosted && <div style={{ position: "absolute", left: 14, top: 30, bottom: 0, width: 2, background: "#ececf3" }} />}
      <div style={{
        zIndex: 1, width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        background: "#fff", border: `2px solid ${NODE_COLOR[ev.type] || "#ddd"}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {isBoosted && (
          <div style={{ fontSize: 10, fontWeight: 800, color: "#b45309", marginBottom: 2 }}>
            📣 BOOSTED · bleibt 24h oben
          </div>
        )}
        <div style={{ fontSize: 13, lineHeight: 1.45 }}>{text}</div>
        <div style={{ fontSize: 11, color: "#9a9aa8", marginTop: 2 }}>{relTime(ev.at)}</div>
        <EmbeddedMedia audioUrl={ev.audioUrl} mediaJson={ev.media} compact />
        {/* Kommentare nur für Status-Posts (Buschfunk-eigene Posts) */}
        {ev.type === "status" && ev.postId > 0 && (
          <CommentsSection postId={ev.postId} />
        )}
      </div>
      {ev.picUrl && (
        <Link href={`/u/${ev.actor.username}`} style={{ flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ev.picUrl} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} />
        </Link>
      )}
    </div>
  );
}

export default function Buschfunk() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const load = () => api.buschfunk().then((d) => setEvents(d.events)).catch(() => {});
    load();
    const t = setInterval(load, 25000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="vv-card">
      <h2 style={{ marginTop: 0 }}>📰 Neuigkeiten</h2>
      <div className="vv-muted" style={{ fontSize: 12, marginBottom: 12 }}>Wer hat was, wann &amp; wo gemacht – deine Timeline</div>
      {events.length === 0 ? (
        <div className="vv-muted vv-center" style={{ padding: "16px 0" }}>
          Noch nichts los. Schreib jemandem auf die Pinnwand!
        </div>
      ) : (
        <div>
          {events.map((ev, i) => renderEvent(ev, i, i === events.length - 1))}
        </div>
      )}
    </div>
  );
}
