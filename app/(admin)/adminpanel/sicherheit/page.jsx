// 🛡 Sicherheits-Analyse auf admin.vibevibo.de
// Migriert von /mcp/sicherheit — diese Analyse gehört zur Plattform-Admin-
// Arbeit, nicht zur Inhalts-Moderation. Mods sehen sie nicht mehr.

import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/adminAuth";
import {
  getMcpDashboardStats, getMcpSecurityOverview, listMcpLoginAudit,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sicherheits-Analyse — Admin",
  robots: { index: false, follow: false },
};

function fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function reasonLabel(r) {
  const x = String(r || "");
  if (x === "wrong_password") return "🔑 Falsches Passwort";
  if (x === "no_mod_role") return "🚫 Kein Mod-Account";
  if (x.startsWith("ratelimit")) return "⏱ Rate-Limit";
  if (x.endsWith("lockout")) return "🔒 Lockout";
  if (x.startsWith("bad_ip")) return "🌐 IP-Reputation";
  if (x.startsWith("vpn")) return "🕵 VPN/Proxy";
  if (x === "bad_origin") return "🚷 Origin-Mismatch";
  if (x === "device_banned") return "📵 Gerät gesperrt";
  if (x === "account_blocked") return "⛔ Account gesperrt";
  if (x === "missing_credentials") return "❓ Felder leer";
  if (x === "internal_error") return "💥 Server-Fehler";
  return r || "—";
}

function maskIp(ip) {
  if (!ip) return "—";
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
  }
  if (ip.includes(":")) return ip.split(":").slice(0, 4).join(":") + ":****";
  return ip;
}

