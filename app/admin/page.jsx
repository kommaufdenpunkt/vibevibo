// 👑 VibeVibo Admin — Owner-Cockpit.
//
// Ziel: SAUBER. Nur was du als Owner brauchst. Moderation läuft im MCP.
// Vier Karten — Werbung, System, Notfall, Kommunikation. Alles Weitere ist
// unter "Legacy" erreichbar (das alte 17-Tab-Menü).

import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminPassword, adminEnabled } from "@/lib/admin";
import { adminStats, getDisplayConfig } from "@/lib/db";
import { getDisplayProvider } from "@/lib/ads";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }) {
  const sp = await searchParams;
  const pw = typeof sp?.pw === "string" ? sp.pw : "";

  if (!adminEnabled()) {
    return (
      <div style={cardCenter()}>
        <h2 style={{ margin: 0 }}>🔐 Admin nicht konfiguriert</h2>
        <p style={{ color: "#64748b", marginTop: 8 }}>
          Setze <code>VV_ADMIN_PASSWORD</code> in Coolify-ENV.
        </p>
      </div>
    );
  }
  if (!checkAdminPassword(pw)) {
    return (
      <div style={cardCenter()}>
        <h2 style={{ margin: 0, fontSize: 24 }}>👑 VibeVibo Owner</h2>
        <p style={{ color: "#64748b", marginTop: 6, fontSize: 13 }}>
          Bitte Admin-Passwort eingeben.
        </p>
        <form method="GET" action="/admin" style={{ marginTop: 18 }}>
          <input
            type="password" name="pw" autoFocus required autoComplete="current-password"
            placeholder="Passwort"
            style={inputStyle()}
          />
          {pw && <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 12, marginTop: 8 }}>⚠ Falsches Passwort</div>}
          <button type="submit" style={btnPrimary({ marginTop: 14, width: "100%" })}>
            ▶ Anmelden
          </button>
        </form>
      </div>
    );
  }

  // === EINGELOGGT ===

  let stats = {};
  try { stats = adminStats() || {}; } catch {}

  // Display-Config — für schnellen Status oben
  let display = {};
  try { display = getDisplayConfig() || {}; } catch {}
  const adsLive = display.enabled && display.provider === "adsense" && display.pubId;

  const pwQ = `pw=${encodeURIComponent(pw)}`;

  return (
    <div style={{
      maxWidth: 1080, margin: "0 auto", padding: "20px 16px 60px",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>

      {/* HERO */}
      <div style={{
        background: "linear-gradient(135deg, #1c1c1e 0%, #2d2d30 100%)",
        color: "#fff", padding: "22px 24px", borderRadius: 20,
        marginBottom: 20,
        boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 14,
      }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: 2, fontWeight: 800, textTransform: "uppercase" }}>
            👑 Owner-Cockpit
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4, letterSpacing: -0.5 }}>
            VibeVibo Admin
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}
            {" · "}{new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Pill ok={adsLive} label={adsLive ? "AdSense aktiv" : "AdSense aus"} />
          <Pill ok={stats.users > 0} label={`${stats.users || 0} User`} />
          <Pill ok={(stats.openReports || 0) === 0} label={`${stats.openReports || 0} offene Meldungen`} />
        </div>
      </div>

      {/* 5 HAUPTKARTEN */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 14,
      }}>
        <Card
          icon="👥" title="Mitglieder"
          desc="Alle User, Admins, Teamleitung, Moderatoren — komplette Userakte einsehen + verwalten."
          actions={[
            { label: "👥 Alle Mitglieder", href: `/admin/mitglieder?${pwQ}&tab=all` },
            { label: "👑 Admins", href: `/admin/mitglieder?${pwQ}&tab=admin` },
            { label: "🛡 Teamleitung", href: `/admin/mitglieder?${pwQ}&tab=teamleitung` },
            { label: "⚖️ Moderatoren", href: `/admin/mitglieder?${pwQ}&tab=moderator` },
          ]}
        />
        <Card
          icon="💰" title="Werbung & Geld"
          desc="AdSense konfigurieren, Live-Diagnose laufen lassen, Premium-Status checken."
          actions={[
            { label: "📊 Werbe-Diagnose", href: `/admin/werbung?${pwQ}` },
            { label: "⚙️ Provider-Settings", href: `/admin/legacy?${pwQ}&tab=settings` },
          ]}
        />
        <Card
          icon="⚙️" title="System"
          desc="App-Settings, Audit-Log, DB-Inspector, Wartungsmodus."
          actions={[
            { label: "📜 Audit-Log", href: `/admin/legacy?${pwQ}&tab=audit` },
            { label: "🔍 DB-Inspector", href: `/admin/inspector?${pwQ}` },
            { label: "🛠 Wartung", href: `/admin/wartung?${pwQ}` },
          ]}
        />
        <Card
          icon="🚨" title="Notfall"
          desc="User suchen, Hard-Ban, IP-Sperre, Geräte-Bann — wenn schnell gehandelt werden muss."
          actions={[
            { label: "👤 Mitglieder", href: `/admin/legacy?${pwQ}&tab=mitglieder` },
            { label: "🔨 Banns", href: `/admin/legacy?${pwQ}&tab=banns` },
            { label: "⛔ IP-Sperren", href: `/admin/legacy?${pwQ}&tab=ips` },
          ]}
        />
        <Card
          icon="📣" title="Kommunikation"
          desc="App-weite Nachrichten posten, Saison-Events planen, interne Neuigkeiten."
          actions={[
            { label: "📢 Broadcast", href: `/admin/legacy?${pwQ}&tab=broadcast` },
            { label: "🎉 Saison-Events", href: `/admin/legacy?${pwQ}&tab=events` },
            { label: "🆕 Neuigkeiten", href: `/admin/neu?${pwQ}` },
          ]}
        />
      </div>

      {/* MCP-LINK */}
      <div style={{
        marginTop: 22, padding: 18, borderRadius: 16,
        background: "linear-gradient(135deg, rgba(236,72,153,0.08), rgba(168,85,247,0.05))",
        border: "1px solid rgba(236,72,153,0.2)",
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      }}>
        <div style={{ fontSize: 32 }}>⚡</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Moderation läuft jetzt im MCP</div>
          <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
            Meldungen, Profilbilder, Fotos, Tickets, Team-Chat — alles auf{" "}
            <code style={{ fontSize: 12 }}>mcp.vibevibo.de</code>
          </div>
        </div>
        <a href="https://mcp.vibevibo.de" target="_blank" rel="noopener" style={btnPrimary({})}>
          → MCP öffnen
        </a>
      </div>

      {/* LEGACY-LINK (versteckter Notausstieg) */}
      <div style={{ marginTop: 28, textAlign: "center" }}>
        <Link href={`/admin/legacy?${pwQ}`} style={{
          fontSize: 12, color: "#94a3b8", textDecoration: "none",
        }}>
          📦 Klassisches Admin-Menü (alte 17 Tabs)
        </Link>
      </div>
    </div>
  );
}

