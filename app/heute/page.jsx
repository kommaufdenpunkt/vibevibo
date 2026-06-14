"use client";

// 🏠 Heute v5 — WOW-Edition.
// Großer animierter Hero, Glas-Karten, smooth scroll, horizontal swipe tiles,
// kein nested-scroll mehr, Theme scheint durch.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";
import PremiumHero from "@/components/PremiumHero";
import PremiumSkeleton from "@/components/PremiumSkeleton";

// 🎛 Layout: liest die User-Konfiguration aus localStorage.
// Default-Reihenfolge wenn nichts gesetzt.
const DEFAULT_LAYOUT = [
  { id: "hero", enabled: true },
  { id: "alerts", enabled: true },
  { id: "tiles", enabled: true },
  { id: "buschfunk", enabled: true },
  { id: "fortune", enabled: true },
  { id: "activity", enabled: true },
];
function loadDashboardLayout() {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = localStorage.getItem("vv_dashboard_layout");
    if (!raw) return DEFAULT_LAYOUT;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return DEFAULT_LAYOUT;
    return arr;
  } catch { return DEFAULT_LAYOUT; }
}

export default function HeutePage() {
  const { me, loading } = useMe();
  const [data, setData] = useState({
    notifications: [], credits: null, vibo: null, rewardStatus: null,
    fortune: null, quests: { quests: [] }, birthdays: [], buschfunk: [],
  });
  const [busy, setBusy] = useState("");
  const [flash, setFlash] = useState("");
  // Infinite-Scroll-State fuer Buschfunk
  const [bfVisible, setBfVisible] = useState(15); // wie viele Events anzeigen
  const [bfTotal, setBfTotal] = useState(50);     // wie viele von API geholt
  const [bfLoadingMore, setBfLoadingMore] = useState(false);
  const sentinelRef = useRef(null);
  // 🎛 Dashboard-Layout
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  useEffect(() => { setLayout(loadDashboardLayout()); }, []);

  useEffect(() => {
    if (!me) return;
    Promise.all([
      api.notifications().catch(() => ({ notifications: [] })),
      api.credits().catch(() => null),
      fetch("/api/vibo").then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/ads/status").then((r) => r.ok ? r.json() : null).catch(() => null),
      api.fortune().catch(() => null),
      api.quests().catch(() => ({ quests: [] })),
      api.birthdays().catch(() => []),
      fetch("/api/buschfunk?limit=50").then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([notif, credits, vibo, ads, fortune, quests, bdays, buschfunk]) => {
      setData({
        notifications: notif?.notifications || [],
        credits, vibo, rewardStatus: ads, fortune,
        quests: quests || { quests: [] },
        birthdays: Array.isArray(bdays) ? bdays : (bdays?.birthdays || []),
        buschfunk: buschfunk?.events || [],
      });
    });
  }, [me]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return "Gute Nacht";
    if (h < 11) return "Morgen";
    if (h < 14) return "Mahlzeit";
    if (h < 17) return "Hi";
    if (h < 22) return "Abend";
    return "Spät noch wach";
  }, []);

  const dateShort = useMemo(() => new Date().toLocaleDateString("de-DE", {
    weekday: "long", day: "2-digit", month: "long",
  }), []);

  // ⚠ WICHTIG: Hooks duerfen NICHT nach early-return stehen!
  // Buschfunk sortieren (Freunde zuerst) — muss VOR jedem return passieren
  const sortedBuschfunk = useMemo(() => {
    const arr = [...(data.buschfunk || [])];
    arr.sort((a, b) => {
      const af = a.isFriend ? 0 : 1;
      const bf = b.isFriend ? 0 : 1;
      if (af !== bf) return af - bf;
      return (b.at || 0) - (a.at || 0);
    });
    return arr;
  }, [data.buschfunk]);

  // IntersectionObserver fuer Infinite-Scroll — auch vor early-return
  useEffect(() => {
    if (!sentinelRef.current || sortedBuschfunk.length === 0) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver(async (entries) => {
      if (!entries[0].isIntersecting || bfLoadingMore) return;
      if (bfVisible >= sortedBuschfunk.length) {
        if (bfTotal < 200) {
          setBfLoadingMore(true);
          const newTotal = Math.min(200, bfTotal + 50);
          try {
            const r = await fetch(`/api/buschfunk?limit=${newTotal}`).then((r) => r.json());
            setData((d) => ({ ...d, buschfunk: r.events || [] }));
            setBfTotal(newTotal);
            setBfVisible((v) => v + 15);
          } catch {}
          setBfLoadingMore(false);
        }
        return;
      }
      setBfVisible((v) => Math.min(v + 15, sortedBuschfunk.length));
    }, { rootMargin: "400px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [sortedBuschfunk, bfVisible, bfTotal, bfLoadingMore]);

  if (loading) return <PremiumSkeleton type="page" />;
  if (!me) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Link href="/login?next=/heute" style={{
          background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
          color: "#fff", padding: "12px 24px", borderRadius: 999,
          textDecoration: "none", fontWeight: 800,
        }}>Zum Login</Link>
      </div>
    );
  }

  const balance = data.credits?.balance ?? 0;
  const streak = data.credits?.dailyStreak ?? 0;
  const lastDailyAt = data.credits?.lastDailyAt || 0;
  const canClaimDaily = Date.now() - lastDailyAt > 22 * 3600 * 1000;

  const alerts = [];
  if (canClaimDaily) alerts.push({
    icon: "🎁", text: "Tages-Bonus wartet", action: "Abholen", color: "#fbbf24",
    onClick: async () => {
      setBusy("daily");
      try {
        const r = await api.claimDaily();
        setFlash(`✨ +${r.amount} Vibes! Streak: ${r.streak} 🔥`);
        const c = await api.credits().catch(() => null);
        setData((d) => ({ ...d, credits: c }));
      } catch (e) { setFlash(`⚠ ${e.message}`); }
      finally { setBusy(""); setTimeout(() => setFlash(""), 4000); }
    },
  });

  const gruschelnIn = data.notifications.filter((n) => n.type === "gruscheln" && !n.read);
  if (gruschelnIn.length > 0) alerts.push({
    icon: "🫶", text: `${gruschelnIn.length}× gegruschelt worden`,
    action: "Ansehen", href: "/notifications", color: "#60a5fa",
  });

  const visitsIn = data.notifications.filter((n) => n.type === "visit" && !n.read);
  if (visitsIn.length > 0) alerts.push({
    icon: "👀", text: `${visitsIn.length} neue Profil-Besuche`,
    action: "Wer war hier?", href: "/notifications", color: "#a78bfa",
  });

  const claimableQuests = (data.quests?.quests || []).filter((q) => q.done && !q.claimed);
  if (claimableQuests.length > 0) alerts.push({
    icon: "🏆", text: `${claimableQuests.length} Quest${claimableQuests.length > 1 ? "s" : ""} fertig`,
    action: "Belohnung", href: "/quests", color: "#f472b6",
  });

  const giftsIn = data.notifications.filter((n) => n.type === "gift" && !n.read);
  if (giftsIn.length > 0) alerts.push({
    icon: "🎁", text: `${giftsIn.length} neue Geschenke`,
    action: "Auspacken", href: "/geschenke", color: "#fb923c",
  });

  const pinnwandIn = data.notifications.filter((n) => n.type === "pinnwand" && !n.read);
  if (pinnwandIn.length > 0) alerts.push({
    icon: "📌", text: `${pinnwandIn.length} neue Pinnwand-Einträge`,
    action: "Lesen", href: `/u/${me.username}/pinnwand`, color: "#fbbf24",
  });

  const todayBdays = (data.birthdays || []).filter((b) => b.daysUntil === 0);
  if (todayBdays.length > 0) alerts.push({
    icon: "🎂", text: `${todayBdays.length} Geburtstag${todayBdays.length > 1 ? "e" : ""} heute`,
    action: "Gratulieren", href: `/u/${todayBdays[0].username}/pinnwand`, color: "#fde047",
  });

  const recentActivity = data.notifications.slice(0, 10);

  // Wo trennen sich Freunde von Öffentlichkeit? (Kein Hook — pure compute)
  const friendsCount = sortedBuschfunk.findIndex((ev) => !ev.isFriend);
  const friendsLast = friendsCount === -1 ? sortedBuschfunk.length : friendsCount;

  // 🎛 Layout: section-id -> CSS-order-Wert. Wrap jede Sektion in <div style={{order:N}}>
  // damit der User die Reihenfolge im /profile/dashboard editieren kann.
  const orderMap = {};
  layout.forEach((entry, idx) => { orderMap[entry.id] = idx; });
  const isOn = (id) => {
    const it = layout.find((s) => s.id === id);
    return !it || it.enabled;
  };
  const sectionStyle = (id) => ({ order: orderMap[id] ?? 99 });

  return (
    <div style={{ background: "transparent", paddingBottom: 100 }}>
      <div style={{
        maxWidth: 760, margin: "0 auto", padding: "10px 12px 0",
        scrollBehavior: "smooth",
        display: "flex", flexDirection: "column",
      }}>

        {/* === HERO BANNER (Premium) === */}
        {isOn("hero") && <div style={sectionStyle("hero")}>
        <PremiumHero
          eyebrow={dateShort}
          title={`${greeting}, ${me.displayName || me.username}!`}
          gradient="default"
          stats={[
            { label: "✨", value: balance },
            ...(streak > 0 ? [{ label: "🔥", value: `${streak}-Tage Streak` }] : []),
          ]}
        />
        </div>}

        {/* Legacy-Hero ausgeblendet — wird durch PremiumHero ersetzt */}
        {false && <div>
        <div style={{
          position: "relative", overflow: "hidden",
          background: "linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #06b6d4 100%)",
          backgroundSize: "200% 200%",
          animation: "vv-heute-hero 12s ease infinite",
          borderRadius: 20, padding: "20px 18px",
          color: "#fff", marginBottom: 12,
          boxShadow: "0 8px 24px rgba(168,85,247,0.35)",
        }}>
          {/* Sparkle deco */}
          <div style={{
            position: "absolute", top: 8, right: 12, fontSize: 28, opacity: 0.5,
            pointerEvents: "none",
          }}>✨</div>
          <div style={{
            position: "absolute", bottom: 8, left: 12, fontSize: 22, opacity: 0.4,
            pointerEvents: "none",
          }}>★</div>

          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.9, letterSpacing: 1, textTransform: "uppercase" }}>
            {dateShort}
          </div>
          <div style={{
            fontSize: 28, fontWeight: 900, lineHeight: 1.1, marginTop: 4,
            textShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}>
            {greeting}, {me.displayName || me.username}!
          </div>
          <div style={{
            display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap",
          }}>
            <div style={{
              background: "rgba(255,255,255,0.22)",
              backdropFilter: "blur(8px)",
              padding: "6px 14px", borderRadius: 999,
              fontWeight: 900, fontSize: 14,
            }}>✨ {balance}</div>
            {streak > 0 && (
              <div style={{
                background: "rgba(255,255,255,0.22)",
                backdropFilter: "blur(8px)",
                padding: "6px 14px", borderRadius: 999,
                fontWeight: 800, fontSize: 13,
              }}>🔥 {streak}-Tage Streak</div>
            )}
          </div>
        </div>
        </div>}

        {/* Inline animation styles for hero (global, ausserhalb der Sections) */}
        <style>{`
          @keyframes vv-heute-hero {
            0%, 100% { background-position: 0% 50%; }
            50%      { background-position: 100% 50%; }
          }
        `}</style>

        {flash && (
          <div style={{
            background: flash.startsWith("⚠") ? "#fee2e2" : "#dcfce7",
            color: flash.startsWith("⚠") ? "#991b1b" : "#166534",
            padding: 10, borderRadius: 12, marginBottom: 10,
            fontWeight: 700, fontSize: 13, textAlign: "center",
          }}>{flash}</div>
        )}

        {/* === ALERTS === */}
        {isOn("alerts") && alerts.length > 0 && (
          <div style={{ ...sectionStyle("alerts"), display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {alerts.map((a, i) => (
              <AlertRow key={i} alert={a} busy={busy === "daily" && a.icon === "🎁"} />
            ))}
          </div>
        )}

        {/* === HAUPT-AKTIONEN (Custom-Tiles aus Apps oder Default) === */}
        {isOn("tiles") && <div style={sectionStyle("tiles")}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 8, padding: "0 4px",
        }}>
          <SectionTitle compact>🚀 Schnell loslegen</SectionTitle>
          <div style={{ display: "flex", gap: 6 }}>
            <Link href="/profile/dashboard" style={{
              fontSize: 11, color: "#fff", fontWeight: 800,
              textDecoration: "none", padding: "4px 12px",
              background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
              borderRadius: 999,
              boxShadow: "0 2px 6px rgba(139,92,246,0.35)",
            }}>🎛 Layout</Link>
            <Link href="/profile/dashboard" style={{
              fontSize: 11, color: "#fff", fontWeight: 800,
              textDecoration: "none", padding: "4px 12px",
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(8px)",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.3)",
            }}>🎛 Anpassen</Link>
          </div>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10, marginBottom: 16,
        }}>
          <UserTiles fallback={[
            { href: "/buschfunk", color1: "#fb923c", color2: "#ef4444", icon: "📣", title: "Buschfunk", sub: "Was läuft heute?" },
            { href: "/messenger", color1: "#06b6d4", color2: "#0284c7", icon: "💬", title: "Messenger", sub: "Direkt chatten" },
            { href: "/vibo",      color1: "#a855f7", color2: "#7c3aed", icon: "🥚", title: "Mein VIBO", sub: data.vibo?.vibo?.name || "Dein Pet" },
            { href: "/karte",     color1: "#06b6d4", color2: "#0e7490", icon: "🗺️", title: "Karte", sub: "Welt erkunden" },
            { href: "/geschenke", color1: "#fb923c", color2: "#ea580c", icon: "🎁", title: "Geschenke", sub: "Verschicken" },
            { href: "/fotos",     color1: "#ec4899", color2: "#be185d", icon: "📸", title: "Fotos", sub: "Galerie" },
            { href: "/freunde",   color1: "#3b82f6", color2: "#1e40af", icon: "👯", title: "Freunde", sub: "Wer ist online?" },
          ]} />
        </div>
        </div>}

        {/* === BUSCHFUNK FEED mit Infinite-Scroll + Freunde-zuerst === */}
        {isOn("buschfunk") && sortedBuschfunk.length > 0 && (
          <div style={sectionStyle("buschfunk")}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 8, padding: "0 4px",
            }}>
              <SectionTitle compact>🆕 Was ist neu?</SectionTitle>
              <Link href="/buschfunk" style={{
                fontSize: 11, color: "#fff", fontWeight: 800,
                textDecoration: "none", padding: "4px 12px",
                background: "linear-gradient(135deg, #fb923c, #ea580c)",
                borderRadius: 999,
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}>📣 Buschfunk →</Link>
            </div>

            {/* ===== ⭐ FREUNDE-SEKTION ===== */}
            {friendsLast > 0 && bfVisible > 0 && (
              <>
                {/* Großer goldener Banner */}
                <div style={{
                  background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                  borderRadius: 14,
                  padding: "10px 14px",
                  marginBottom: 8,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 22 }}>⭐</div>
                    <div>
                      <div style={{
                        fontSize: 14, fontWeight: 900, color: "#fff",
                        textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                      }}>Von deinen Freunden</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                        {friendsLast} Eintrag{friendsLast === 1 ? "" : "e"} insgesamt
                      </div>
                    </div>
                  </div>
                  <div style={{
                    background: "rgba(255,255,255,0.25)",
                    backdropFilter: "blur(8px)",
                    padding: "4px 10px", borderRadius: 999,
                    fontSize: 11, fontWeight: 800, color: "#fff",
                  }}>{Math.min(bfVisible, friendsLast)}/{friendsLast}</div>
                </div>

                <div style={{
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  borderRadius: 16, padding: 10, marginBottom: 14,
                  border: "2px solid rgba(245,158,11,0.25)",
                  boxShadow: "0 4px 16px rgba(245,158,11,0.12)",
                  display: "flex", flexDirection: "column", gap: 8,
                }}>
                  {sortedBuschfunk.slice(0, Math.min(bfVisible, friendsLast)).map((ev, i) => (
                    <BuschfunkPreview key={ev.id || `${ev.type}-${ev.at}-${ev.actor?.username || i}`} ev={ev} />
                  ))}
                </div>
              </>
            )}

            {/* ===== 🌍 ÖFFENTLICH-SEKTION ===== */}
            {bfVisible > friendsLast && (
              <>
                {/* Großer cyan-blauer Banner */}
                <div style={{
                  background: "linear-gradient(135deg, #06b6d4, #0891b2)",
                  borderRadius: 14,
                  padding: "10px 14px",
                  marginBottom: 8,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  boxShadow: "0 4px 12px rgba(8,145,178,0.3)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 22 }}>🌍</div>
                    <div>
                      <div style={{
                        fontSize: 14, fontWeight: 900, color: "#fff",
                        textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                      }}>Aus dem Netz</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                        Öffentliche Posts der ganzen Community
                      </div>
                    </div>
                  </div>
                  <div style={{
                    background: "rgba(255,255,255,0.25)",
                    backdropFilter: "blur(8px)",
                    padding: "4px 10px", borderRadius: 999,
                    fontSize: 11, fontWeight: 800, color: "#fff",
                  }}>{bfVisible - friendsLast}/{sortedBuschfunk.length - friendsLast}</div>
                </div>

                <div style={{
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  borderRadius: 16, padding: 10, marginBottom: 14,
                  border: "2px solid rgba(8,145,178,0.2)",
                  boxShadow: "0 4px 16px rgba(8,145,178,0.1)",
                  display: "flex", flexDirection: "column", gap: 8,
                }}>
                  {sortedBuschfunk.slice(friendsLast, bfVisible).map((ev, i) => (
                    <BuschfunkPreview key={ev.id || `pub-${ev.type}-${ev.at}-${ev.actor?.username || i}`} ev={ev} />
                  ))}
                </div>
              </>
            )}

            {/* === Lade-Indikator + Sentinel === */}
            {bfLoadingMore && (
              <div style={{
                textAlign: "center", padding: "12px",
                background: "rgba(255,255,255,0.85)",
                borderRadius: 12, marginBottom: 14,
                fontSize: 12, color: "#475569", fontWeight: 800,
              }}>⏳ Lade mehr Einträge…</div>
            )}
            {!bfLoadingMore && bfVisible < sortedBuschfunk.length && (
              <div ref={sentinelRef} style={{ height: 1 }} />
            )}
            {!bfLoadingMore && bfVisible >= sortedBuschfunk.length && bfTotal < 200 && (
              <div ref={sentinelRef} style={{ height: 1 }} />
            )}
            {bfVisible >= sortedBuschfunk.length && bfTotal >= 200 && (
              <div style={{
                textAlign: "center", padding: "16px",
                background: "rgba(255,255,255,0.7)",
                borderRadius: 12, marginBottom: 14,
                fontSize: 12, color: "#94a3b8", fontStyle: "italic", fontWeight: 600,
              }}>✿ Du bist am Ende des Buschfunks angekommen ✿</div>
            )}
          </div>
        )}

        {/* === FORTUNE === */}
        {isOn("fortune") && data.fortune?.text && (
          <div style={{
            ...sectionStyle("fortune"),
            background: "rgba(252,231,243,0.88)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.5)",
            boxShadow: "0 4px 16px rgba(192,38,211,0.1)",
            borderRadius: 16, padding: "14px 16px", marginBottom: 14,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 800, color: "#86198f",
              marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8,
            }}>🔮 Spruch des Tages</div>
            <div style={{
              fontSize: 15, fontStyle: "italic", color: "#581c87", lineHeight: 1.5,
              fontWeight: 600,
            }}>„{data.fortune.text}"</div>
          </div>
        )}

        {/* === ACTIVITY FEED === */}
        {isOn("activity") && recentActivity.length > 0 && (
          <div style={sectionStyle("activity")}>
            <SectionTitle>📰 Deine Benachrichtigungen</SectionTitle>
            <div style={{
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: 16, padding: 12, marginBottom: 14,
              border: "1px solid rgba(255,255,255,0.5)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              {recentActivity.map((n) => <ActivityRow key={n.id} n={n} myUsername={me.username} />)}
            </div>
          </div>
        )}

        {alerts.length === 0 && recentActivity.length === 0 && data.buschfunk.length === 0 && (
          <div style={{
            textAlign: "center", padding: "30px 20px",
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(12px)",
            borderRadius: 16, color: "#475569",
            order: 999,
          }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>✨</div>
            <div style={{ fontWeight: 800, color: "#1f2937" }}>Alles ruhig hier.</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Schreib was im Buschfunk oder besuch dein VIBO ✿
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children, compact = false }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 900,
      color: "#fff",
      marginBottom: compact ? 0 : 10, padding: compact ? 0 : "0 4px",
      textTransform: "uppercase", letterSpacing: 1,
      textShadow: "0 2px 6px rgba(0,0,0,0.4)",
    }}>{children}</div>
  );
}

function AlertRow({ alert, busy }) {
  const inner = (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "rgba(255,255,255,0.95)",
      backdropFilter: "blur(12px)",
      border: `2px solid ${alert.color}`,
      borderRadius: 14, padding: "12px 14px",
      boxShadow: `0 4px 12px ${alert.color}40`,
      cursor: "pointer",
    }}>
      <div style={{ fontSize: 26 }}>{alert.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, color: "#1f2937", fontSize: 14, lineHeight: 1.2 }}>{alert.text}</div>
      </div>
      <div style={{
        background: alert.color, color: "#fff",
        padding: "7px 14px", borderRadius: 999,
        fontWeight: 800, fontSize: 12, whiteSpace: "nowrap",
        boxShadow: `0 2px 6px ${alert.color}66`,
      }}>{busy ? "…" : alert.action} →</div>
    </div>
  );

  if (alert.href) return <Link href={alert.href} style={{ textDecoration: "none" }}>{inner}</Link>;
  return <button type="button" onClick={alert.onClick} disabled={busy}
    style={{ all: "unset", display: "block", width: "100%", cursor: "pointer" }}>{inner}</button>;
}

