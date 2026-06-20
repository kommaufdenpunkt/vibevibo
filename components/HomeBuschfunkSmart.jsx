"use client";

// 📣 Smart-Buschfunk für die Startseite — schmaler, lebendiger als die volle Komponente.
//
// Features:
//   • 🟢 Live-Header mit Tick-Counter („vor 8 Sek aktualisiert")
//   • 👯 Friends-First-Sorting + Glow-Hervorhebung
//   • 🆕 „NEU"-Pulse auf Posts <5 Min
//   • 🔥 Trending-Highlight für meist-reagierten Post der letzten Stunde
//   • Auto-Refresh alle 60 Sek + Pull-to-Refresh-Button
//   • Smart-Empty-State mit Compose-CTA
//   • Kompakt: max 12 Posts auf einen Blick
//   • Volle Version unter /buschfunk

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import Avatar from "@/components/Avatar";
import { relTime } from "@/lib/format";
import { useMe } from "@/lib/useMe";

const MAX_POSTS = 12;
const REFRESH_INTERVAL_MS = 60_000;
const NEU_THRESHOLD_MS = 5 * 60_000;
const TRENDING_WINDOW_MS = 60 * 60_000;

const TYPE_ICON = {
  status: "💬", pinnwand: "📌", gift: "🎁",
  grouppost: "🏘", newpic: "🖼", "newuser": "✨",
};
const TYPE_COLOR = {
  status: "#a855f7", pinnwand: "#ec4899", gift: "#f97316",
  grouppost: "#10b981", newpic: "#06b6d4", newuser: "#fbbf24",
};
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
      const next = (d.events || []).slice(0, 80);
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

  // Tick alle 10s für „vor X Sek"-Anzeige
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(iv);
  }, []);

  // Wenn User die Komponente sieht → newCount zurücksetzen
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

  // Trending: höchste boostedUntil (= Post mit Boost) der letzten Stunde
  const trending = useMemo(() => {
    const now = Date.now();
    return events.find((e) =>
      e.type === "status" && e.boostedUntil > now && (now - e.at) < TRENDING_WINDOW_MS
    );
  }, [events]);

  const secsSinceFetch = lastFetch ? Math.floor((Date.now() - lastFetch) / 1000) : 0;
  // Force re-eval via tick
  void tick;

  return (
    <div style={{ position: "relative" }}>
      {/* Live-Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
        padding: "8px 10px", borderRadius: 10,
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
          {refreshing ? "Lade neueste Posts…" : `Live · aktualisiert vor ${secsSinceFetch}s`}
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

      {/* Trending-Banner */}
      {trending && (
        <div style={{
          background: "linear-gradient(135deg, #fef3c7, #fde68a)",
          border: "2px solid #f59e0b",
          borderRadius: 10, padding: "8px 12px", marginBottom: 10,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>🔥</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: "#92400e", letterSpacing: 0.5, textTransform: "uppercase" }}>
              Trending · {relTime(trending.at)}
            </div>
            <div style={{ fontSize: 12, color: "#7c2d12", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              <b>@{trending.actor?.username}</b>: {(trending.detail || "").slice(0, 80)}
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      {sorted.length === 0 ? (
        <EmptyState me={me} />
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {sorted.map((ev) => (
            <PostRow key={`${ev.type}-${ev.postId || ev.actor?.username}-${ev.at}`} ev={ev} />
          ))}
        </div>
      )}

      {/* Footer-CTA */}
      {sorted.length > 0 && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <Link href="/buschfunk" style={{
            display: "inline-block", padding: "8px 16px", borderRadius: 999,
            background: "rgba(168,85,247,0.12)", color: "#7e22ce",
            textDecoration: "none", fontSize: 12, fontWeight: 800,
            border: "1px solid rgba(168,85,247,0.25)",
          }}>📣 Alle Posts ansehen →</Link>
        </div>
      )}

      <style>{`
        @keyframes vv-bf-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.7; transform: scale(1.06); }
        }
        @keyframes vv-bf-neu-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(236,72,153,0.5); }
          50%      { box-shadow: 0 0 0 6px rgba(236,72,153,0); }
        }
        @keyframes vv-bf-slide-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function PostRow({ ev }) {
  const ageMs = Date.now() - ev.at;
  const isNew = ageMs < NEU_THRESHOLD_MS;
  const isFriend = !!ev.isFriend;
  const typeIcon = TYPE_ICON[ev.type] || "✨";
  const typeColor = TYPE_COLOR[ev.type] || "#94a3b8";
  const badge = ev.type === "status" && ev.postType && POST_TYPE_BADGE[ev.postType];

  return (
    <Link href={`/u/${ev.actor?.username || ""}`} style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "8px 10px", borderRadius: 10,
      background: isFriend
        ? "linear-gradient(135deg, rgba(236,72,153,0.06), rgba(168,85,247,0.04))"
        : "rgba(255,255,255,0.75)",
      border: isFriend ? "1px solid rgba(236,72,153,0.25)" : "1px solid rgba(0,0,0,0.06)",
      textDecoration: "none", color: "#1c1c1e",
      transition: "transform 0.18s",
      animation: "vv-bf-slide-in 0.35s ease-out",
      position: "relative",
    }}>
      {isNew && (
        <span style={{
          position: "absolute", top: -6, right: -4,
          background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
          padding: "2px 6px", borderRadius: 999, fontSize: 9, fontWeight: 900,
          letterSpacing: 0.4, animation: "vv-bf-neu-pulse 1.6s infinite",
        }}>🆕 NEU</span>
      )}

      <Avatar
        url={ev.actor?.avatarUrl}
        name={ev.actor?.displayName}
        className="vv-avatar vv-avatar-sm"
        style={{ width: 32, height: 32, flexShrink: 0 }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 11, color: "#64748b", marginBottom: 2,
        }}>
          <span style={{ fontSize: 13 }}>{typeIcon}</span>
          <b style={{ color: typeColor, fontSize: 12 }}>{ev.actor?.displayName || "?"}</b>
          {isFriend && <span style={{ fontSize: 9, color: "#ec4899", fontWeight: 900 }}>⭐</span>}
          <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.7 }}>{relTime(ev.at)}</span>
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.4, color: "#334155", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          {badge && (
            <span style={{
              fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 3,
              background: badge.color, color: "#fff", letterSpacing: 0.3,
            }}>{badge.label}</span>
          )}
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {ev.detail || activitySummary(ev)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function activitySummary(ev) {
  if (ev.type === "gift") return `${ev.actor?.displayName} hat ${ev.target?.displayName} ein Geschenk geschickt 🎁`;
  if (ev.type === "newpic") return "Neues Profilbild ✨";
  if (ev.type === "newuser") return "Ist neu bei VibeVibo 👋";
  if (ev.type === "grouppost") return "Post in einer Gruppe";
  return "Aktivität";
}

function EmptyState({ me }) {
  return (
    <div style={{
      textAlign: "center", padding: "26px 12px",
      background: "linear-gradient(135deg, rgba(236,72,153,0.08), rgba(168,85,247,0.06))",
      borderRadius: 12, border: "2px dashed rgba(236,72,153,0.25)",
    }}>
      <div style={{ fontSize: 38, marginBottom: 6 }}>📭</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#831843", marginBottom: 4 }}>
        Hier ist es noch still …
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, lineHeight: 1.5 }}>
        Sei der/die Erste heute! Ein Status, ein Zitat, eine Erinnerung — was beschäftigt dich?
      </div>
      <Link href="/buschfunk/neu" style={{
        display: "inline-block", padding: "8px 18px", borderRadius: 999,
        background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
        textDecoration: "none", fontWeight: 800, fontSize: 13,
        boxShadow: "0 4px 12px rgba(236,72,153,0.35)",
      }}>📌 Jetzt was posten</Link>
    </div>
  );
}
