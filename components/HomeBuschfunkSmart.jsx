"use client";

// 📣 Buschfunk auf Startseite — wie FB/IG-Feed: volle Post-Karten zum Scrollen.
//
// Features:
//   • 🟢 Live-Header mit Tick-Counter
//   • 👯 Friend-Posts mit Glow-Highlight
//   • 🆕 „NEU"-Pulse auf Posts <5 Min
//   • Volle Bildanzeige + Sprachnachrichten + Reaktionen
//   • Auto-Refresh alle 60 Sek
//   • Empty-State mit Compose-CTA
//   • Scrollt mit der Seite, kein max-height

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import Avatar from "@/components/Avatar";
import { relTime } from "@/lib/format";
import { useMe } from "@/lib/useMe";

const MAX_POSTS = 30;
const REFRESH_INTERVAL_MS = 60_000;
const NEU_THRESHOLD_MS = 5 * 60_000;

const POST_TYPE_BADGE = {
  quote:        { label: "🌹 Zitat",        color: "#ec4899" },
  feeling:      { label: "💭 Gefühl",       color: "#a855f7" },
  mention:      { label: "👯 Mit-@",        color: "#06b6d4" },
  memory:       { label: "📅 Erinnerung",   color: "#f97316" },
  gift_show:    { label: "🎁 Geschenk",     color: "#fb923c" },
  now_playing:  { label: "🎵 Now-Playing",  color: "#10b981" },
  never_forget: { label: "💔 Nie vergessen", color: "#475569" },
};

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
    finally {
      setTimeout(() => setRefreshing(false), 400);
    }
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

  // Smart-Sorting: Freunde zuerst, dann nach Datum
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
      {/* Live-Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
        padding: "8px 12px", borderRadius: 10,
        background: "linear-gradient(135deg, rgba(168,85,247,0.12), rgba(236,72,153,0.08))",
        border: "1px solid rgba(168,85,247,0.2)",
      }}>
        <span style={{
          width: 10, height: 10, borderRadius: "50%",
          background: refreshing ? "#fbbf24" : "#10b981",
          boxShadow: refreshing ? "0 0 8px #fbbf24" : "0 0 6px rgba(16,185,129,0.6)",
          animation: refreshing ? "vv-bf-pulse 0.6s infinite" : "vv-bf-pulse 2s infinite",
        }} />
        <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: "#475569" }}>
          {refreshing ? "Lade neueste Posts…" : `Live · vor ${secsSinceFetch}s aktualisiert`}
        </div>
        {newCount > 0 && (
          <button
            onClick={() => { setNewCount(0); load(); }}
            style={{
              padding: "4px 10px", borderRadius: 999,
              background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
              border: "none", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
              animation: "vv-bf-pulse 1.4s infinite",
            }}
          >🆕 {newCount} NEU</button>
        )}
        <button
          onClick={load}
          disabled={refreshing}
          title="Aktualisieren"
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(168,85,247,0.15)", border: "none", color: "#7e22ce",
            cursor: refreshing ? "wait" : "pointer", fontSize: 14, fontFamily: "inherit",
            transition: "transform 0.3s",
            transform: refreshing ? "rotate(360deg)" : "rotate(0deg)",
          }}
        >↻</button>
      </div>

      {/* Feed — volle Post-Karten zum Scrollen */}
      {sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {sorted.map((ev) => (
            <PostCard key={`${ev.type}-${ev.postId || ev.actor?.username}-${ev.at}`} ev={ev} />
          ))}
        </div>
      )}

      {/* Footer-CTA — runter zur Vollversion */}
      {sorted.length >= MAX_POSTS && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/buschfunk" style={{
            display: "inline-block", padding: "10px 22px", borderRadius: 999,
            background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.12))",
            color: "#7e22ce", textDecoration: "none", fontSize: 13, fontWeight: 800,
            border: "1px solid rgba(168,85,247,0.3)",
          }}>📣 Noch mehr im Buschfunk →</Link>
        </div>
      )}

      <style>{`
        @keyframes vv-bf-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.7; transform: scale(1.06); }
        }
        @keyframes vv-bf-neu-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(236,72,153,0.6); }
          50%      { box-shadow: 0 0 0 8px rgba(236,72,153,0); }
        }
        @keyframes vv-bf-slide-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function PostCard({ ev }) {
  const ageMs = Date.now() - ev.at;
  const isNew = ageMs < NEU_THRESHOLD_MS;
  const isFriend = !!ev.isFriend;
  const badge = ev.type === "status" && ev.postType && POST_TYPE_BADGE[ev.postType];
  const actor = ev.actor || {};
  const target = ev.target || {};

  // Aktivität bei Nicht-Text-Events (gift, newpic, newuser)
  const activityLine = activitySummary(ev);

  return (
    <div style={{
      background: isFriend
        ? "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(252,231,243,0.6))"
        : "rgba(255,255,255,0.96)",
      borderRadius: 14, padding: "12px 14px",
      border: isFriend ? "2px solid rgba(236,72,153,0.35)" : "1px solid rgba(0,0,0,0.07)",
      boxShadow: isFriend
        ? "0 4px 14px rgba(236,72,153,0.12)"
        : "0 2px 8px rgba(0,0,0,0.04)",
      position: "relative",
      animation: "vv-bf-slide-in 0.4s ease-out",
    }}>
      {isNew && (
        <span style={{
          position: "absolute", top: -8, right: 8,
          background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
          padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 900,
          letterSpacing: 0.5, animation: "vv-bf-neu-pulse 1.6s infinite",
        }}>🆕 NEU</span>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Link href={`/u/${actor.username || ""}`} style={{ flexShrink: 0 }}>
          <Avatar
            url={actor.avatarUrl}
            name={actor.displayName}
            className="vv-avatar"
            style={{ width: 40, height: 40 }}
          />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <Link href={`/u/${actor.username || ""}`} style={{
              fontSize: 14, fontWeight: 800, color: "#1c1c1e", textDecoration: "none",
            }}>{actor.displayName || "?"}</Link>
            {isFriend && (
              <span title="Freund" style={{ fontSize: 11, color: "#ec4899", fontWeight: 900 }}>⭐</span>
            )}
            {badge && (
              <span style={{
                fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 4,
                background: badge.color, color: "#fff", letterSpacing: 0.3,
              }}>{badge.label}</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
            @{actor.username || "?"} · {relTime(ev.at)}
          </div>
        </div>
      </div>

      {/* Body */}
      {ev.detail && (
        <div style={{
          fontSize: 14, lineHeight: 1.55, color: "#1c1c1e",
          whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 8,
        }}>
          {ev.detail}
        </div>
      )}

      {/* Aktivität ohne Text (gift/newpic/newuser) */}
      {!ev.detail && activityLine && (
        <div style={{
          fontSize: 13, color: "#475569", fontStyle: "italic", marginBottom: 8,
        }}>
          {activityLine}
        </div>
      )}

      {/* Bild */}
      {ev.picUrl && (
        <Link href={`/u/${actor.username || ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ev.picUrl} alt="" style={{
            width: "100%", maxHeight: 420, objectFit: "cover",
            borderRadius: 10, marginBottom: 8, display: "block",
          }} />
        </Link>
      )}

      {/* Audio */}
      {ev.audioUrl && (
        <audio controls src={ev.audioUrl} style={{
          width: "100%", height: 36, marginBottom: 8, borderRadius: 8,
        }} />
      )}

      {/* Footer: Profil + Kommentare */}
      <div style={{
        display: "flex", gap: 12, alignItems: "center",
        paddingTop: 8, borderTop: "1px dashed rgba(0,0,0,0.08)",
        fontSize: 12, color: "#64748b",
      }}>
        <Link href={`/u/${actor.username || ""}`} style={{
          color: "#7e22ce", textDecoration: "none", fontWeight: 700,
        }}>→ Profil</Link>
        {ev.type === "gift" && target.username && (
          <Link href={`/u/${target.username}`} style={{
            color: "#f97316", textDecoration: "none", fontWeight: 700,
          }}>🎁 für @{target.username}</Link>
        )}
        {ev.postId > 0 && ["status","pinnwand","gift"].includes(ev.type) && (
          <Link href={`/buschfunk#${ev.type}-${ev.postId}`} style={{
            marginLeft: "auto", color: "#475569", textDecoration: "none", fontWeight: 700,
          }}>💬 Kommentieren</Link>
        )}
      </div>
    </div>
  );
}

