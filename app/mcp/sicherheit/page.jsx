import { redirect } from "next/navigation";
import { getMcpUser } from "@/lib/modAuth";
import { isTeamleitungRole } from "@/lib/db";
import {
  getMcpDashboardStats, getMcpSecurityOverview, listMcpLoginAudit,
} from "@/lib/db";
import McpHeader from "@/components/mcp/McpHeader";
import McpBottomNav from "@/components/mcp/McpBottomNav";
import McpSecurityScan from "@/components/mcp/McpSecurityScan";

export const dynamic = "force-dynamic";

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
  // IPv4: 1.2.3.4 → 1.2.3.* | IPv6: short
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
  }
  if (ip.includes(":")) return ip.split(":").slice(0, 4).join(":") + ":****";
  return ip;
}

export default async function McpSicherheitPage() {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");

  // 🔒 Nur Teamleitung+ darf die Sicherheits-Analyse sehen
  if (!isTeamleitungRole(me.id)) {
    return (
      <div className="mcp-app">
        <McpHeader user={me} showGreeting={false} />
        <div className="mcp-content">
          <div className="mcp-section-label">🛡 Sicherheits-Analyse</div>
          <div className="mcp-placeholder-card">
            <div className="icon">🔒</div>
            <b style={{ color: "var(--mcp-text-strong)", fontSize: 16 }}>Zugriff verweigert</b><br/>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55 }}>
              Sicherheits-Analyse ist nur für Teamleitung+ zugänglich.
            </div>
          </div>
        </div>
        <McpBottomNav stats={getMcpDashboardStats()} />
      </div>
    );
  }

  const stats = getMcpDashboardStats();
  const overview = getMcpSecurityOverview({ windowMs: 24 * 3600 * 1000 });
  const recentFails = listMcpLoginAudit({ success: false, limit: 30 });
  const recentSuccess = listMcpLoginAudit({ success: true, limit: 10 });

  return (
    <div className="mcp-app">
      <McpHeader user={me} showGreeting={false} />
      <div className="mcp-content">

        <div className="mcp-section-label">🛡 Sicherheits-Analyse · 24h</div>

        <McpSecurityScan overview={overview} />

        {/* Stat-Kacheln */}
        <div className="mcp-mini-stats" style={{ marginTop: 16 }}>
          <div className="mcp-mini-stat">
            <div className="mcp-mini-stat-icon">🔓</div>
            <div className="mcp-mini-stat-content">
              <div className="mcp-mini-stat-num">{overview.attemptsSuccess}</div>
              <div className="mcp-mini-stat-label">Login OK</div>
            </div>
          </div>
          <div className="mcp-mini-stat" style={{ borderColor: "rgba(248,113,113,0.35)" }}>
            <div className="mcp-mini-stat-icon">⚠</div>
            <div className="mcp-mini-stat-content">
              <div className="mcp-mini-stat-num" style={{ color: "#fca5a5" }}>{overview.attemptsFail}</div>
              <div className="mcp-mini-stat-label">Fehlversuche</div>
            </div>
          </div>
          <div className="mcp-mini-stat">
            <div className="mcp-mini-stat-icon">⏱</div>
            <div className="mcp-mini-stat-content">
              <div className="mcp-mini-stat-num">{overview.blockedRatelimit}</div>
              <div className="mcp-mini-stat-label">Lockouts</div>
            </div>
          </div>
          <div className="mcp-mini-stat">
            <div className="mcp-mini-stat-icon">🕵</div>
            <div className="mcp-mini-stat-content">
              <div className="mcp-mini-stat-num">{overview.blockedBadIp + overview.blockedVpn}</div>
              <div className="mcp-mini-stat-label">IP/VPN Block</div>
            </div>
          </div>
        </div>

        {/* Top angreifende IPs */}
        {overview.topFailingIps.length > 0 && (
          <>
            <div className="mcp-section-label" style={{ marginTop: 24 }}>
              🌐 Top angreifende IPs (24h)
            </div>
            {overview.topFailingIps.map((row) => (
              <div key={row.ip} className="mcp-report-item" style={{ marginTop: 8 }}>
                <div className="mcp-report-row-1">
                  <div className="mcp-report-avatar urgent">🌐</div>
                  <div className="mcp-report-info">
                    <div className="mcp-report-cat">FEHLVERSUCHE</div>
                    <div className="mcp-report-title" style={{ fontFamily: "monospace" }}>
                      {maskIp(row.ip)}
                    </div>
                  </div>
                  <div className="mcp-report-time" style={{ fontSize: 14, fontWeight: 800, color: "#fca5a5" }}>
                    {row.c}×
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Top angegriffene Usernames */}
        {overview.topFailingUsernames.length > 0 && (
          <>
            <div className="mcp-section-label" style={{ marginTop: 24 }}>
              👤 Top angegriffene Accounts (24h)
            </div>
            {overview.topFailingUsernames.map((row) => (
              <div key={row.username} className="mcp-report-item" style={{ marginTop: 8 }}>
                <div className="mcp-report-row-1">
                  <div className="mcp-report-avatar urgent">👤</div>
                  <div className="mcp-report-info">
                    <div className="mcp-report-cat">VERSUCHE AUF</div>
                    <div className="mcp-report-title">@{row.username}</div>
                  </div>
                  <div className="mcp-report-time" style={{ fontSize: 14, fontWeight: 800, color: "#fca5a5" }}>
                    {row.c}×
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Letzte Fehlversuche */}
        <div className="mcp-section-label" style={{ marginTop: 24 }}>
          📋 Letzte Fehlversuche
        </div>
        {recentFails.length === 0 ? (
          <div className="mcp-placeholder-card">
            <div className="icon">🎉</div>
            <b style={{ color: "var(--mcp-text-strong)" }}>Keine Hack-Versuche</b><br/>
            In den letzten 24 Stunden gab es keine fehlgeschlagenen Login-Versuche.
          </div>
        ) : recentFails.map((row) => (
          <div key={row.id} className="mcp-report-item" style={{ marginTop: 8 }}>
            <div className="mcp-report-row-1">
              <div className="mcp-report-avatar urgent">⚠</div>
              <div className="mcp-report-info">
                <div className="mcp-report-cat">{reasonLabel(row.reason)}</div>
                <div className="mcp-report-title">
                  @{row.username || "?"} <span style={{ color: "var(--mcp-text-faint)", fontWeight: 500 }}>
                    von {maskIp(row.ip)}
                  </span>
                </div>
              </div>
              <div className="mcp-report-time">{fmtTime(row.ts)}</div>
            </div>
          </div>
        ))}

        {/* Letzte erfolgreiche Logins */}
        {recentSuccess.length > 0 && (
          <>
            <div className="mcp-section-label" style={{ marginTop: 24 }}>
              ✅ Letzte erfolgreiche Mod-Logins
            </div>
            {recentSuccess.map((row) => (
              <div key={row.id} className="mcp-report-item" style={{ marginTop: 8 }}>
                <div className="mcp-report-row-1">
                  <div className="mcp-report-avatar" style={{
                    background: "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(16,185,129,0.1))",
                    borderColor: "rgba(16,185,129,0.4)",
                  }}>✓</div>
                  <div className="mcp-report-info">
                    <div className="mcp-report-cat" style={{ color: "var(--mcp-green)" }}>
                      LOGIN OK · {row.reason || "—"}
                    </div>
                    <div className="mcp-report-title">@{row.username}</div>
                  </div>
                  <div className="mcp-report-time">{fmtTime(row.ts)}</div>
                </div>
              </div>
            ))}
          </>
        )}

      </div>
      <McpBottomNav stats={stats} />
    </div>
  );
}
