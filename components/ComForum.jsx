"use client";

// 💬 ComForum — Jappy-Style Diskussions-Forum für eine Com.
// Threads mit Replies, pinnen + sperren für Owner/Mod.

import { useEffect, useState } from "react";
import Link from "next/link";
import ComReactions from "@/components/ComReactions";
import { useMe } from "@/lib/useMe";

export default function ComForum({ slug, isMember, isOwner, isMod, themeColor = "#ec4899" }) {
  const { me } = useMe();
  const [threads, setThreads] = useState(null);
  const [reactions, setReactions] = useState({});
  const [openId, setOpenId] = useState(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function reload() {
    setErr("");
    try {
      const r = await fetch(`/api/groups/${slug}/threads`);
      if (!r.ok) throw new Error("Fehler beim Laden.");
      const d = await r.json();
      setThreads(d.threads);
      setReactions(d.reactions || {});
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => { reload(); }, [slug]);

  async function createThread(e) {
    e.preventDefault();
    if (!draft.title.trim() || !draft.body.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(`/api/groups/${slug}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setDraft({ title: "", body: "" });
      setComposing(false);
      await reload();
      setOpenId(d.threadId);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (threads === null) {
    return <div style={{ padding: 16, textAlign: "center", color: "#64748b" }}>⏳ Forum lädt…</div>;
  }

  if (openId != null) {
    return (
      <ThreadDetail
        slug={slug}
        threadId={openId}
        themeColor={themeColor}
        isMember={isMember}
        isOwner={isOwner}
        isMod={isMod}
        meId={me?.id}
        onBack={() => { setOpenId(null); reload(); }}
        onChange={reload}
      />
    );
  }

  return (
    <div>
      {/* Header + Compose-Button */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
        padding: "0 4px",
      }}>
        <div style={{
          fontSize: 13, fontWeight: 900, color: "#fff",
          textShadow: "0 2px 6px rgba(0,0,0,0.4)",
        }}>
          💬 {threads.length} {threads.length === 1 ? "Thema" : "Themen"}
        </div>
        <div style={{ flex: 1 }} />
        {isMember && (
          <button
            onClick={() => setComposing((c) => !c)}
            style={{
              background: composing ? "rgba(255,255,255,0.95)" : `linear-gradient(135deg, ${themeColor}, ${shade(themeColor, -20)})`,
              color: composing ? "#64748b" : "#fff",
              border: "none", padding: "7px 14px", borderRadius: 999,
              fontWeight: 800, cursor: "pointer", fontSize: 12,
              boxShadow: composing ? "0 2px 6px rgba(0,0,0,0.1)" : `0 2px 8px ${themeColor}66`,
            }}>
            {composing ? "− Abbrechen" : "+ Neues Thema"}
          </button>
        )}
      </div>

      {/* Compose-Form */}
      {composing && (
        <form onSubmit={createThread} style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderRadius: 14, padding: 14, marginBottom: 12,
          border: `2px solid ${themeColor}66`,
        }}>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Titel — worüber willst du sprechen?"
            maxLength={160}
            style={{
              width: "100%", padding: "9px 11px", marginBottom: 8,
              borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)",
              fontSize: 14, fontWeight: 700, fontFamily: "inherit",
            }}
            required
          />
          <textarea
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            placeholder="Dein Beitrag — Gedanken, Frage, Diskussion…"
            maxLength={8000}
            style={{
              width: "100%", minHeight: 100, padding: "9px 11px",
              borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)",
              fontSize: 14, fontFamily: "inherit", resize: "vertical",
            }}
            required
          />
          <div style={{ display: "flex", alignItems: "center", marginTop: 8, gap: 8 }}>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              {draft.title.length}/160 · {draft.body.length}/8000
            </div>
            <div style={{ flex: 1 }} />
            <button type="submit" disabled={busy} style={{
              background: `linear-gradient(135deg, ${themeColor}, ${shade(themeColor, -20)})`,
              color: "#fff", border: "none", padding: "8px 18px", borderRadius: 999,
              fontWeight: 800, cursor: busy ? "wait" : "pointer", fontSize: 13,
              boxShadow: `0 2px 8px ${themeColor}66`,
              opacity: busy ? 0.6 : 1,
            }}>
              {busy ? "Posten…" : "✎ Thema posten"}
            </button>
          </div>
        </form>
      )}

      {err && (
        <div style={{
          background: "#fee2e2", color: "#991b1b",
          padding: 10, borderRadius: 10, marginBottom: 10,
          fontSize: 12, fontWeight: 700,
        }}>{err}</div>
      )}

      {/* Thread-Liste */}
      {threads.length === 0 && (
        <div style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(10px)",
          borderRadius: 12, padding: 22, textAlign: "center",
          color: "#64748b", fontSize: 13,
        }}>
          Noch keine Diskussionen. {isMember ? "Mach den Anfang!" : "Tritt der Com bei um zu posten."}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {threads.map((t) => (
          <button
            key={t.id}
            onClick={() => setOpenId(t.id)}
            style={{
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: 12, padding: 12,
              border: t.pinned ? `2px solid ${themeColor}` : "1px solid rgba(0,0,0,0.08)",
              cursor: "pointer", textAlign: "left",
              transition: "transform 0.12s, box-shadow 0.18s",
              boxShadow: t.pinned ? `0 4px 12px ${themeColor}30` : "0 1px 3px rgba(0,0,0,0.04)",
            }}
            className="vv-prem-btn"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              {t.pinned ? <span style={{ fontSize: 13 }}>📌</span> : null}
              {t.locked ? <span style={{ fontSize: 13 }}>🔒</span> : null}
              <div style={{
                fontSize: 14, fontWeight: 900, color: "#1f2937",
                flex: 1, lineHeight: 1.25,
              }}>{t.title}</div>
            </div>
            <div style={{
              fontSize: 11, color: "#64748b", display: "flex", gap: 8,
              alignItems: "center", flexWrap: "wrap",
            }}>
              <span>{t.authorEmoji || "👤"}</span>
              <span>
                <Link
                  href={`/u/${t.authorUsername}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: themeColor, fontWeight: 700, textDecoration: "none" }}
                >{t.authorDisplayName || t.authorUsername}</Link>
              </span>
              <span>·</span>
              <span>{relTime(t.createdAt)}</span>
              <span style={{ flex: 1 }} />
              <span>💬 {t.replyCount}</span>
              {t.replyCount > 0 && <>
                <span>·</span>
                <span>letzte: {relTime(t.lastReplyAt)}</span>
              </>}
            </div>
            {isMember && (
              <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 8 }}>
                <ComReactions
                  slug={slug}
                  targetType="thread"
                  targetId={t.id}
                  initial={reactions[t.id] || {}}
                  myUserId={me?.id}
                  themeColor={themeColor}
                  compact
                />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ThreadDetail({ slug, threadId, themeColor, isMember, isOwner, isMod, meId, onBack, onChange }) {
  const [data, setData] = useState(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function reload() {
    setErr("");
    try {
      const r = await fetch(`/api/groups/${slug}/threads/${threadId}`);
      if (!r.ok) throw new Error("Fehler beim Laden.");
      const d = await r.json();
      setData(d);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => { reload(); }, [slug, threadId]);

  async function postReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(`/api/groups/${slug}/threads/${threadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setReply("");
      await reload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function modAction(action, extra = {}) {
    try {
      const r = await fetch(`/api/groups/${slug}/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      if (action === "delete") {
        onBack?.();
      } else {
        await reload();
        onChange?.();
      }
    } catch (e) {
      setErr(e.message);
    }
  }

  if (!data) {
    return <div style={{ padding: 16, textAlign: "center", color: "#fff" }}>⏳ Thread lädt…</div>;
  }
  const t = data.thread;

  return (
    <div>
      {/* Zurück */}
      <button onClick={onBack} style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(10px)",
        color: "#475569", border: "none",
        padding: "6px 12px", borderRadius: 999,
        fontWeight: 800, fontSize: 12, cursor: "pointer",
        marginBottom: 10,
      }}>← Zurück zum Forum</button>

      {/* Thread-Kopf */}
      <div style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        borderRadius: 14, padding: 14, marginBottom: 12,
        border: t.pinned ? `2px solid ${themeColor}` : "1px solid rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          {t.pinned ? <span>📌</span> : null}
          {t.locked ? <span>🔒</span> : null}
          <h2 style={{
            margin: 0, fontSize: 18, fontWeight: 900, color: "#1f2937", flex: 1,
            lineHeight: 1.2,
          }}>{t.title}</h2>
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>
          {t.authorEmoji || "👤"}{" "}
          <Link href={`/u/${t.authorUsername}`} style={{ color: themeColor, fontWeight: 700 }}>
            {t.authorDisplayName || t.authorUsername}
          </Link>
          {" "} · {" "} {relTime(t.createdAt)}
          {" "} · {" "} 💬 {t.replyCount}
        </div>
        <div style={{
          fontSize: 14, lineHeight: 1.5, color: "#1f2937",
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>{t.body}</div>

        {isMember && (
          <div style={{ marginTop: 10 }}>
            <ComReactions
              slug={slug}
              targetType="thread"
              targetId={t.id}
              initial={data.reactions?.thread || {}}
              myUserId={meId}
              themeColor={themeColor}
            />
          </div>
        )}

        {(isOwner || isMod) && (
          <div style={{
            display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap",
            paddingTop: 10, borderTop: "1px dashed rgba(0,0,0,0.08)",
          }}>
            <ModBtn onClick={() => modAction("pin", { pinned: !t.pinned })}>
              {t.pinned ? "📌 Entpinnen" : "📌 Anpinnen"}
            </ModBtn>
            <ModBtn onClick={() => modAction("lock", { locked: !t.locked })}>
              {t.locked ? "🔓 Entsperren" : "🔒 Sperren"}
            </ModBtn>
            <ModBtn danger onClick={() => {
              if (confirm("Thread komplett löschen?")) modAction("delete");
            }}>🗑 Löschen</ModBtn>
          </div>
        )}
      </div>

      {/* Replies */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {data.replies.map((r) => (
          <div key={r.id} style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(10px)",
            borderRadius: 12, padding: 12,
            border: "1px solid rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>
              {r.authorEmoji || "👤"}{" "}
              <Link href={`/u/${r.authorUsername}`} style={{ color: themeColor, fontWeight: 700 }}>
                {r.authorDisplayName || r.authorUsername}
              </Link>
              {" "} · {" "} {relTime(r.createdAt)}
              {(isOwner || isMod) && (
                <button onClick={() => {
                  if (confirm("Antwort löschen?")) modAction("deleteReply", { replyId: r.id });
                }} style={{
                  marginLeft: 8, background: "transparent", border: "none",
                  color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 700,
                }}>🗑</button>
              )}
            </div>
            <div style={{
              fontSize: 14, lineHeight: 1.5, color: "#1f2937",
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>{r.body}</div>
            {isMember && (
              <div style={{ marginTop: 6 }}>
                <ComReactions
                  slug={slug}
                  targetType="reply"
                  targetId={r.id}
                  initial={data.reactions?.replies?.[r.id] || {}}
                  myUserId={meId}
                  themeColor={themeColor}
                  compact
                />
              </div>
            )}
          </div>
        ))}
        {data.replies.length === 0 && (
          <div style={{
            color: "#fff", textAlign: "center", padding: 14,
            textShadow: "0 1px 3px rgba(0,0,0,0.3)",
            fontSize: 12, opacity: 0.85,
          }}>Noch keine Antworten — sei der Erste!</div>
        )}
      </div>

      {/* Reply-Form */}
      {t.locked ? (
        <div style={{
          background: "rgba(254,242,242,0.95)", color: "#991b1b",
          padding: 12, borderRadius: 12, textAlign: "center",
          fontWeight: 700, fontSize: 13,
        }}>🔒 Thread gesperrt — keine neuen Antworten möglich.</div>
      ) : isMember ? (
        <form onSubmit={postReply} style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderRadius: 14, padding: 12,
          border: `2px solid ${themeColor}33`,
        }}>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Deine Antwort…"
            maxLength={4000}
            style={{
              width: "100%", minHeight: 70, padding: "8px 10px",
              borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)",
              fontSize: 14, fontFamily: "inherit", resize: "vertical",
            }}
            required
          />
          <div style={{ display: "flex", alignItems: "center", marginTop: 8, gap: 8 }}>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{reply.length}/4000</div>
            <div style={{ flex: 1 }} />
            <button type="submit" disabled={busy} style={{
              background: `linear-gradient(135deg, ${themeColor}, ${shade(themeColor, -20)})`,
              color: "#fff", border: "none", padding: "8px 18px", borderRadius: 999,
              fontWeight: 800, cursor: busy ? "wait" : "pointer", fontSize: 13,
              boxShadow: `0 2px 8px ${themeColor}66`,
              opacity: busy ? 0.6 : 1,
            }}>
              {busy ? "Senden…" : "✎ Antworten"}
            </button>
          </div>
        </form>
      ) : (
        <div style={{
          background: "rgba(255,255,255,0.85)", color: "#64748b",
          padding: 12, borderRadius: 12, textAlign: "center",
          fontWeight: 700, fontSize: 12,
        }}>Tritt der Com bei um zu antworten.</div>
      )}

      {err && (
        <div style={{
          background: "#fee2e2", color: "#991b1b",
          padding: 10, borderRadius: 10, marginTop: 10,
          fontSize: 12, fontWeight: 700,
        }}>{err}</div>
      )}
    </div>
  );
}

function ModBtn({ children, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      background: danger ? "#fee2e2" : "#f1f5f9",
      color: danger ? "#991b1b" : "#475569",
      border: "1px solid rgba(0,0,0,0.06)",
      padding: "5px 10px", borderRadius: 999,
      fontWeight: 700, fontSize: 11, cursor: "pointer",
    }}>{children}</button>
  );
}

function relTime(ms) {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "gerade eben";
  const m = Math.floor(s / 60);
  if (m < 60) return `vor ${m} Min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.floor(h / 24);
  if (d < 7) return `vor ${d} Tagen`;
  return new Date(ms).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
}

function shade(hex, percent) {
  const f = parseInt(hex.slice(1), 16);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  const R = f >> 16, G = (f >> 8) & 0xff, B = f & 0xff;
  return "#" + (
    0x1000000 +
    (Math.round((t - R) * p) + R) * 0x10000 +
    (Math.round((t - G) * p) + G) * 0x100 +
    (Math.round((t - B) * p) + B)
  ).toString(16).slice(1);
}