// 🎛 UserTiles — liest die im /apps-Launcher gepinnten Apps aus localStorage
// (gleicher Key wie /apps). Wenn der User welche gepinnt hat, zeigen wir die statt
// der Default-8. Read-only — Anpassen passiert im /apps-Launcher (☆/⭐).
function UserTiles({ fallback }) {
  const [pinned, setPinned] = useState(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("vv_apps_pinned");
      const ids = raw ? JSON.parse(raw) : [];
      if (Array.isArray(ids) && ids.length > 0) setPinned(ids);
      else setPinned([]);
    } catch { setPinned([]); }
  }, []);

  // Bevor localStorage gelesen ist: Fallback rendern (kein Layout-Shift)
  if (pinned === null || pinned.length === 0) {
    return <>{fallback.map((t, i) => <BigTile key={t.href + i} {...t} />)}</>;
  }

  // Map von App-IDs zu Tile-Konfigs (gleiche IDs wie in app/apps/page.jsx)
  const APP_TILES = {
    heute:       { href: "/heute",       icon: "🏠", title: "Heute",         sub: "Tages-Übersicht",  color1: "#fbbf24", color2: "#ea580c" },
    profile:     { href: "/profile",     icon: "🪪", title: "Mein Profil",    sub: "Deine Seite",      color1: "#ec4899", color2: "#be185d" },
    edit:        { href: "/profile/edit", icon: "✏️", title: "Bearbeiten",    sub: "Profil pflegen",   color1: "#fb923c", color2: "#c2410c" },
    skin:        { href: "/profile/skin", icon: "🎨", title: "Skin",          sub: "Look anpassen",    color1: "#a855f7", color2: "#7c3aed" },
    privacy:     { href: "/profile/privacy", icon: "🛡", title: "Schutz",     sub: "Privatsphäre",     color1: "#3b82f6", color2: "#1e40af" },
    messenger:   { href: "/messenger",   icon: "💬", title: "Messenger",      sub: "1-zu-1 Chat",      color1: "#06b6d4", color2: "#0284c7" },
    buschfunk:   { href: "/buschfunk",   icon: "📣", title: "Buschfunk",      sub: "Status & Posts",   color1: "#fb923c", color2: "#ef4444" },
    gruppen:     { href: "/coms",     icon: "🏘️", title: "Coms",         sub: "Communities",      color1: "#8b5cf6", color2: "#6d28d9" },
    live:        { href: "/live",        icon: "📺", title: "Live",          sub: "Video-Streams",    color1: "#dc2626", color2: "#991b1b" },
    friends:     { href: "/freunde",     icon: "👯", title: "Freunde",       sub: "Wer ist online?",  color1: "#3b82f6", color2: "#1e40af" },
    neu:         { href: "/neu",         icon: "🆕", title: "Neuigkeiten",   sub: "Was läuft",        color1: "#10b981", color2: "#065f46" },
    schulen:     { href: "/schulen",     icon: "🎓", title: "Schulen",       sub: "Klassen-Netz",     color1: "#0891b2", color2: "#155e75" },
    compliments: { href: "/compliments", icon: "💝", title: "Komplimente",   sub: "Lieb sein",        color1: "#ec4899", color2: "#9d174d" },
    vibo:        { href: "/vibo",        icon: "🥚", title: "Mein VIBO",     sub: "Dein Tamagotchi",  color1: "#a855f7", color2: "#7c3aed" },
    "vibo-shop": { href: "/shop?tab=vibo", icon: "🛒", title: "VIBO-Shop",   sub: "Futter & Möbel",   color1: "#10b981", color2: "#065f46" },
    "vibo-game": { href: "/vibo/minigame", icon: "🍕", title: "Mini-Game",   sub: "Snack-Schnapp",    color1: "#f59e0b", color2: "#b45309" },
    cemetery:    { href: "/vibo/cemetery", icon: "🪦", title: "Friedhof",    sub: "Erinnerungen",     color1: "#64748b", color2: "#334155" },
    karte:       { href: "/karte",       icon: "🗺️", title: "Karte",        sub: "Welt erkunden",    color1: "#06b6d4", color2: "#0e7490" },
    fotos:       { href: "/fotos",       icon: "📸", title: "Fotos",         sub: "Galerie",          color1: "#ec4899", color2: "#be185d" },
    geschenke:   { href: "/geschenke",   icon: "🎁", title: "Geschenke",     sub: "Verschicken",      color1: "#fb923c", color2: "#ea580c" },
    markt:       { href: "/markt",       icon: "💰", title: "Markt",         sub: "Items handeln",    color1: "#f59e0b", color2: "#b45309" },
    "vibes-earn": { href: "/vibes-verdienen", icon: "💰", title: "Vibes verdienen", sub: "Werbung & Co", color1: "#22c55e", color2: "#15803d" },
    quests:      { href: "/quests",      icon: "🥇", title: "Quests",        sub: "Aufgaben",         color1: "#3b82f6", color2: "#1e3a8a" },
    daily:       { href: "/heute",       icon: "🎁", title: "Tages-Bonus",   sub: "Tägliche ✨",       color1: "#fbbf24", color2: "#d97706" },
    rang:        { href: "/rang",        icon: "🏆", title: "Rang & XP",     sub: "Level up",         color1: "#f59e0b", color2: "#92400e" },
    shop:        { href: "/shop",        icon: "🛍️", title: "Shop",         sub: "Premium",          color1: "#a855f7", color2: "#6d28d9" },
    echtgeld:    { href: "/shop#stripe", icon: "💳", title: "Echtgeld",      sub: "Vibes & VIP",      color1: "#f59e0b", color2: "#b45309" },
    empfehl:     { href: "/vibes-verdienen?tab=empfehlungen", icon: "💝", title: "Empfehlungen", sub: "Amazon", color1: "#ec4899", color2: "#be185d" },
    "vibes-tx":  { href: "/profile/transactions", icon: "📊", title: "Transaktionen", sub: "Verlauf", color1: "#8b5cf6", color2: "#5b21b6" },
    games:       { href: "/spiele",      icon: "🎮", title: "Spiele",        sub: "Mini-Games",       color1: "#f43f5e", color2: "#9f1239" },
    cards:       { href: "/cards",       icon: "🃏", title: "Karten",        sub: "Sammeln & Tauschen", color1: "#a855f7", color2: "#5b21b6" },
    install:     { href: "/installieren", icon: "📲", title: "Als App",       sub: "PWA installieren", color1: "#10b981", color2: "#047857" },
  };

  const tiles = pinned
    .map((id) => APP_TILES[id])
    .filter(Boolean);

  // Fallback wenn keine valid gepinnt
  if (tiles.length === 0) {
    return <>{fallback.map((t, i) => <BigTile key={t.href + i} {...t} />)}</>;
  }

  return <>{tiles.map((t, i) => <BigTile key={t.href + i} {...t} />)}</>;
}

