"use client";

// 📣 Buschfunk Startseite — 2006er SchülerVZ/Jappy-Style.
//
// Nostalgie-Elemente:
//   • Ridge-Borders (3px), Glitzer-Decorations
//   • Word-Art-Style Names mit Schatten
//   • Pink/Cyan/Violett Gradient-Header
//   • Marquee-Live-Ticker
//   • ✿ ❀ ★ ♥ Trenner
//   • Comic-Bubble-Layout je Post
//   • Friend-Bling mit Stern-Border

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import Avatar from "@/components/Avatar";
import { useMe } from "@/lib/useMe";

const MAX_POSTS = 30;
const REFRESH_INTERVAL_MS = 60_000;
const NEU_THRESHOLD_MS = 5 * 60_000;

const POST_TYPE_BADGE = {
  quote:        { label: "✦ ZITAT ✦",        color: "#ec4899" },
  feeling:      { label: "♥ GEFÜHL ♥",       color: "#a855f7" },
  mention:      { label: "✿ MIT-@ ✿",        color: "#06b6d4" },
  memory:       { label: "★ ERINNERUNG ★",   color: "#f97316" },
  gift_show:    { label: "❀ GESCHENK ❀",     color: "#f97316" },
  now_playing:  { label: "♪ MUSIK ♪",        color: "#10b981" },
  never_forget: { label: "✧ NIE VERGESSEN ✧", color: "#475569" },
};

// Farb-Rotation pro Post (Pink/Cyan/Violet/Gold) — wie wkw/Jappy mit bunten Boxen
const POST_TONES = [
  { border: "#ec4899", titleBg: "linear-gradient(135deg,#ec4899,#db2777)", body: "linear-gradient(180deg,#fff,#fdf2f8)" },
  { border: "#a855f7", titleBg: "linear-gradient(135deg,#a855f7,#9333ea)", body: "linear-gradient(180deg,#fff,#faf5ff)" },
  { border: "#06b6d4", titleBg: "linear-gradient(135deg,#06b6d4,#0891b2)", body: "linear-gradient(180deg,#fff,#ecfeff)" },
  { border: "#f59e0b", titleBg: "linear-gradient(135deg,#f59e0b,#d97706)", body: "linear-gradient(180deg,#fff,#fffbeb)" },
];