function activitySummary(ev) {
  const actor = ev.actor?.displayName || "?";
  const target = ev.target?.displayName || "?";
  if (ev.type === "gift") return `${actor} hat ${target} ein Geschenk geschickt 🎁`;
  if (ev.type === "newpic") return `${actor} hat ein neues Profilbild ✨`;
  if (ev.type === "newuser") return `${actor} ist neu bei VibeVibo 👋`;
  if (ev.type === "grouppost") return `${actor} hat in einer Gruppe gepostet`;
  return null;
}

function EmptyState() {
  return (
    <div style={{
      textAlign: "center", padding: "30px 14px",
      background: "linear-gradient(135deg, rgba(236,72,153,0.08), rgba(168,85,247,0.06))",
      borderRadius: 14, border: "2px dashed rgba(236,72,153,0.25)",
    }}>
      <div style={{ fontSize: 44, marginBottom: 8 }}>📭</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#831843", marginBottom: 6 }}>
        Hier ist es noch still …
      </div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>
        Sei der/die Erste heute! Ein Status, ein Zitat, eine Erinnerung —
        was beschäftigt dich gerade?
      </div>
      <Link href="/buschfunk/neu" style={{
        display: "inline-block", padding: "10px 20px", borderRadius: 999,
        background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
        textDecoration: "none", fontWeight: 800, fontSize: 13,
        boxShadow: "0 4px 12px rgba(236,72,153,0.35)",
      }}>📌 Jetzt was posten</Link>
    </div>
  );
}
