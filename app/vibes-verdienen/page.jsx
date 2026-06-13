"use client";

// 💰 Vibes-Verdienen-Seite — Werbe-/Reward-Hub.
// Listet alle aktiven Earning-Provider als grosse Tiles auf.
// Klick → laedt den passenden Flow (RewardedAdButton fuer Video/Sim,
// Provider-Link fuer Offer-Walls + Surveys).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import RewardedAdButton from "@/components/RewardedAdButton";

const PROVIDER_THEMES = {
  simulator:   { from: "#22c55e", to: "#15803d" },
  cpx:         { from: "#ef4444", to: "#b91c1c" },
  bitlabs:     { from: "#ec4899", to: "#be185d" },
  ayetstudios: { from: "#2d7dd2", to: "#1e40af" },
  pollfish:    { from: "#f59e0b", to: "#b45309" },
  adgate:      { from: "#a855f7", to: "#7c3aed" },
};

export default function VibesVerdienenPage() {
  const { me } = useMe();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch("/api/ads/status").then((r) => r.ok ? r.json() : null)
      .then(setStatus).catch(() => {});
  }, []);

  if (!me) {
    return (
      <div className="vv-earn-page">
        <div className="vv-earn-empty">
          <div style={{ fontSize: 42, marginBottom: 8 }}>🔑</div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Bitte einloggen</div>
          <Link href="/login?next=/vibes-verdienen" className="vv-earn-cta">Zum Login</Link>
        </div>
      </div>
    );
  }

  if (me.vip) {
    return (
      <div className="vv-earn-page">
        <div className="vv-earn-empty">
          <div style={{ fontSize: 42, marginBottom: 8 }}>💎</div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Du bist VIP</div>
          <div style={{ fontSize: 13, color: "#6b7280", maxWidth: 380, margin: "0 auto" }}>
            VIP-User sehen keine Werbung. Vibes verdienst du in deinem Tempo durch andere Aktivitäten —
            Pinnwand schreiben, Buschfunken, Pet pflegen, Quests, Sammeln.
          </div>
        </div>
      </div>
    );
  }

  const consent = me.adsConsent || 0;
  if (consent !== 1) {
    return (
      <div className="vv-earn-page">
        <div className="vv-earn-empty">
          <div style={{ fontSize: 42, marginBottom: 8 }}>🍪</div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Werbe-Consent fehlt</div>
          <div style={{ fontSize: 13, color: "#6b7280", maxWidth: 380, margin: "0 auto", lineHeight: 1.5 }}>
            Um durch Werbung Vibes zu verdienen, brauchen wir deine Zustimmung zur Anzeige von Werbung.
            Du kannst sie jederzeit im Cookie-Banner unten anpassen.
          </div>
          <button type="button" onClick={async () => {
            try { await api.setAdsConsent?.(1); window.location.reload(); }
            catch { window.location.reload(); }
          }} className="vv-earn-cta" style={{ marginTop: 14 }}>
            ✓ Werbung erlauben & Vibes verdienen
          </button>
        </div>
      </div>
    );
  }

  const providers = status?.config?.earningProviders || [];
  const todayCount = status?.rewardsToday || 0;
  const todayMax = status?.maxRewardsPerDay || 30;
  const todayVibes = status?.vibesToday || 0;
  const todayVibesMax = status?.maxVibesPerDay || 120;

  return (
    <div className="vv-earn-page">
      <div className="vv-earn-hero">
        <Link href="/" className="vv-earn-back">← Start</Link>
        <h1 className="vv-earn-title">💰 Vibes verdienen</h1>
        <p className="vv-earn-sub">
          Hol dir gratis ✨ durch Werbung, Umfragen und Offers. Alles freiwillig, kein Druck. ✿
        </p>

        <div className="vv-earn-stats">
          <div className="vv-earn-stat">
            <div className="vv-earn-stat-num">{todayCount} / {todayMax}</div>
            <div className="vv-earn-stat-lbl">Heute verdient</div>
          </div>
          <div className="vv-earn-stat">
            <div className="vv-earn-stat-num">✨ {todayVibes} / {todayVibesMax}</div>
            <div className="vv-earn-stat-lbl">Vibes heute</div>
          </div>
        </div>
      </div>

      {providers.length === 0 ? (
        <div className="vv-earn-empty">
          <div style={{ fontSize: 42, marginBottom: 8 }}>📭</div>
          <div style={{ fontWeight: 700 }}>Aktuell keine Verdien-Möglichkeiten konfiguriert.</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Komm bald wieder — die Admins setzen das gerade auf.
          </div>
        </div>
      ) : (
        <div className="vv-earn-grid">
          {providers.map((p) => {
            const theme = PROVIDER_THEMES[p.id] || PROVIDER_THEMES.simulator;
            return (
              <div key={p.id} className="vv-earn-tile"
                style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
                <div className="vv-earn-tile-head">
                  <span className="vv-earn-tile-emoji">{p.emoji}</span>
                  <div>
                    <div className="vv-earn-tile-name">{p.name}</div>
                    <div className="vv-earn-tile-type">{p.type === "video" ? "📺 Video" : p.type === "survey" ? "📋 Umfrage" : "🎁 Offer-Wall"}</div>
                  </div>
                  <div className="vv-earn-tile-reward">+{p.rewardAmount} ✨</div>
                </div>
                <div className="vv-earn-tile-desc">{p.description}</div>
                <div className="vv-earn-tile-action">
                  {(p.type === "video" || p.id === "simulator") ? (
                    <RewardedAdButton slot={`hub-${p.id}`} label={`▶ Starten (${p.rewardAmount} ✨)`} />
                  ) : p.offerUrl ? (
                    <a href={p.offerUrl} target="_blank" rel="noopener noreferrer"
                      className="vv-earn-tile-btn">
                      🚀 Öffnen
                    </a>
                  ) : (
                    <div className="vv-earn-tile-soon">Bald verfügbar</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="vv-earn-foot">
        💡 Du kannst max <b>{todayMax}× pro Tag</b> Werbung schauen und bis zu <b>{todayVibesMax} ✨</b> verdienen — danach wartet's auf morgen. So bleibt der Vibes-Markt fair.
      </div>
    </div>
  );
}
