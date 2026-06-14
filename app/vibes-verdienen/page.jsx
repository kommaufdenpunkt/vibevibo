"use client";

// 💰 Vibes verdienen + 💝 Empfehlungen — zusammengeführt mit Tabs.
// Nutzt bestehende .vv-earn-* CSS-Klassen für Konsistenz.

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import RewardedAdButton from "@/components/RewardedAdButton";
import { AMAZON_RECOMMENDATIONS, amazonSearch } from "@/lib/affiliate";

const PROVIDER_THEMES = {
  simulator:   { from: "#22c55e", to: "#15803d" },
  cpx:         { from: "#ef4444", to: "#b91c1c" },
  bitlabs:     { from: "#ec4899", to: "#be185d" },
  ayetstudios: { from: "#2d7dd2", to: "#1e40af" },
  pollfish:    { from: "#f59e0b", to: "#b45309" },
  adgate:      { from: "#a855f7", to: "#7c3aed" },
};

// Inline-Tab-Stile (kompakt, kein CSS-Patch nötig)
const TAB_BAR = {
  display: "flex", gap: 6, justifyContent: "center",
  margin: "10px auto 0", flexWrap: "wrap",
};
const TAB_BASE = {
  padding: "8px 14px", borderRadius: 999,
  border: "2px solid rgba(255,255,255,0.4)",
  background: "rgba(255,255,255,0.18)", color: "#fff",
  fontWeight: 700, fontSize: 13, cursor: "pointer",
  transition: "all 0.15s",
};
const TAB_ACTIVE = {
  background: "#fff", color: "#8b5cf6",
  borderColor: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
};

export default function VibesPlusPage() {
  return (
    <Suspense fallback={null}>
      <VibesPlusPageInner />
    </Suspense>
  );
}

function VibesPlusPageInner() {
  const { me } = useMe();
  const params = useSearchParams();
  const initialTab = params.get("tab") === "empfehlungen" ? "rec" : "earn";
  const [tab, setTab] = useState(initialTab);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch("/api/ads/status").then((r) => r.ok ? r.json() : null)
      .then(setStatus).catch(() => {});
  }, []);

  const todayCount = status?.rewardsToday || 0;
  const todayMax = status?.maxRewardsPerDay || 30;
  const todayVibes = status?.vibesToday || 0;
  const todayVibesMax = status?.maxVibesPerDay || 120;
  const providers = status?.config?.earningProviders || [];

  return (
    <div className="vv-earn-page">
      <div className="vv-earn-hero" style={{ paddingBottom: 14 }}>
        <Link href="/" className="vv-earn-back">← Start</Link>
        <h1 className="vv-earn-title" style={{ fontSize: 22, margin: "4px 0 2px" }}>
          💰 Vibes &amp; Empfehlungen
        </h1>
        <p className="vv-earn-sub" style={{ fontSize: 12, opacity: 0.92, marginBottom: 8 }}>
          Gratis ✨ durch Werbung &amp; Umfragen — oder Nostalgie shoppen (Amazon-Affiliate). ✿
        </p>

        {/* Kompakte Inline-Stats nur im Earn-Tab */}
        {tab === "earn" && me && !me.vip && (
          <div style={{
            display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap",
            fontSize: 12, color: "#fff", opacity: 0.95,
          }}>
            <span style={{ background: "rgba(0,0,0,0.2)", padding: "3px 10px", borderRadius: 999 }}>
              <b>{todayCount}/{todayMax}</b> Rewards heute
            </span>
            <span style={{ background: "rgba(0,0,0,0.2)", padding: "3px 10px", borderRadius: 999 }}>
              <b>✨ {todayVibes}/{todayVibesMax}</b> Vibes heute
            </span>
          </div>
        )}

        {/* Tabs */}
        <div style={TAB_BAR}>
          <button type="button" onClick={() => setTab("earn")}
            style={tab === "earn" ? { ...TAB_BASE, ...TAB_ACTIVE } : TAB_BASE}>
            💰 Verdienen
          </button>
          <button type="button" onClick={() => setTab("rec")}
            style={tab === "rec" ? { ...TAB_BASE, ...TAB_ACTIVE } : TAB_BASE}>
            💝 Empfehlungen
          </button>
        </div>
      </div>

      {tab === "earn" && (
        <EarnTab me={me} providers={providers} todayMax={todayMax} todayVibesMax={todayVibesMax} />
      )}

      {tab === "rec" && <RecTab />}
    </div>
  );
}