// ─── Helpers / Komponenten ─────────────────────────────────────

function Card({ icon, title, desc, actions = [] }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 18, padding: 20,
      border: "1px solid #e5e5e7",
      boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ fontSize: 36, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: "#1c1c1e" }}>{title}</div>
      <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 6, lineHeight: 1.45, flex: 1 }}>
        {desc}
      </div>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "9px 12px", borderRadius: 10,
              background: "#f5f5f7",
              color: "#1c1c1e",
              fontWeight: 700, fontSize: 13,
              textDecoration: "none",
            }}
          >
            <span>{a.label}</span>
            <span style={{ color: "#94a3b8" }}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Pill({ ok, label }) {
  return (
    <span style={{
      padding: "5px 12px", borderRadius: 999,
      background: ok ? "rgba(16,185,129,0.18)" : "rgba(248,113,113,0.18)",
      color: ok ? "#a7f3d0" : "#fecaca",
      fontSize: 11, fontWeight: 800, letterSpacing: 0.3,
      border: `1px solid ${ok ? "rgba(16,185,129,0.3)" : "rgba(248,113,113,0.3)"}`,
    }}>
      {ok ? "●" : "○"} {label}
    </span>
  );
}

function cardCenter() {
  return {
    maxWidth: 420, margin: "60px auto", padding: 28,
    background: "#fff", borderRadius: 18,
    border: "1px solid #e5e5e7",
    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
    textAlign: "center",
    fontFamily: "system-ui, sans-serif",
  };
}

function inputStyle() {
  return {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: "1px solid #cbd5e1", fontSize: 14,
    fontFamily: "inherit", outline: "none",
  };
}

function btnPrimary(extra = {}) {
  return {
    padding: "10px 18px", borderRadius: 10,
    background: "linear-gradient(135deg, #ec4899, #a855f7)",
    color: "#fff", border: "none",
    fontWeight: 800, fontSize: 13, cursor: "pointer",
    fontFamily: "inherit", textDecoration: "none",
    display: "inline-block", textAlign: "center",
    ...extra,
  };
}
