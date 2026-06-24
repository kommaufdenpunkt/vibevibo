// 📋 Akte-Audit-Übersicht — wer hat welche Userakte wann mit welcher Begründung
// angeschaut. NUR für Admins+ sichtbar (Owner-Transparenz für Mod-Verhalten).
//
// Phase 1: Server-side gerendert, einfache Liste der letzten 200 Zugriffe.
// Phase 2 (später): Filter, CSV-Export, Auffälligkeits-Highlighting.

import { redirect } from "next/navigation";
import { getMcpUser } from "@/lib/modAuth";
import { isAdminRole, getMcpDashboardStats } from "@/lib/db";
import { listAkteAccess } from "@/lib/akteAudit";
import McpBottomNav from "@/components/mcp/McpBottomNav";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Akte-Audit — MCP",
  robots: { index: false, follow: false },
};

function formatTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ageBadge(ts) {
  const ageMin = Math.floor((Date.now() - ts) / 60000);
  if (ageMin < 60) return `vor ${ageMin}min`;
  if (ageMin < 1440) return `vor ${Math.floor(ageMin / 60)}h`;
  return `vor ${Math.floor(ageMin / 1440)}d`;
}

export default async function AkteAuditPage() {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");

  const stats = getMcpDashboardStats();

  if (!isAdminRole(me.id)) {
    return (
      <>
        <div className="mcp-app" style={{ padding: 32, textAlign: "center", paddingBottom: 100 }}>
          <h2 style={{ color: "#fca5a5" }}>🚫 Nur für Admins+</h2>
          <p style={{ color: "var(--mcp-text-mid, #888)", marginTop: 12 }}>
            Diese Seite zeigt Mod-Verhalten und ist Owner/Admin vorbehalten.
          </p>
        </div>
        <McpBottomNav stats={stats} />
      </>
    );
  }

  const accesses = listAkteAccess({ limit: 200 });

  return (
    <>
      <div className="mcp-app" style={{ paddingBottom: 100 }}>
        <div className="mcp-header">
          <div className="mcp-header-row">
            <div className="mcp-brand">
              <div className="mcp-brand-mark">📋</div>
              <div className="mcp-brand-text">
                AKTE-AUDIT
                <small>WHO WATCHED WHAT</small>
              </div>
            </div>
          </div>
          <div className="mcp-greeting">
            <div className="mcp-greeting-time">Letzte 7 Tage · {accesses.length} Zugriffe</div>
            <div className="mcp-greeting-text">
              <span className="accent">Mod-Transparenz</span>
            </div>
          </div>
        </div>

        <div className="mcp-content">
          {accesses.length === 0 ? (
            <div style={{
              padding: 40,
              textAlign: "center",
              color: "var(--mcp-text-mid, #888)",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 12,
              border: "1px dashed rgba(255,255,255,0.08)",
            }}>
              Noch keine Akte-Zugriffe in den letzten 7 Tagen.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {accesses.map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 12,
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 14,
                    alignItems: "start",
                  }}
                >
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "rgba(241,241,245,0.5)",
                    whiteSpace: "nowrap",
                    paddingTop: 2,
                  }}>
                    {ageBadge(a.accessed_at)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "#f1f1f5", marginBottom: 4 }}>
                      Mod <strong style={{ color: "#fca5a5" }}>#{a.mod_id}</strong>
                      {" "}öffnete Akte von User <strong style={{ color: "#86efac" }}>#{a.target_user_id}</strong>
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: "rgba(241,241,245,0.65)",
                      lineHeight: 1.5,
                      padding: "8px 10px",
                      background: "rgba(0,0,0,0.25)",
                      borderRadius: 8,
                      borderLeft: "3px solid rgba(239,68,68,0.5)",
                      marginTop: 6,
                    }}>
                      💬 {a.reason}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: "rgba(241,241,245,0.35)",
                    whiteSpace: "nowrap",
                    textAlign: "right",
                  }}>
                    {formatTime(a.accessed_at)}
                    <br />
                    {a.ip ? <span style={{ fontFamily: "monospace" }}>{a.ip}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{
            marginTop: 24,
            padding: "12px 14px",
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 10,
            fontSize: 12,
            color: "rgba(241,241,245,0.7)",
            lineHeight: 1.6,
          }}>
            💡 Phase 2 (geplant): Filter nach Mod/User, Auffälligkeits-Highlighting
            (häufige Zugriffe), CSV-Export, Suche nach Begründung-Text.
          </div>
        </div>
      </div>
      <McpBottomNav stats={stats} />
    </>
  );
}