function EarnTab({ me, providers, todayMax, todayVibesMax }) {
  if (!me) {
    return (
      <div className="vv-earn-empty">
        <div style={{ fontSize: 36 }}>🔑</div>
        <div style={{ fontWeight: 800, marginTop: 4 }}>Bitte einloggen</div>
        <Link href="/login?next=/vibes-verdienen" className="vv-earn-cta">Zum Login</Link>
      </div>
    );
  }

  if (me.vip) {
    return (
      <div className="vv-earn-empty">
        <div style={{ fontSize: 36 }}>💎</div>
        <div style={{ fontWeight: 800, marginTop: 4 }}>Du bist VIP</div>
        <div style={{ fontSize: 12, color: "#6b7280", maxWidth: 380, margin: "6px auto 0" }}>
          Keine Werbung für dich. Vibes verdienst du durch Pinnwand, Buschfunk, Pet, Quests &amp; Sammeln.
        </div>
      </div>
    );
  }

  const consent = me.adsConsent || 0;
  if (consent !== 1) {
    return (
      <div className="vv-earn-empty">
        <div style={{ fontSize: 36 }}>🍪</div>
        <div style={{ fontWeight: 800, marginTop: 4 }}>Werbe-Consent fehlt</div>
        <div style={{ fontSize: 12, color: "#6b7280", maxWidth: 380, margin: "6px auto 0", lineHeight: 1.5 }}>
          Wir brauchen deine Zustimmung zur Anzeige von Werbung — im Cookie-Banner unten anpassbar.
        </div>
        <button type="button" onClick={async () => {
          try { await api.setAdsConsent?.(1); window.location.reload(); }
          catch { window.location.reload(); }
        }} className="vv-earn-cta" style={{ marginTop: 10 }}>
          ✓ Werbung erlauben
        </button>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="vv-earn-empty">
        <div style={{ fontSize: 36 }}>📭</div>
        <div style={{ fontWeight: 700, marginTop: 4 }}>Aktuell keine Verdien-Möglichkeiten</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Komm bald wieder.</div>
      </div>
    );
  }

  return (
    <>
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
                  <a href={p.offerUrl} target="_blank" rel="noopener noreferrer" className="vv-earn-tile-btn">
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
      <div className="vv-earn-foot">
        💡 Max <b>{todayMax}× pro Tag</b> Werbung · bis zu <b>{todayVibesMax} ✨</b> · danach wartet's auf morgen.
      </div>
    </>
  );
}

function RecTab() {
  return (
    <>
      <div className="vv-emp-grid">
        {AMAZON_RECOMMENDATIONS.map((p) => (
          <a key={p.id}
            href={amazonSearch(p.query)}
            target="_blank" rel="noopener sponsored"
            className="vv-emp-card"
            style={{ "--vv-emp-color": p.color }}>
            <div className="vv-emp-card-emoji">{p.emoji}</div>
            <h3 className="vv-emp-card-title">{p.title}</h3>
            <p className="vv-emp-card-desc">{p.desc}</p>
            <div className="vv-emp-card-cta">🛒 Auf Amazon ansehen</div>
          </a>
        ))}
      </div>
      <div className="vv-earn-foot">
        🔗 <b>Werbung · Affiliate:</b> Käufe auf Amazon bringen uns ~3% Provision — der Preis bleibt für dich gleich. Hält den Server am Laufen. ♥
      </div>
    </>
  );
}
