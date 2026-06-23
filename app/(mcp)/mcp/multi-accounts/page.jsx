// 🕵 Multi-Account-Detector — zeigt User die IPs teilen.
// Nur Teamleitung+ darf das sehen (sensible IP-Daten).

import { redirect } from "next/navigation";
import Link from "next/link";
import { getMcpUser } from "@/lib/modAuth";
import {
  isTeamleitungRole, getMcpDashboardStats,
  findAccountsByIp, findRelatedAccounts, countAccountsFromIp,
} from "@/lib/db";
import McpHeader from "@/components/mcp/McpHeader";
import McpBottomNav from "@/components/mcp/McpBottomNav";

export const dynamic = "force-dynamic";

function fmtTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function maskIp(ip) {
  if (!ip) return "—";
  if (ip.includes(".")) {
    const p = ip.split(".");
    if (p.length === 4) return `${p[0]}.${p[1]}.${p[2]}.*`;
  }
  return ip.split(":").slice(0, 4).join(":") + ":****";
}

export default async function McpMultiAccountsPage({ searchParams }) {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");
  if (!isTeamleitungRole(me.id)) {
    return (
      <div className="mcp-app">
        <McpHeader user={me} showGreeting={false} />
        <div className="mcp-content">
          <div className="mcp-section-label">🕵 Multi-Account-Detector</div>
          <div className="mcp-placeholder-card">
            <div className="icon">🔒</div>
            <b style={{ color: "var(--mcp-text-strong)" }}>Zugriff verweigert</b><br/>
            Nur Teamleitung+ kann IP-Daten einsehen.
          </div>
        </div>
        <McpBottomNav stats={getMcpDashboardStats()} />
      </div>
    );
  }

  const sp = await searchParams;
  const stats = getMcpDashboardStats();
  const ipQuery = typeof sp?.ip === "string" ? sp.ip.trim() : "";
  const userQuery = typeof sp?.userId === "string" ? Number(sp.userId) : 0;

  let accountsByIp = [];
  let relatedAccounts = [];
  let count24h = 0;
  if (ipQuery) {
    accountsByIp = findAccountsByIp(ipQuery, { limit: 30 });
    count24h = countAccountsFromIp(ipQuery, 24 * 3600 * 1000);
  }
  if (userQuery) {
    relatedAccounts = findRelatedAccounts(userQuery, { limit: 30 });
  }

  return (
    <div className="mcp-app">
      <McpHeader user={me} showGreeting={false} />
      <div className="mcp-content">

        <div className="mcp-section-label">🕵 Multi-Account-Detector</div>

        {/* IP-Suche */}
        <form method="GET" action="/mcp/multi-accounts" style={{ display: "grid", gap: 10, marginBottom: 16 }}>
          <input
            name="ip" defaultValue={ipQuery}
            placeholder="🌐 IP eingeben (z.B. 178.104.82.169)"
            className="mcp-input"
            style={{ fontFamily: "monospace" }}
          />
          <button type="submit" className="mcp-btn mcp-btn-primary">
            🔍 Accounts unter dieser IP anzeigen
          </button>
        </form>

        {/* User-ID-Suche */}
        <form method="GET" action="/mcp/multi-accounts" style={{ display: "grid", gap: 10, marginBottom: 18 }}>
          <input
            name="userId" type="number" defaultValue={userQuery || ""}
            placeholder="👤 User-ID eingeben — zeigt verwandte Accounts"
            className="mcp-input"
          />
          <button type="submit" className="mcp-btn mcp-btn-secondary">
            🔗 Verwandte Accounts finden
          </button>
        </form>

        {/* Ergebnisse IP-Suche */}
        {ipQuery && (
          <>
            <div className="mcp-section-label" style={{ marginTop: 20 }}>
              🌐 {accountsByIp.length} Accounts unter {maskIp(ipQuery)}
              {count24h > 0 && (
                <span className="count" style={{ background: count24h > 3 ? "rgba(248,113,113,0.2)" : undefined }}>
                  {count24h} in 24h
                </span>
              )}
            </div>
            {accountsByIp.length === 0 ? (
              <div className="mcp-placeholder-card">
                <div className="icon">🌐</div>
                <b style={{ color: "var(--mcp-text-strong)" }}>Keine Treffer</b><br/>
                Diese IP hat noch keinen User-Login produziert.
              </div>
            ) : accountsByIp.map((a) => (
              <div key={a.id} className="mcp-report-item" style={{ marginTop: 8 }}>
                <div className="mcp-report-row-1">
                  <div className="mcp-report-avatar">
                    {a.role === "admin" ? "👑" : a.role === "teamleitung" ? "🛡" : a.role === "moderator" ? "⚖️" : "👤"}
                  </div>
                  <div className="mcp-report-info">
                    <div className="mcp-report-cat">
                      {a.role.toUpperCase()} · {a.useCount}× Login
                    </div>
                    <div className="mcp-report-title">
                      @{a.username} {a.status === "blocked" && <span style={{ color: "var(--mcp-red)" }}>🚫</span>}
                    </div>
                  </div>
                  <div className="mcp-report-time">
                    {fmtTime(a.lastSeen)}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Ergebnisse User-Suche */}
        {userQuery > 0 && (
          <>
            <div className="mcp-section-label" style={{ marginTop: 20 }}>
              🔗 {relatedAccounts.length} Verwandte Accounts für #{userQuery}
            </div>
            {relatedAccounts.length === 0 ? (
              <div className="mcp-placeholder-card">
                <div className="icon">🎉</div>
                <b style={{ color: "var(--mcp-text-strong)" }}>Keine Verwandtschaft</b><br/>
                Dieser User teilt keine IP mit anderen Accounts.
              </div>
            ) : relatedAccounts.map((a) => (
              <div key={`${a.id}-${a.sharedIp}`} className="mcp-report-item" style={{ marginTop: 8 }}>
                <div className="mcp-report-row-1">
                  <div className="mcp-report-avatar urgent">🔗</div>
                  <div className="mcp-report-info">
                    <div className="mcp-report-cat">
                      Geteilte IP: <span style={{ fontFamily: "monospace" }}>{maskIp(a.sharedIp)}</span>
                    </div>
                    <div className="mcp-report-title">
                      @{a.username} ({a.role}) {a.status === "blocked" && <span style={{ color: "var(--mcp-red)" }}>🚫</span>}
                    </div>
                  </div>
                  <div className="mcp-report-time">{fmtTime(a.sharedLastSeen)}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Hilfe-Box wenn nix gesucht */}
        {!ipQuery && !userQuery && (
          <div className="mcp-placeholder-card" style={{ marginTop: 16 }}>
            <div className="icon">🕵</div>
            <b style={{ color: "var(--mcp-text-strong)" }}>Multi-Account-Suche</b><br/>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
              <b>IP-Suche</b>: Zeigt alle User-Accounts die je von einer IP gelogged haben.<br/>
              <b>User-Suche</b>: Zeigt Accounts die mit dem gegebenen User mindestens eine IP teilen.<br/>
              <i>Mehr als 3 Accounts auf einer IP in 24h = verdächtig.</i>
            </div>
          </div>
        )}
      </div>
      <McpBottomNav stats={stats} />
    </div>
  );
}