function timeAgoDe(ms) {
  const diff = Math.max(0, Date.now() - ms);
  const s = Math.floor(diff / 1000);
  if (s < 60) return "gerade eben";
  const m = Math.floor(s / 60);
  if (m < 60) return `vor ${m} Min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.floor(h / 24);
  if (d < 7) return `vor ${d} Tagen`;
  return new Date(ms).toLocaleDateString("de-DE");
}

export default function HomeBuschfunkSmart() {
  const { me } = useMe();
  const [events, setEvents] = useState([]);
  const [lastFetch, setLastFetch] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const lastSeenAtRef = useRef(0);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await api.buschfunk();
      const next = (d.events || []).slice(0, 100);
      if (lastSeenAtRef.current > 0) {
        const fresh = next.filter((e) => e.at > lastSeenAtRef.current).length;
        if (fresh > 0) setNewCount(fresh);
      }
      setEvents(next);
      setLastFetch(Date.now());
    } catch {}
    finally { setTimeout(() => setRefreshing(false), 400); }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [load]);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (events.length > 0) lastSeenAtRef.current = events[0].at;
  }, [events]);

  const sorted = useMemo(() => {
    const arr = [...events];
    arr.sort((a, b) => {
      if (a.isFriend !== b.isFriend) return a.isFriend ? -1 : 1;
      return (b.at || 0) - (a.at || 0);
    });
    return arr.slice(0, MAX_POSTS);
  }, [events]);

  const secsSinceFetch = lastFetch ? Math.floor((Date.now() - lastFetch) / 1000) : 0;
  void tick;

  return (
    <div>
      {/* Live-Ticker — wie damals: blinkender Punkt + Marquee-Style */}
      <div style={{
        background: "linear-gradient(135deg, #fce7f3, #f5d0fe, #ddd6fe)",
        border: "3px ridge #ec4899",
        borderRadius: 10, padding: "8px 12px", marginBottom: 14,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{
          width: 12, height: 12, borderRadius: "50%",
          background: refreshing ? "#fbbf24" : "#22c55e",
          boxShadow: refreshing ? "0 0 10px #fbbf24" : "0 0 8px #22c55e",
          animation: "vv-nost-blink 1s steps(2, end) infinite",
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 12, fontWeight: 900, color: "#831843",
          letterSpacing: 1, textShadow: "0 1px 0 #fff",
          flex: 1,
        }}>
          ✿ LIVE-BUSCHFUNK · vor {secsSinceFetch}s aktualisiert ✿
        </span>
        {newCount > 0 && (
          <button onClick={() => { setNewCount(0); load(); }} style={{
            padding: "4px 10px", borderRadius: 999,
            background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
            border: "2px ridge #fff", fontSize: 11, fontWeight: 900,
            cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5,
            animation: "vv-nost-pulse 1.2s infinite",
          }}>★ {newCount} NEU ★</button>
        )}
        <button onClick={load} disabled={refreshing} title="Neu laden" style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg, #fff, #fce7f3)",
          border: "2px ridge #ec4899", color: "#831843",
          cursor: refreshing ? "wait" : "pointer", fontSize: 14, fontFamily: "inherit",
          transition: "transform 0.3s",
          transform: refreshing ? "rotate(360deg)" : "rotate(0deg)",
        }}>↻</button>
      </div>

      {/* Feed */}
      {sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {sorted.map((ev, i) => (
            <NostalgicPostCard
              key={`${ev.type}-${ev.postId || ev.actor?.username}-${ev.at}`}
              ev={ev}
              tone={POST_TONES[i % POST_TONES.length]}
            />
          ))}
        </div>
      )}

      {sorted.length >= MAX_POSTS && (
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <Link href="/buschfunk" style={{
            display: "inline-block", padding: "10px 22px", borderRadius: 10,
            background: "linear-gradient(135deg, #ec4899, #a855f7, #06b6d4)",
            backgroundSize: "200% 100%",
            color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 900,
            border: "3px ridge #fff", letterSpacing: 1,
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            animation: "vv-nost-wave 4s ease-in-out infinite",
          }}>✿ Noch mehr im Buschfunk ✿</Link>
        </div>
      )}

      <style>{`
        @keyframes vv-nost-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
        @keyframes vv-nost-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes vv-nost-wave {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes vv-nost-sparkle {
          0%, 100% { opacity: 0.6; transform: rotate(0deg); }
          50% { opacity: 1; transform: rotate(180deg); }
        }
        @keyframes vv-nost-slide-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes vv-nost-neu-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(236,72,153,0.6); transform: rotate(-3deg); }
          50%      { box-shadow: 0 0 0 10px rgba(236,72,153,0); transform: rotate(3deg); }
        }
      `}</style>
    </div>
  );
}

function NostalgicPostCard({ ev, tone }) {
  const ageMs = Date.now() - ev.at;
  const isNew = ageMs < NEU_THRESHOLD_MS;
  const isFriend = !!ev.isFriend;
  const badge = ev.type === "status" && ev.postType && POST_TYPE_BADGE[ev.postType];
  const actor = ev.actor || {};
  const target = ev.target || {};
  const activityLine = activitySummary(ev);

  const typeLabel = typeLabelOf(ev);

  return (
    <div style={{
      borderRadius: 14, overflow: "hidden",
      border: isFriend ? "4px ridge #ec4899" : `3px ridge ${tone.border}`,
      boxShadow: isFriend
        ? "0 4px 14px rgba(236,72,153,0.25), inset 0 0 0 1px rgba(255,255,255,0.6)"
        : "0 3px 10px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.6)",
      background: tone.body,
      position: "relative",
      animation: "vv-nost-slide-in 0.45s ease-out",
    }}>
      {/* NEU-Bling */}
      {isNew && (
        <span style={{
          position: "absolute", top: -10, right: 10,
          background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
          padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 900,
          letterSpacing: 1, border: "2px ridge #fff",
          textShadow: "0 1px 1px rgba(0,0,0,0.3)",
          animation: "vv-nost-neu-pulse 1.6s infinite",
          zIndex: 2,
        }}>★ NEU ★</span>
      )}

      {/* Header-Streifen — Gradient mit Typ-Label */}
      <div style={{
        padding: "6px 12px",
        background: tone.titleBg,
        color: "#fff",
        fontSize: 11, fontWeight: 900, letterSpacing: 1,
        textShadow: "0 1px 2px rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", gap: 6,
        borderBottom: "2px ridge rgba(255,255,255,0.6)",
      }}>
        <span style={{ animation: "vv-nost-sparkle 4s ease-in-out infinite" }}>✿</span>
        <span style={{ flex: 1, textTransform: "uppercase" }}>{typeLabel}</span>
        <span style={{ fontSize: 10, opacity: 0.9 }}>{timeAgoDe(ev.at)}</span>
        <span style={{ animation: "vv-nost-sparkle 4s ease-in-out infinite reverse" }}>✿</span>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px" }}>
        {/* Author-Zeile */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <Link href={`/u/${actor.username || ""}`} style={{
            flexShrink: 0, display: "inline-block",
            border: `3px ridge ${tone.border}`, borderRadius: 8, padding: 2,
            background: "#fff",
          }}>
            <Avatar
              url={actor.avatarUrl}
              name={actor.displayName}
              className="vv-avatar"
              style={{ width: 50, height: 50, borderRadius: 6 }}
            />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link href={`/u/${actor.username || ""}`} style={{
              fontSize: 17, fontWeight: 900,
              color: tone.border, textDecoration: "none",
              textShadow: "1px 1px 0 #fff, 2px 2px 0 rgba(0,0,0,0.06)",
              letterSpacing: 0.3,
              display: "inline-block",
            }}>{actor.displayName || "?"}</Link>
            {isFriend && (
              <span title="Freund" style={{
                marginLeft: 6, fontSize: 13, color: "#ec4899",
                animation: "vv-nost-sparkle 3s ease-in-out infinite",
              }}>★</span>
            )}
            <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 1 }}>
              @{actor.username || "?"}
            </div>
          </div>
          {badge && (
            <span style={{
              fontSize: 10, fontWeight: 900, padding: "3px 8px", borderRadius: 999,
              background: badge.color, color: "#fff", letterSpacing: 0.5,
              border: "2px ridge rgba(255,255,255,0.5)",
              textShadow: "0 1px 1px rgba(0,0,0,0.3)",
              whiteSpace: "nowrap",
            }}>{badge.label}</span>
          )}
        </div>

        {/* Trenner */}
        <div style={{
          textAlign: "center", color: tone.border, fontSize: 11, marginBottom: 8,
          letterSpacing: 8, opacity: 0.7,
        }}>✿✿✿</div>

        {/* Post-Text */}
        {ev.detail && (
          <div style={{
            fontSize: 15, lineHeight: 1.55, color: "#1c1c1e",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            padding: "8px 4px",
          }}>
            {ev.detail}
          </div>
        )}

        {!ev.detail && activityLine && (
          <div style={{
            fontSize: 14, color: "#475569", fontStyle: "italic", textAlign: "center",
            padding: "10px 4px",
          }}>
            ♥ {activityLine} ♥
          </div>
        )}

        {/* Bild */}
        {ev.picUrl && (
          <Link href={`/u/${actor.username || ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ev.picUrl} alt="" style={{
              width: "100%", maxHeight: 400, objectFit: "cover",
              borderRadius: 8, marginTop: 8, display: "block",
              border: `2px ridge ${tone.border}`,
            }} />
          </Link>
        )}

        {/* Audio */}
        {ev.audioUrl && (
          <audio controls src={ev.audioUrl} style={{
            width: "100%", height: 36, marginTop: 8, borderRadius: 8,
          }} />
        )}

        {/* Footer-Bling */}
        <div style={{
          marginTop: 10, paddingTop: 8,
          borderTop: `2px dotted ${tone.border}`,
          display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
          fontSize: 12,
        }}>
          <Link href={`/u/${actor.username || ""}`} style={{
            color: tone.border, textDecoration: "none", fontWeight: 800,
            padding: "3px 9px", borderRadius: 999,
            background: "rgba(255,255,255,0.6)",
            border: `1.5px solid ${tone.border}`,
          }}>→ Profil</Link>
          {ev.type === "gift" && target.username && (
            <Link href={`/u/${target.username}`} style={{
              color: "#f97316", textDecoration: "none", fontWeight: 800,
              padding: "3px 9px", borderRadius: 999,
              background: "rgba(255,255,255,0.6)",
              border: "1.5px solid #f97316",
            }}>🎁 für @{target.username}</Link>
          )}
          {ev.postId > 0 && ["status","pinnwand","gift"].includes(ev.type) && (
            <Link href={`/buschfunk#${ev.type}-${ev.postId}`} style={{
              marginLeft: "auto", color: "#475569", textDecoration: "none", fontWeight: 800,
              padding: "3px 9px", borderRadius: 999,
              background: "rgba(255,255,255,0.6)",
              border: "1.5px solid #cbd5e1",
            }}>♥ Kommentar</Link>
          )}
        </div>
      </div>
    </div>
  );
}