function BigTile({ href, color1, color2, icon, title, sub }) {
  return (
    <Link href={href} className="vv-prem-tile" style={{
      display: "flex", flexDirection: "column",
      background: `linear-gradient(135deg, ${color1}, ${color2})`,
      color: "#fff", padding: "16px 14px", borderRadius: 18,
      textDecoration: "none", minHeight: 110,
      boxShadow: `
        0 1px 0 rgba(255,255,255,0.25) inset,
        0 -1px 0 rgba(0,0,0,0.12) inset,
        0 6px 18px ${color1}55,
        0 2px 6px rgba(0,0,0,0.08)
      `,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at top left, rgba(255,255,255,0.18), transparent 65%)",
        pointerEvents: "none",
      }} />
      <div style={{ fontSize: 34, lineHeight: 1, marginBottom: 4, position: "relative" }}>{icon}</div>
      <div style={{
        fontWeight: 900, fontSize: 16, lineHeight: 1.2,
        textShadow: "0 1px 2px rgba(0,0,0,0.2)",
        letterSpacing: -0.2, position: "relative",
      }}>{title}</div>
      <div style={{ fontSize: 11.5, opacity: 0.95, marginTop: 2, fontWeight: 600, position: "relative" }}>{sub}</div>
    </Link>
  );
}

