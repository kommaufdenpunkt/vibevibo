"use client";

// 🗺 KARTE — 2007er-Stil mit Hero, Quick-Tiles, prominenter 1-Klick-PWA-Install + bunter Map-Frame.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMe } from "@/lib/useMe";
import WorldMap from "@/components/WorldMap";
import InstallNow from "@/components/InstallNow";
import PwaInfo from "@/components/PwaInfo";
import { api } from "@/lib/api";

export default function KartePage() {
  const { me, loading } = useMe();
  const [vibo, setVibo] = useState(null);

  useEffect(() => {
    if (!me) return;
    api.viboGet().then(setVibo).catch(() => {});
  }, [me]);

  if (loading) return null;

  if (!me) return (
    <div className="vv-karte-page">
      <div className="vv-karte-hero">
        <div className="vv-karte-hero-stars">
          <span>✨</span><span>★</span><span>✿</span><span>♡</span><span>♥</span><span>★</span><span>✿</span><span>✩</span>
        </div>
        <div className="vv-karte-hero-emoji">🗺</div>
        <h1 className="vv-karte-hero-title">★ REALITÄTSKARTE ★</h1>
        <div className="vv-karte-hero-sub">Erst einloggen, dann auf Item-Jagd gehen!</div>
        <Link href="/login" className="vv-karte-pwa-cta">🔑 Jetzt einloggen</Link>
      </div>
    </div>
  );

  return (
    <div className="vv-karte-page">
      {/* ★ HERO ★ */}
      <div className="vv-karte-hero">
        <div className="vv-karte-hero-stars">
          <span>🗺</span><span>★</span><span>🐾</span><span>♡</span><span>✨</span><span>★</span><span>🎣</span><span>✩</span>
        </div>
        <div className="vv-karte-hero-emoji">🗺</div>
        <h1 className="vv-karte-hero-title">★ DIE REALITÄTSKARTE ★</h1>
        <div className="vv-karte-hero-sub">
          ✿ Items sammeln · Basar besuchen · Fischen · Pflege-Orte finden · VIBO mit auf Tour ✿
        </div>

        {/* Quick-Tiles */}
        <div className="vv-karte-quick">
          <Link href="/vibo" className="vv-karte-quick-tile" data-tone="violet">
            <span className="vv-karte-quick-emoji">🥚</span>
            <span>VIBO</span>
          </Link>
          <Link href="/shop" className="vv-karte-quick-tile" data-tone="gold">
            <span className="vv-karte-quick-emoji">🛍</span>
            <span>Shop</span>
          </Link>
          <Link href="/profile/transactions" className="vv-karte-quick-tile" data-tone="green">
            <span className="vv-karte-quick-emoji">💰</span>
            <span>Vibes</span>
          </Link>
          <Link href="/profile" className="vv-karte-quick-tile" data-tone="pink">
            <span className="vv-karte-quick-emoji">👤</span>
            <span>Profil</span>
          </Link>
        </div>

        {/* VIBO-Stats wenn vorhanden */}
        {vibo && !vibo.died_at && (
          <div className="vv-karte-vibo-stats">
            <div className="vv-karte-vibo-line">
              🐾 <b>{vibo.name || "Dein VIBO"}</b> ist mit dir auf der Karte
            </div>
            <div className="vv-karte-vibo-bars">
              <div className="vv-karte-stat" title="Hunger">🍕 <div><div style={{ width: `${vibo.hunger || 0}%` }} /></div></div>
              <div className="vv-karte-stat" title="Affection">💗 <div><div style={{ width: `${vibo.affection || 0}%` }} /></div></div>
              <div className="vv-karte-stat" title="Health">💚 <div><div style={{ width: `${vibo.health || 0}%` }} /></div></div>
            </div>
          </div>
        )}
      </div>

      {/* 📲 1-Klick-PWA-Install Promo-Banner */}
      <div className="vv-karte-pwa-promo">
        <div className="vv-karte-pwa-promo-emoji">📲</div>
        <div className="vv-karte-pwa-promo-text">
          <div className="vv-karte-pwa-promo-title">🐾 Mein VIBO als eigene App!</div>
          <div className="vv-karte-pwa-promo-sub">
            Karte + VIBO-Pflege + Push-Benachrichtigungen — 1 Klick & startet wie eine echte App vom Home-Bildschirm.
          </div>
        </div>
        <div className="vv-karte-pwa-promo-btn">
          <InstallNow appName="Mein VIBO" appEmoji="🐾" appColor="#ec4899" />
        </div>
      </div>

      {/* 🗺 Map-Frame im 2007er-Stil */}
      <div className="vv-karte-frame">
        <div className="vv-karte-frame-title">★ WELT-KARTE — KLICK & SAMMEL ★</div>
        <div className="vv-karte-frame-body">
          <WorldMap />
        </div>
      </div>

      {/* Hinweis-Boxen */}
      <div className="vv-karte-tips">
        <div className="vv-karte-tip" data-tone="pink">
          <span className="vv-karte-tip-emoji">📍</span>
          <div>
            <b>Standort freigeben</b><br/>
            <span>Die Karte zentriert auf deine Position. Du musst den Browser-Standort einmalig erlauben.</span>
          </div>
        </div>
        <div className="vv-karte-tip" data-tone="violet">
          <span className="vv-karte-tip-emoji">🎁</span>
          <div>
            <b>Items einsammeln</b><br/>
            <span>Auf der Karte erscheinen alle paar Minuten Items. Geh näher dran, dann „Einsammeln" tippen.</span>
          </div>
        </div>
        <div className="vv-karte-tip" data-tone="cyan">
          <span className="vv-karte-tip-emoji">🎣</span>
          <div>
            <b>Fischen am Wasser</b><br/>
            <span>An Seen & Flüssen kannst du angeln — seltene Fische landen in deinem Sammelbuch.</span>
          </div>
        </div>
        <div className="vv-karte-tip" data-tone="gold">
          <span className="vv-karte-tip-emoji">🏪</span>
          <div>
            <b>Basar besuchen</b><br/>
            <span>Lokale Händler verkaufen Spezialitäten. Du kannst auch eigene Fänge im Basar verkaufen.</span>
          </div>
        </div>
      </div>

      <PwaInfo id="pwa-vibo" appName="Mein VIBO" appEmoji="🐾"
        appPurpose="dein VIBO + die Realitätskarte" />

      <div className="vv-karte-footer">
        <span>★</span>
        <span>Realitätskarte v2.7 · live · Standort-Schutz aktiv · Items respawnen alle 2-5 Minuten</span>
        <span>★</span>
      </div>
    </div>
  );
}