function Stat({ icon, num, label, accent = false }) {
  return (
    <div style={{
      padding: "14px 16px",
      background: accent ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
      border: `1px solid ${accent ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 12,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div>
        <div style={{
          fontSize: 22, fontWeight: 800,
          color: accent ? "#fca5a5" : "#f8f8fb",
          lineHeight: 1.1,
        }}>{num}</div>
        <div style={{ fontSize: 11, color: "rgba(241,241,245,0.55)", marginTop: 2 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function ListItem({ icon, cat, title, right, urgent = false }) {
  return (
    <div style={{
      padding: "12px 14px",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 10,
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      gap: 12,
      alignItems: "center",
      marginBottom: 8,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: urgent
          ? "linear-gradient(135deg, rgba(239,68,68,0.35), rgba(239,68,68,0.15))"
          : "rgba(255,255,255,0.06)",
        fontSize: 18,
      }}>{icon}</div>
      <div>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: "0.05em",
          color: urgent ? "#fca5a5" : "rgba(241,241,245,0.55)",
          textTransform: "uppercase",
        }}>{cat}</div>
        <div style={{ fontSize: 13, color: "#f1f1f5", marginTop: 2 }}>{title}</div>
      </div>
      <div style={{
        fontSize: 12, fontWeight: 600,
        color: urgent ? "#fca5a5" : "rgba(241,241,245,0.55)",
        whiteSpace: "nowrap",
      }}>{right}</div>
    </div>
  );
}

export default async function AdminSicherheitPage() {
  const me = await getAdminUser();
  if (!me) redirect("/login");

  const overview = getMcpSecurityOverview({ windowMs: 24 * 3600 * 1000 });
  const recentFails = listMcpLoginAudit({ success: false, limit: 30 });
  const recentSuccess = listMcpLoginAudit({ success: true, limit: 10 });

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px", maxWidth: 960, margin: "0 auto" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        marginBottom: 24, paddingBottom: 20,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <a href="/" style={{
          color: "rgba(241,241,245,0.55)", fontSize: 13, textDecoration: "none",
          padding: "6px 12px", borderRadius: 8,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>← Dashboard</a>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 40, height: 40, borderRadius: 10,
          background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
          fontSize: 20,
        }}>🛡</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#f8f8fb" }}>Sicherheits-Analyse</div>
          <div style={{ fontSize: 12, color: "rgba(241,241,245,0.55)" }}>Letzte 24 Stunden</div>
        </div>
      </div>

      {/* Stat-Kacheln */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 10, marginBottom: 24,
      }}>
        <Stat icon="🔓" num={overview.attemptsSuccess} label="Logins OK" />
        <Stat icon="⚠" num={overview.attemptsFail} label="Fehlversuche" accent={overview.attemptsFail > 0} />
        <Stat icon="⏱" num={overview.blockedRatelimit} label="Lockouts" />
        <Stat icon="🕵" num={overview.blockedBadIp + overview.blockedVpn} label="IP / VPN Block" />
      </div>

      {/* Top angreifende IPs */}
      {overview.topFailingIps.length > 0 && (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "rgba(241,241,245,0.7)", marginTop: 24, marginBottom: 12 }}>
            🌐 Top angreifende IPs
          </h2>
          {overview.topFailingIps.map((row) => (
            <ListItem
              key={row.ip}
              icon="🌐"
              cat="FEHLVERSUCHE"
              title={<span style={{ fontFamily: "monospace" }}>{maskIp(row.ip)}</span>}
              right={`${row.c}×`}
              urgent
            />
          ))}
        </>
      )}

      {/* Top angegriffene Usernames */}
      {overview.topFailingUsernames.length > 0 && (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "rgba(241,241,245,0.7)", marginTop: 24, marginBottom: 12 }}>
            👤 Top angegriffene Accounts
          </h2>
          {overview.topFailingUsernames.map((row) => (
            <ListItem
              key={row.username}
              icon="👤"
              cat="VERSUCHE AUF"
              title={`@${row.username}`}
              right={`${row.c}×`}
              urgent
            />
          ))}
        </>
      )}

      {/* Letzte Fehlversuche */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "rgba(241,241,245,0.7)", marginTop: 24, marginBottom: 12 }}>
        📋 Letzte Fehlversuche
      </h2>
      {recentFails.length === 0 ? (
        <div style={{
          padding: 40, textAlign: "center",
          background: "rgba(16,185,129,0.06)",
          border: "1px solid rgba(16,185,129,0.2)",
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 700, color: "#86efac" }}>Keine Hack-Versuche</div>
          <div style={{ fontSize: 12, color: "rgba(241,241,245,0.55)", marginTop: 6 }}>
            In den letzten 24 Stunden gab es keine fehlgeschlagenen Login-Versuche.
          </div>
        </div>
      ) : recentFails.map((row) => (
        <ListItem
          key={row.id}
          icon="⚠"
          cat={reasonLabel(row.reason)}
          title={<>@{row.username || "?"} <span style={{ color: "rgba(241,241,245,0.5)", fontWeight: 500 }}> von {maskIp(row.ip)}</span></>}
          right={fmtTime(row.ts)}
          urgent
        />
      ))}

      {/* Letzte erfolgreiche Logins */}
      {recentSuccess.length > 0 && (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "rgba(241,241,245,0.7)", marginTop: 24, marginBottom: 12 }}>
            ✅ Letzte erfolgreiche Mod-Logins
          </h2>
          {recentSuccess.map((row) => (
            <ListItem
              key={row.id}
              icon="✓"
              cat={`LOGIN OK · ${row.reason || "—"}`}
              title={`@${row.username}`}
              right={fmtTime(row.ts)}
            />
          ))}
        </>
      )}

      <div style={{
        marginTop: 32, padding: "12px 14px",
        background: "rgba(124,58,237,0.08)",
        border: "1px solid rgba(124,58,237,0.25)",
        borderRadius: 10, fontSize: 11, color: "rgba(241,241,245,0.6)",
        lineHeight: 1.6,
      }}>
        💡 Diese Analyse zeigt Login-Aktivität auf <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 3 }}>mcp.vibevibo.de</code> +
        {" "}<code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 3 }}>admin.vibevibo.de</code>.
        IPs sind aus Datenschutzgründen maskiert.
      </div>
    </div>
  );
}