// Pro Buschfunk-Typ eigene Farbe + Akzent — wie ein Instagram-Feed,
// jeder Post-Typ hat eigenen Look.
const BF_TYPE = {
  status:     { icon: "💬", label: "Status",      g1: "#3b82f6", g2: "#6366f1", chip: "#dbeafe", chipText: "#1e40af" },
  pinnwand:   { icon: "📌", label: "Pinnwand",    g1: "#fb923c", g2: "#ea580c", chip: "#ffedd5", chipText: "#9a3412" },
  gift:       { icon: "🎁", label: "Geschenk",    g1: "#ec4899", g2: "#be185d", chip: "#fce7f3", chipText: "#9d174d" },
  newpic:     { icon: "🖼️", label: "Neues Bild",  g1: "#a855f7", g2: "#7c3aed", chip: "#ede9fe", chipText: "#5b21b6" },
  grouppost:  { icon: "🏘️", label: "Gruppe",      g1: "#06b6d4", g2: "#0891b2", chip: "#cffafe", chipText: "#155e75" },
  login:      { icon: "✨", label: "Online",      g1: "#10b981", g2: "#059669", chip: "#d1fae5", chipText: "#065f46" },
  register:   { icon: "🎉", label: "Neu dabei",   g1: "#f59e0b", g2: "#d97706", chip: "#fef3c7", chipText: "#92400e" },
  knuddel:    { icon: "🥚", label: "Knuddel",     g1: "#84cc16", g2: "#65a30d", chip: "#ecfccb", chipText: "#3f6212" },
  milestone:  { icon: "🎯", label: "Meilenstein", g1: "#f43f5e", g2: "#be123c", chip: "#ffe4e6", chipText: "#9f1239" },
};