function typeLabelOf(ev) {
  if (ev.type === "status") {
    if (ev.postType && POST_TYPE_BADGE[ev.postType]) return POST_TYPE_BADGE[ev.postType].label;
    return "STATUS-POST";
  }
  if (ev.type === "pinnwand") return "PINNWAND-EINTRAG";
  if (ev.type === "gift") return "GESCHENK";
  if (ev.type === "newpic") return "NEUES PROFILBILD";
  if (ev.type === "newuser") return "NEU DABEI";
  if (ev.type === "grouppost") return "GRUPPEN-POST";
  return "AKTIVITÄT";
}

function activitySummary(ev) {
  const actor = ev.actor?.displayName || "?";
  const target = ev.target?.displayName || "?";
  if (ev.type === "gift") return `${actor} hat ${target} ein Geschenk geschickt`;
  if (ev.type === "newpic") return `${actor} hat ein neues Profilbild`;
  if (ev.type === "newuser") return `${actor} ist neu bei VibeVibo`;
  if (ev.type === "grouppost") return `${actor} hat in einer Gruppe gepostet`;
  return null;
}

function EmptyState() {
  return (
    <div style={{
      textAlign: "center", padding: "30px 14px",
      background: "linear-gradient(135deg, #fce7f3, #f5d0fe, #ddd6fe)",
      borderRadius: 12, border: "3px ridge #ec4899",
      boxShadow: "0 4px 14px rgba(236,72,153,0.15)",
    }}>
      <div style={{ fontSize: 50, marginBottom: 8 }}>✿</div>
      <div style={{
        fontSize: 17, fontWeight: 900, color: "#831843", marginBottom: 6,
        letterSpacing: 1, textShadow: "1px 1px 0 #fff",
      }}>
        ★ HIER IST ES NOCH STILL ★
      </div>
      <div style={{ fontSize: 13, color: "#831843", marginBottom: 14, lineHeight: 1.5 }}>
        Sei der/die Erste heute! Ein Status, ein Zitat, eine Erinnerung —<br/>
        was beschäftigt dich gerade?
      </div>
      <Link href="/buschfunk/neu" style={{
        display: "inline-block", padding: "10px 22px", borderRadius: 10,
        background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
        textDecoration: "none", fontWeight: 900, fontSize: 13,
        border: "3px ridge #fff",
        boxShadow: "0 4px 12px rgba(236,72,153,0.35)",
        letterSpacing: 0.5,
      }}>✿ JETZT WAS POSTEN ✿</Link>
    </div>
  );
}
