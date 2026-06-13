"use client";

// 🏠 Heute v5 — WOW-Edition.
// Großer animierter Hero, Glas-Karten, smooth scroll, horizontal swipe tiles,
// kein nested-scroll mehr, Theme scheint durch.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { api } from "@/lib/api";

export default function HeutePage() {
  const { me, loading } = useMe();
  const [data, setData] = useState({
    notifications: [], credits: null, vibo: null, rewardStatus: null,
    fortune: null, quests: { quests: [] }, birthdays: [], buschfunk: [],
  });
  const [busy, setBusy] = useState("");
  const [flash, setFlash] = useState("");

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
      api.buschfunk().catch(() => null),
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

  if (loading) return null;
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

  return (
    <div style={{ background: "transparent", paddingBottom: 100 }}>
      <div style={{
        maxWidth: 760, margin: "0 auto", padding: "10px 12px 0",
        scrollBehavior: "smooth",
      }}>

        {/* === HERO BANNER (BIG, animated gradient) === */}
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

        {/* Inline animation styles for hero */}
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
        {alerts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {alerts.map((a, i) => (
              <AlertRow key={i} alert={a} busy={busy === "daily" && a.icon === "🎁"} />
            ))}
          </div>
        )}

        {/* === HAUPT-AKTIONEN (8 Tiles, mobile-optimiert mit Active-State) === */}
        <SectionTitle>🚀 Schnell loslegen</SectionTitle>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10, marginBottom: 16,
        }}>
          <BigTile href="/buschfunk" color1="#fb923c" color2="#ef4444" icon="📣" title="Buschfunk" sub="Was läuft heute?" />
          <BigTile href="/messenger" color1="#06b6d4" color2="#0284c7" icon="💬" title="Messenger" sub="Direkt chatten" />
          <BigTile href="/vibo"      color1="#a855f7" color2="#7c3aed" icon="🥚" title="Mein VIBO" sub={data.vibo?.vibo?.name || "Dein Pet"} />
          <BigTile href="/karte"     color1="#06b6d4" color2="#0e7490" icon="🗺️" title="Karte" sub="Welt erkunden" />
          <BigTile href="/geschenke" color1="#fb923c" color2="#ea580c" icon="🎁" title="Geschenke" sub="Verschicken" />
          <BigTile href="/fotos"     color1="#ec4899" color2="#be185d" icon="📸" title="Fotos" sub="Galerie" />
          <BigTile href="/freunde"   color1="#3b82f6" color2="#1e40af" icon="👯" title="Freunde" sub="Wer ist online?" />
          <BigTile href="/apps"      color1="#ec4899" color2="#8b5cf6" icon="📲" title="Alle Apps" sub="Komplett" />
        </div>

        {/* === BUSCHFUNK FEED (kein nested-scroll mehr — flowt durch) === */}
        {data.buschfunk.length > 0 && (
          <>
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
            <div style={{
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: 16, padding: 12, marginBottom: 14,
              border: "1px solid rgba(255,255,255,0.5)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              {data.buschfunk.slice(0, 10).map((ev, i) => (
                <BuschfunkPreview key={ev.id || `${ev.type}-${ev.at}-${ev.actor?.username || i}`} ev={ev} />
              ))}
              {data.buschfunk.length > 10 && (
                <Link href="/buschfunk" style={{
                  textAlign: "center", padding: "8px",
                  fontSize: 12, color: "#ea580c", fontWeight: 700,
                  textDecoration: "none",
                }}>
                  📣 Alle {data.buschfunk.length} Einträge sehen →
                </Link>
              )}
            </div>
          </>
        )}

        {/* === FORTUNE === */}
        {data.fortune?.text && (
          <div style={{
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
        {recentActivity.length > 0 && (
          <>
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
          </>
        )}

        {alerts.length === 0 && recentActivity.length === 0 && data.buschfunk.length === 0 && (
          <div style={{
            textAlign: "center", padding: "30px 20px",
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(12px)",
            borderRadius: 16, color: "#475569",
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

function BigTile({ href, color1, color2, icon, title, sub }) {
  return (
    <Link href={href} style={{
      display: "flex", flexDirection: "column",
      background: `linear-gradient(135deg, ${color1}, ${color2})`,
      color: "#fff", padding: "16px 14px", borderRadius: 18,
      textDecoration: "none", minHeight: 110,
      boxShadow: `0 6px 18px ${color1}40`,
      position: "relative", overflow: "hidden",
      transition: "transform 0.12s, box-shadow 0.12s",
      WebkitTapHighlightColor: "transparent",
    }}
    onTouchStart={(e) => e.currentTarget.style.transform = "scale(0.96)"}
    onTouchEnd={(e) => e.currentTarget.style.transform = "scale(1)"}>
      <div style={{ fontSize: 34, lineHeight: 1, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.2, textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>{title}</div>
      <div style={{ fontSize: 11.5, opacity: 0.95, marginTop: 2, fontWeight: 600 }}>{sub}</div>
    </Link>
  );
}

function BuschfunkPreview({ ev }) {
  const TYPE_ICON = {
    status: "💬", pinnwand: "📌", gift: "🎁", newpic: "🖼️",
    grouppost: "🏘️", login: "✨", register: "🎉", knuddel: "🥚",
    milestone: "🎯",
  };
  const icon = TYPE_ICON[ev.type] || "✨";
  const actorName = ev.actor?.displayName || ev.actor?.username || "Jemand";
  const username = ev.actor?.username;

  let text = "";
  if (ev.type === "status")     text = ev.detail ? `„${ev.detail}"` : "neuer Status";
  else if (ev.type === "pinnwand") text = ev.detail ? `„${ev.detail}"` : "Pinnwand-Eintrag";
  else if (ev.type === "gift")     text = `🎁 Geschenk verschickt`;
  else if (ev.type === "newpic")   text = "neues Profilbild";
  else if (ev.type === "register") text = "neu bei VibeVibo — sag Hallo!";
  else if (ev.type === "knuddel")  text = "geknuddelt 🫶";
  else text = ev.type;

  const when = relTime(ev.at);

  return (
    <Link href={username ? `/u/${username}` : "/buschfunk"} style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "10px 12px", borderRadius: 12,
      background: "#fff",
      border: "1px solid rgba(251,146,60,0.18)",
      textDecoration: "none", color: "inherit",
      transition: "transform 0.1s",
      WebkitTapHighlightColor: "transparent",
    }}>
      <div style={{
        flexShrink: 0, fontSize: 18, lineHeight: 1,
        width: 32, height: 32, borderRadius: 999,
        background: "linear-gradient(135deg, #fde68a, #fb923c)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1f2937", lineHeight: 1.3 }}>
          {actorName}
          <span style={{ fontSize: 10.5, fontWeight: 600, color: "#94a3b8", marginLeft: 6 }}>· {when}</span>
        </div>
        <div style={{
          fontSize: 12.5, color: "#475569", marginTop: 1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{text}</div>
      </div>
    </Link>
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