function BuschfunkPreview({ ev }) {
  const meta = BF_TYPE[ev.type] || BF_TYPE.status;
  const actorName = ev.actor?.displayName || ev.actor?.username || "Jemand";
  const username = ev.actor?.username;
  const avatarUrl = ev.actor?.avatarUrl || "";
  const profileHref = username ? `/u/${username}` : "/buschfunk";

  let text = "";
  let isQuote = false;
  if (ev.type === "status")     { text = ev.detail || ""; isQuote = !!ev.detail; }
  else if (ev.type === "pinnwand") { text = ev.detail || "Pinnwand-Eintrag"; isQuote = !!ev.detail; }
  else if (ev.type === "gift")     text = "hat ein Geschenk verschickt 🎁";
  else if (ev.type === "newpic")   text = "hat ein neues Profilbild! 📸";
  else if (ev.type === "register") text = "ist neu bei VibeVibo — sag Hallo! 🎉";
  else if (ev.type === "knuddel")  text = "hat geknuddelt 🫶";
  else if (ev.type === "login")    text = "ist online ✨";
  else text = ev.type;

  const when = relTime(ev.at);

  async function gruschelBack(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!username) return;
    try {
      await api.sendNudge(username);
      // Mini-Feedback: kleines Toast via window-Custom-Event
      if (typeof window !== "undefined") {
        const t = document.createElement("div");
        t.textContent = `🫶 Zurück gegruschelt @${username}`;
        t.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:10px 18px;border-radius:999px;font-weight:800;font-size:13px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);";
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2200);
      }
    } catch (err) {
      console.warn("nudge failed", err);
    }
  }

  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      overflow: "hidden",
      borderLeft: `4px solid ${meta.g1}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    }}>
      {/* Eine GROSSE klickbare Flaeche fuer Header + Body */}
      <Link href={profileHref} style={{
        display: "block", textDecoration: "none", color: "inherit",
        padding: "10px 12px 12px",
        WebkitTapHighlightColor: "transparent",
      }}>
        {/* Header: Avatar + Name + Type-Chip + Time */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
        }}>
          <div style={{
            flexShrink: 0,
            width: 40, height: 40, borderRadius: 999,
            background: avatarUrl
              ? `url(${avatarUrl}) center/cover, linear-gradient(135deg, ${meta.g1}, ${meta.g2})`
              : `linear-gradient(135deg, ${meta.g1}, ${meta.g2})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "#fff",
            boxShadow: `0 2px 6px ${meta.g1}66`,
          }}>
            {!avatarUrl && meta.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
            }}>
              <strong style={{ fontSize: 14, color: "#1f2937", lineHeight: 1.2 }}>
                {actorName}
              </strong>
              <span style={{
                background: meta.chip, color: meta.chipText,
                padding: "1px 7px", borderRadius: 999,
                fontSize: 9.5, fontWeight: 800, letterSpacing: 0.2,
                textTransform: "uppercase",
              }}>{meta.icon} {meta.label}</span>
              {ev.isFriend && (
                <span style={{
                  background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                  color: "#fff", padding: "1px 7px", borderRadius: 999,
                  fontSize: 9.5, fontWeight: 800,
                  textTransform: "uppercase",
                }}>⭐ Freund</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
              @{username} · {when}
            </div>
          </div>
        </div>

        {/* Body: Text */}
        {isQuote ? (
          <div style={{
            background: meta.chip, color: meta.chipText,
            padding: "10px 12px", borderRadius: 10,
            fontSize: 14, fontStyle: "italic", lineHeight: 1.4,
            fontWeight: 600,
            borderLeft: `3px solid ${meta.g1}`,
          }}>„{text}"</div>
        ) : (
          <div style={{ fontSize: 13.5, color: "#1f2937", lineHeight: 1.4 }}>{text}</div>
        )}
      </Link>

      {/* Footer: Action-Buttons mit stopPropagation */}
      <div style={{
        display: "flex", borderTop: "1px solid #f1f5f9",
        background: "rgba(248,250,252,0.6)",
      }}>
        <Link href={profileHref} style={{
          flex: 1, textAlign: "center", padding: "9px 0",
          fontSize: 12, fontWeight: 700, color: "#475569",
          textDecoration: "none",
          WebkitTapHighlightColor: "rgba(0,0,0,0.05)",
        }}>👤 Profil</Link>
        {username && (
          <button type="button"
            onClick={gruschelBack}
            style={{
              all: "unset", boxSizing: "border-box",
              flex: 1, textAlign: "center", padding: "9px 0",
              fontSize: 12, fontWeight: 700, color: "#475569",
              cursor: "pointer", borderLeft: "1px solid #f1f5f9",
              WebkitTapHighlightColor: "rgba(0,0,0,0.05)",
            }}>🫶 Gruscheln</button>
        )}
        {username && (
          <Link href={`/messenger/${username}`} onClick={(e) => e.stopPropagation()} style={{
            flex: 1, textAlign: "center", padding: "9px 0",
            fontSize: 12, fontWeight: 700, color: "#475569",
            textDecoration: "none", borderLeft: "1px solid #f1f5f9",
            WebkitTapHighlightColor: "rgba(0,0,0,0.05)",
          }}>💬 Schreiben</Link>
        )}
      </div>
    </div>
  );
}

