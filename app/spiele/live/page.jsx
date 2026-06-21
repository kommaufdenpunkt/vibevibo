"use client";

// 🎮 Multi-Live-Spiele-Lobby — Standalone in der Spiele-PWA
//
// Zeigt aktive Multi-Couch-Streams sortiert nach Spiel-Aktivität:
//   - 🔥 läuft jetzt
//   - 🎯 Lobby (kannst noch rein)
//   - 🛋 Multi-Couch ohne Spiel
//
// Auto-Refresh alle 8s damit man sieht wenn neue Lobbies aufgehen.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";

const REFRESH_MS = 8000;

function timeSince(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s / 3600)} h`;
}

export default function SpieleLivePage() {
  const { me, loading: meLoading } = useMe();
  const router = useRouter();
  const [data, setData] = useState({ streams: [], specs: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function load() {
    try {
      const r = await fetch("/api/spiele/lobby", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Laden fehlgeschlagen");
      setData(d);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (meLoading) return;
    if (!me) { router.push("/login?next=/spiele/live"); return; }
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [me, meLoading, router]);

  if (meLoading || !me) {
    return <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>Lädt…</div>;
  }

  const withGame = data.streams.filter((s) => s.game?.status === "playing");
  const inLobby = data.streams.filter((s) => s.game?.status === "lobby");
  const idle = data.streams.filter((s) => !s.game);

  return (
    <div className="vv-spielelobby">
      <div className="vv-spielelobby-hero">
        <Link href="/spiele" className="vv-spielelobby-back">← Spiele</Link>
        <div className="vv-spielelobby-hero-icon">🎲</div>
        <h1 className="vv-spielelobby-title">Live spielen</h1>
        <p className="vv-spielelobby-sub">
          Mit Freunden zocken, dabei Video+Audio. Fidolin moderiert mit.
        </p>
        <div className="vv-spielelobby-cta-row">
          <Link href="/live" className="vv-spielelobby-cta-primary">
            🎬 Eigenes Live starten
          </Link>
          <button type="button" onClick={load} className="vv-spielelobby-cta-ghost">
            ↻ Neu laden
          </button>
        </div>
      </div>

      {err && <div className="vv-spielelobby-err">⚠ {err}</div>}

      {withGame.length > 0 && (
        <Section title="🔥 Läuft gerade" count={withGame.length}>
          {withGame.map((s) => <StreamTile key={s.id} stream={s} highlight />)}
        </Section>
      )}

      {inLobby.length > 0 && (
        <Section title="🎯 Lobby — kannst noch rein" count={inLobby.length}>
          {inLobby.map((s) => <StreamTile key={s.id} stream={s} />)}
        </Section>
      )}

      {idle.length > 0 && (
        <Section title="🛋 Multi-Couch — kein Spiel aktiv" count={idle.length}>
          {idle.map((s) => <StreamTile key={s.id} stream={s} />)}
        </Section>
      )}

      {!loading && data.streams.length === 0 && (
        <div className="vv-spielelobby-empty">
          <div style={{ fontSize: 60, marginBottom: 8 }}>📭</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Niemand spielt gerade.</div>
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 18 }}>
            Sei der/die Erste — starte einen Multi-Couch-Live, lade Freunde dazu, würfelt los.
          </div>
          <Link href="/live" className="vv-spielelobby-cta-primary">🎬 Live starten</Link>
        </div>
      )}

      {data.specs.length > 0 && (
        <Section title="🎮 Verfügbare Spiele">
          <div className="vv-spielelobby-specs">
            {data.specs.map((g) => (
              <div key={g.kind} className="vv-spielelobby-spec">
                <div className="vv-spielelobby-spec-emoji">{g.emoji}</div>
                <div className="vv-spielelobby-spec-name">{g.label}</div>
                <div className="vv-spielelobby-spec-desc">{g.description}</div>
                <div className="vv-spielelobby-spec-meta">
                  👥 {g.minPlayers}-{g.maxPlayers}
                  {g.defaultPot > 0 && ` · ✨ ${g.defaultPot}`}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="vv-spielelobby-footer">
        <span>★</span>
        <span>VibeVibo Spiele · made for play</span>
        <span>★</span>
      </div>
    </div>
  );
}

function Section({ title, count, children }) {
  return (
    <div className="vv-spielelobby-section">
      <div className="vv-spielelobby-section-title">
        <span>{title}</span>
        {count != null && <span className="vv-spielelobby-section-badge">{count}</span>}
      </div>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

function StreamTile({ stream, highlight = false }) {
  const since = timeSince(stream.startedAt);
  const game = stream.game;
  return (
    <Link href={`/live/${stream.id}`} className="vv-spielelobby-tile" data-highlight={highlight ? "1" : "0"}>
      <div className="vv-spielelobby-tile-avatar">
        {stream.owner?.avatarUrl
          ? <img src={stream.owner.avatarUrl} alt="" />
          : <span>{(stream.owner?.displayName || "?").charAt(0).toUpperCase()}</span>}
      </div>
      <div className="vv-spielelobby-tile-body">
        <div className="vv-spielelobby-tile-head">
          <strong>{stream.title || "Multi-Couch"}</strong>
          {game?.status === "playing" && <span className="vv-spielelobby-pill-playing">🎲 läuft</span>}
          {game?.status === "lobby" && <span className="vv-spielelobby-pill-lobby">🎯 Lobby</span>}
        </div>
        <div className="vv-spielelobby-tile-meta">
          @{stream.owner?.username} · 🛋 {stream.hostCount}/{stream.maxHosts}
          {stream.viewerCount > 0 && ` · 👁 ${stream.viewerCount}`}
          {since && ` · ${since}`}
        </div>
        {game && (
          <div className="vv-spielelobby-tile-game">
            {game.kind === "wuerfel" ? "🎲 Würfel-Duell" : game.kind}
            {" · "}
            {game.playerCount} Spieler
            {game.potVibes > 0 && ` · ✨ ${game.potVibes}`}
          </div>
        )}
      </div>
      <div className="vv-spielelobby-tile-arrow">›</div>
    </Link>
  );
}
