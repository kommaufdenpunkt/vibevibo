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
import VoiceRecorder from "./VoiceRecorder";
import VoiceMessage from "./VoiceMessage";

const COMMENT_REACTIONS = [
  { key: "like", emoji: "👍", color: "#3b82f6" },
  { key: "love", emoji: "❤️", color: "#ef4444" },
  { key: "haha", emoji: "😂", color: "#f59e0b" },
  { key: "wow",  emoji: "😍", color: "#ec4899" },
  { key: "fire", emoji: "🔥", color: "#f97316" },
  { key: "sad",  emoji: "😢", color: "#6b7280" },
];

const NODE_COLOR = {
  pinnwand: "#ff8fd0",
  gift: "#ffd23f",
  grouppost: "#7ec8ff",
  newuser: "#8be28b",
  newpic: "#c79bff",
  status: "#ff6fae",
};

const TYPE_LABEL = {
  pinnwand: "📌 Pinnwand",
  gift: "🎁 Geschenk",
  grouppost: "🏘️ Gruppe",
  newuser: "🎉 Neu da",
  newpic: "🖼️ Neues Bild",
  status: "💬 Status",
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

// Kommentar-Reihe mit Voice + Reaktionen
function CommentRow({ c, me, isReply, allComments, onReply, onDelete, onReport, onReact }) {
  const parent = c.replyToId
    ? allComments.find((x) => x.id === c.replyToId)
    : null;
  const canDelete = me && (c.isMine || c.from.username === me.username);
  const counts = c.reactionCounts || {};
  const mine = new Set(c.myReactions || []);

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
            {c.audioUrl && (
              <div style={{ marginTop: 4 }}>
                <VoiceMessage message={{ id: c.id, audioUrl: c.audioUrl, kind: "voice" }} fromMe={c.isMine} />
              </div>
            )}
            {c.text && (
              <div className="vv-bf-comment-text">
                <MentionText text={c.text} />
              </div>
            )}
            {/* Reaktions-Toolbar */}
            {me && (
              <div className="vv-bf-comment-reactions">
                {COMMENT_REACTIONS.map((r) => {
                  const active = mine.has(r.key);
                  const n = counts[r.key] || 0;
                  return (
                    <button key={r.key} type="button"
                      onClick={() => onReact(c, r.key)}
                      className={`vv-bf-comment-react${active ? " active" : ""}`}
                      style={{ color: active ? r.color : "inherit", borderColor: active ? r.color : "transparent" }}>
                      <span>{r.emoji}</span>{n > 0 && <span className="vv-bf-react-n">{n}</span>}
                    </button>
                  );
                })}
              </div>
            )}
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

// Comments-Sektion unter einem Buschfunk-Event (type bestimmt was kommentiert wird)
function CommentsSection({ postId, type = "status" }) {
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
      const r = await api.listBuschfunkComments(postId, type);
      setComments(r.comments || []);
      setCount((r.comments || []).filter((x) => !x.deleted).length);
    } catch {}
  }

  useEffect(() => {
    api.listBuschfunkComments(postId, type).then((r) => {
      const list = r.comments || [];
      setComments(list);
      setCount(list.filter((x) => !x.deleted).length);
    }).catch(() => setCount(0));
  }, [postId, type]);

  async function sendText() {
    const t = draft.trim();
    if (!t) return;
    if (!me) { setFlash("⚠ Bitte einloggen"); return; }
    setBusy(true);
    try {
      const replyToId = replyTo?.id || 0;
      const effective = replyTo && !t.includes("@") ? `@${replyTo.from.username} ${t}` : t;
      const r = await api.addBuschfunkComment(postId, effective, replyToId, type);
      setComments(r.comments || []);
      setCount((r.comments || []).filter((x) => !x.deleted).length);
      setDraft("");
      setReplyTo(null);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 5000);
    } finally { setBusy(false); }
  }

  async function sendVoice(audioUrl) {
    if (!audioUrl) return;
    if (!me) { setFlash("⚠ Bitte einloggen"); return; }
    setBusy(true);
    try {
      const replyToId = replyTo?.id || 0;
      const r = await api.addBuschfunkComment(postId, "", replyToId, type, audioUrl);
      setComments(r.comments || []);
      setCount((r.comments || []).filter((x) => !x.deleted).length);
      setReplyTo(null);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 5000);
    } finally { setBusy(false); }
  }

  async function onDelete(c) {
    if (!confirm("Kommentar wirklich löschen?")) return;
    try {
      const r = await api.deleteBuschfunkComment(postId, c.id, type);
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

  async function onReact(c, kind) {
    try {
      await api.toggleReaction("buschfunk_comment", c.id, kind);
      await load();
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
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <VoiceRecorder onSend={sendVoice} />
                  <button type="button" onClick={sendText} disabled={busy || !draft.trim()} className="vv-bf-comments-send">
                    {busy ? "…" : "💌 Posten"}
                  </button>
                </div>
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
  const isFresh = Date.now() - ev.at < 3600000; // < 1h alt
  const nodeColor = NODE_COLOR[ev.type] || "#ddd";
  const hasDetail = (ev.type === "pinnwand" || ev.type === "status" || ev.type === "grouppost") && ev.detail;

  return (
    <div key={i} className={`vv-bf-card${isBoosted ? " vv-bf-card-boost" : ""}${ev.isFriend ? " vv-bf-card-friend" : ""}`}
         style={{ "--bf-accent": nodeColor }}>
      <Link href={`/u/${ev.actor.username}`} className="vv-bf-card-avatar">
        <Avatar url={ev.actor.avatarUrl} name={ev.actor.displayName} className="vv-avatar vv-avatar-sm" />
        <span className="vv-bf-card-avatar-icon">{icon}</span>
      </Link>
      <div className="vv-bf-card-body">
        <div className="vv-bf-card-head">
          <span className="vv-bf-card-badge">{TYPE_LABEL[ev.type] || "✨"}</span>
          {isBoosted && <span className="vv-bf-card-boost-tag">📣 24h-Boost</span>}
          {isFresh && !isBoosted && <span className="vv-bf-card-new-tag">✨ NEU</span>}
          <span className="vv-bf-card-time">{relTime(ev.at)}</span>
        </div>
        <div className="vv-bf-card-text">{text}</div>
        {hasDetail && ev.type === "status" && (
          <div className="vv-bf-card-bubble">„<MentionText text={ev.detail} />"</div>
        )}
        <EmbeddedMedia audioUrl={ev.audioUrl} mediaJson={ev.media} compact />
        {ev.postId > 0 && ["status","pinnwand","gift","grouppost","newpic"].includes(ev.type) && (
          <CommentsSection postId={ev.postId} type={ev.type} />
        )}
      </div>
      {ev.picUrl && (
        <Link href={`/u/${ev.actor.username}`} className="vv-bf-card-pic">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ev.picUrl} alt="" />
        </Link>
      )}
    </div>
  );
}

const FILTER_TABS = [
  { key: "all", label: "✨ Alle", types: null },
  { key: "friends", label: "⭐ Freunde", types: null, friendsOnly: true },
  { key: "status", label: "💬 Status", types: ["status"] },
  { key: "gift", label: "🎁 Geschenke", types: ["gift"] },
  { key: "pinnwand", label: "📌 Pinnwand", types: ["pinnwand"] },
];

export default function Buschfunk() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    const t0 = Date.now();
    try {
      const d = await api.buschfunk();
      const next = d.events || [];
      setEvents((prev) => {
        if (prev.length === next.length && prev[0]?.id === next[0]?.id && prev[0]?.at === next[0]?.at) return prev;
        return next;
      });
    } catch {}
    // Mindestens 400 ms Spin-Animation, auch wenn API schneller zurueckkommt
    const elapsed = Date.now() - t0;
    setTimeout(() => setRefreshing(false), Math.max(0, 400 - elapsed));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 120000);
    return () => clearInterval(t);
  }, []);

  const tab = FILTER_TABS.find((t) => t.key === filter) || FILTER_TABS[0];
  const filtered = events.filter((ev) => {
    if (tab.friendsOnly && !ev.isFriend) return false;
    if (tab.types && !tab.types.includes(ev.type)) return false;
    return true;
  });

  return (
    <div className="vv-card">
      <div className="vv-bf-toolbar">
        <div className="vv-bf-filter-chips">
          {FILTER_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`vv-bf-filter-chip${filter === t.key ? " active" : ""}`}
              onClick={() => setFilter(t.key)}
            >{t.label}</button>
          ))}
        </div>
        <button
          type="button"
          className={`vv-bf-refresh${refreshing ? " spinning" : ""}`}
          onClick={load}
          title="Aktualisieren"
          aria-label="Aktualisieren"
        >↻</button>
      </div>

      {filtered.length === 0 ? (
        <div className="vv-muted vv-center" style={{ padding: "16px 0" }}>
          {filter === "all"
            ? "Noch nichts los. Schreib jemandem auf die Pinnwand!"
            : "Hier ist nichts mit diesem Filter — probier einen anderen Tab."}
        </div>
      ) : (
        <div className="vv-bf-feed">
          {(() => {
            const out = [];
            let cutInserted = false;
            let friendHeaderInserted = false;
            const hasFriends = filter === "all" && filtered.some((e) => e.isFriend);
            const hasOthers = filter === "all" && filtered.some((e) => !e.isFriend);
            for (let i = 0; i < filtered.length; i++) {
              const ev = filtered[i];
              if (hasFriends && !friendHeaderInserted && ev.isFriend) {
                out.push(
                  <div key="bf-header-friends" className="vv-bf-section-header vv-bf-section-friends">
                    ⭐ DEIN FREUNDESKREIS ⭐
                  </div>
                );
                friendHeaderInserted = true;
              }
              if (hasFriends && hasOthers && !cutInserted && !ev.isFriend) {
                out.push(
                  <div key="bf-cut" className="vv-bf-cut">
                    ✓ Du bist nun auf dem aktuellen Stand
                  </div>
                );
                out.push(
                  <div key="bf-header-others" className="vv-bf-section-header vv-bf-section-others">
                    🌍 AUS DEM NETZ 🌍
                  </div>
                );
                cutInserted = true;
              }
              out.push(renderEvent(ev, i, i === filtered.length - 1));
            }
            return out;
          })()}
        </div>
      )}
    </div>
  );
}