function relTime(ts) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return "jetzt";
  if (d < 3600) return `vor ${Math.floor(d / 60)}m`;
  if (d < 86400) return `vor ${Math.floor(d / 3600)}h`;
  return `vor ${Math.floor(d / 86400)}d`;
}

function ActivityRow({ n, myUsername }) {
  const typeLabel = {
    gruscheln: "🫶 hat dich gegruschelt",
    visit:     "👀 war auf deinem Profil",
    pinnwand:  "📌 hat auf deine Pinnwand geschrieben",
    gift:      "🎁 hat dir ein Geschenk geschickt",
    like:      "❤️ hat dich geliked",
    comment:   "💬 hat kommentiert",
    friend_request: "👯 will dein Freund werden",
    follow:    "✨ folgt dir jetzt",
  }[n.type] || `${n.type}`;

  const when = new Date(n.at).toLocaleString("de-DE", {
    weekday: "short", hour: "2-digit", minute: "2-digit",
  });

  const href = n.actorUsername ? `/u/${n.actorUsername}` : "/notifications";

  return (
    <Link href={href} style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 10px", borderRadius: 10,
      background: n.read ? "transparent" : "rgba(236,72,153,0.08)",
      textDecoration: "none", color: "inherit",
      WebkitTapHighlightColor: "transparent",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1f2937", lineHeight: 1.3 }}>
          {n.actorUsername ? `@${n.actorUsername}` : "Jemand"} {typeLabel}
        </div>
        <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 1 }}>{when}</div>
      </div>
      {!n.read && <div style={{ width: 7, height: 7, borderRadius: 999, background: "#ec4899" }} />}
    </Link>
  );
}
