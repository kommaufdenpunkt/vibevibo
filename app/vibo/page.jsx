"use client";

// 🥚 VIBO v3 — Generalüberholt zum 2. Mal:
// Transparenter Hintergrund (Theme scheint durch), Glas-Karten,
// kompakter Header-Strip + Tab-Strip + Tab-Content in Glass-Cards.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMe } from "@/lib/useMe";
import ViboPet from "@/components/ViboPet";
import QuestPanel from "@/components/QuestPanel";
import ShopPanel from "@/components/ShopPanel";
import CardCollection from "@/components/CardCollection";
import WorldMap from "@/components/WorldMap";

const TABS = [
  { id: "pet",    icon: "🥚", label: "VIBO" },
  { id: "quests", icon: "🎯", label: "Quests" },
  { id: "shop",   icon: "🛒", label: "Shop" },
  { id: "cards",  icon: "🃏", label: "Karten" },
  { id: "map",    icon: "🗺️", label: "Karte" },
];

// Wrapper mit Suspense — Next.js 15+ braucht das fuer useSearchParams
export default function ViboPageWrapper() {
  return (
    <Suspense fallback={null}>
      <ViboPage />
    </Suspense>
  );
}

function ViboPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState(() => {
    const t = params.get("tab");
    return TABS.find((x) => x.id === t) ? t : "pet";
  });
  const [vibo, setVibo] = useState(null);

  useEffect(() => {
    if (!loading && !me) router.push("/login");
  }, [loading, me, router]);

  // Hole VIBO-Header-Info (Name, Stufe, ageDays) für die Titelzeile
  useEffect(() => {
    if (!me) return;
    fetch("/api/vibo").then((r) => r.ok ? r.json() : null)
      .then((d) => setVibo(d?.vibo || null)).catch(() => {});
  }, [me]);

  if (loading || !me) return null;

  return (
    <div style={{
      background: "transparent",  // Theme/Skin scheint durch
      paddingBottom: 100,
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "12px 12px 0" }}>

        {/* === HEADER-STRIP (komplett transparent) === */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "transparent",
          padding: "8px 4px", marginBottom: 12,
        }}>
          <Link href="/heute" style={{
            background: "transparent",
            border: "1.5px solid rgba(255,255,255,0.7)",
            color: "#fff", borderRadius: 999,
            padding: "5px 12px", fontSize: 12, fontWeight: 800,
            textDecoration: "none", whiteSpace: "nowrap",
            textShadow: "0 1px 3px rgba(0,0,0,0.4)",
          }}>← Heute</Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 800, color: "#fff",
              opacity: 0.85,
              textTransform: "uppercase", letterSpacing: 0.7,
              textShadow: "0 1px 3px rgba(0,0,0,0.4)",
            }}>Dein Tamagotchi</div>
            <div style={{
              fontSize: 18, fontWeight: 900, color: "#fff",
              lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              textShadow: "0 2px 6px rgba(0,0,0,0.4)",
            }}>
              🥚 {vibo?.name || "Mein VIBO"}
              {vibo && vibo.ageDays != null && (
                <span style={{
                  fontSize: 12, color: "#fff", fontWeight: 600,
                  marginLeft: 8, opacity: 0.8,
                }}>· Tag {vibo.ageDays}</span>
              )}
            </div>
          </div>
        </div>

        {/* === TAB-STRIP (komplett transparent) === */}
        <div style={{
          display: "flex", gap: 4,
          background: "transparent",
          padding: 0, marginBottom: 14,
          overflowX: "auto",
          scrollbarWidth: "none",
        }}>
          {TABS.map((t) => (
            <button key={t.id} type="button"
              onClick={() => setTab(t.id)}
              style={{
                flex: "1 0 auto",
                padding: "8px 14px",
                borderRadius: 999,
                border: tab === t.id ? "none" : "1.5px solid rgba(255,255,255,0.6)",
                background: tab === t.id
                  ? "linear-gradient(135deg, #a855f7, #7c3aed)"
                  : "transparent",
                color: "#fff",
                fontWeight: tab === t.id ? 900 : 700,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: tab === t.id ? "0 4px 12px rgba(124,58,237,0.5)" : "none",
                textShadow: tab === t.id ? "0 1px 2px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.4)",
                opacity: tab === t.id ? 1 : 0.85,
                transition: "all 0.15s",
              }}>
              <span style={{ marginRight: 4 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* === TAB-CONTENT in Glas-Karte === */}
        {tab === "pet" && (
          <GlassCard>
            <ViboPet />
          </GlassCard>
        )}

        {tab === "quests" && (
          <GlassCard title="🎯 Quests" subtitle="Erfülle Aufgaben für Vibes und Items.">
            <QuestPanel />
          </GlassCard>
        )}

        {tab === "shop" && (
          <GlassCard title="🛒 VIBO-Shop" subtitle="Futter, Möbel, Karten — alles für dein VIBO.">
            <ShopPanel />
          </GlassCard>
        )}

        {tab === "cards" && (
          <GlassCard title="🃏 Sammelkarten" subtitle="Deine Sammlung — tauschbar mit Freunden.">
            <CardCollection />
          </GlassCard>
        )}

        {tab === "map" && (
          <GlassCard
            title="🗺️ Item-Karte"
            subtitle="Items einsammeln, Basar besuchen, fischen."
            footer={
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <Link href="/karte" style={{
                  display: "inline-block",
                  background: "linear-gradient(135deg, #06b6d4, #0891b2)",
                  color: "#fff", padding: "8px 16px", borderRadius: 999,
                  fontWeight: 800, fontSize: 13, textDecoration: "none",
                  boxShadow: "0 2px 8px rgba(8,145,178,0.3)",
                }}>↗ Karte als Vollbild öffnen</Link>
              </div>
            }>
            <WorldMap compact />
          </GlassCard>
        )}

        {/* Tipp-Streifen (transparent) */}
        <div style={{
          marginTop: 16, padding: "10px 14px",
          background: "transparent",
          fontSize: 11.5, color: "#fff", textAlign: "center",
          opacity: 0.8,
          textShadow: "0 1px 3px rgba(0,0,0,0.4)",
          lineHeight: 1.5,
        }}>
          💡 <b>Pflege täglich</b> — füttern, streicheln, spielen · Energie verfällt mit der Zeit · Quests bringen ✨
        </div>
      </div>
    </div>
  );
}

function GlassCard({ title, subtitle, children, footer }) {
  return (
    <div style={{
      background: "transparent",
      padding: 0,
    }}>
      {title && (
        <div style={{ marginBottom: 10, padding: "0 4px" }}>
          <h2 style={{
            margin: 0, fontSize: 18, fontWeight: 900,
            color: "#fff",
            textShadow: "0 2px 6px rgba(0,0,0,0.4)",
          }}>{title}</h2>
          {subtitle && (
            <div style={{
              fontSize: 12, color: "#fff",
              opacity: 0.85, marginTop: 2,
              textShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}>{subtitle}</div>
          )}
        </div>
      )}
      {children}
      {footer}
    </div>
  );
}
