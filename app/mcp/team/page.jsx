import { redirect } from "next/navigation";
import { getMcpUser } from "@/lib/modAuth";
import { getMcpDashboardStats, isTeamleitungRole, listModTeam } from "@/lib/db";
import McpHeader from "@/components/mcp/McpHeader";
import McpBottomNav from "@/components/mcp/McpBottomNav";

export const dynamic = "force-dynamic";

export default async function McpTeamPage() {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");
  const stats = getMcpDashboardStats();
  const team = listModTeam();
  const canManage = isTeamleitungRole(me.id);

  return (
    <div className="mcp-app">
      <McpHeader user={me} showGreeting={false} />
      <div className="mcp-content">
        <div className="mcp-section-label">
          👥 Team-Übersicht
          <span className="count">{team.length}</span>
        </div>
        {team.map((m) => (
          <div key={m.id} className="mcp-report-item" style={{ marginTop: 10 }}>
            <div className="mcp-report-row-1">
              <div className="mcp-report-avatar">{m.emoji || "👤"}</div>
              <div className="mcp-report-info">
                <div className="mcp-report-cat">@{m.username}</div>
                <div className="mcp-report-title">{m.displayName || m.username}</div>
              </div>
              <span className={`mcp-role-pill ${m.role}`}>
                {m.role === "admin" ? "ADMIN" : m.role === "teamleitung" ? "LEAD" : "MOD"}
              </span>
            </div>
          </div>
        ))}
        {canManage && (
          <div className="mcp-placeholder-card" style={{ marginTop: 22 }}>
            <div className="icon">➕</div>
            <b style={{ color: "var(--mcp-text-strong)", fontSize: 16 }}>Mod ernennen</b><br/>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55 }}>
              Such-Feld + Promotion-Button kommt in Phase 1b.
            </div>
          </div>
        )}
      </div>
      <McpBottomNav stats={stats} />
    </div>
  );
}
