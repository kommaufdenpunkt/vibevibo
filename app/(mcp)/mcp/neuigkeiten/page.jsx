import { redirect } from "next/navigation";
import { getMcpUser } from "@/lib/modAuth";
import { getMcpDashboardStats, listMcpChangelog } from "@/lib/db";
import McpHeader from "@/components/mcp/McpHeader";
import McpBottomNav from "@/components/mcp/McpBottomNav";

export const dynamic = "force-dynamic";

export default async function McpNeuigkeitenPage() {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");
  const stats = getMcpDashboardStats();
  const entries = listMcpChangelog({ limit: 30 });
  return (
    <div className="mcp-app">
      <McpHeader user={me} showGreeting={false} />
      <div className="mcp-content">
        <div className="mcp-section-label">📰 Was gibt es Neues</div>
        {entries.length === 0 ? (
          <div className="mcp-placeholder-card">
            <div className="icon">📰</div>
            <b style={{ color: "var(--mcp-text-strong)", fontSize: 16 }}>Noch keine Einträge</b><br/>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55 }}>
              Teamleitungen können hier interne Updates posten (neue Mods, Regel-Änderungen, Fidolin-Updates).
            </div>
          </div>
        ) : entries.map((e) => (
          <div key={e.id} className="mcp-report-item" style={{ marginTop: 10 }}>
            <div className="mcp-report-row-1">
              <div className="mcp-report-avatar">{e.pinned ? "📌" : "📰"}</div>
              <div className="mcp-report-info">
                <div className="mcp-report-cat">@{e.authorUsername} · {e.authorRole}</div>
                <div className="mcp-report-title">{e.title}</div>
              </div>
              <div className="mcp-report-time">{new Date(e.createdAt).toLocaleDateString("de-DE")}</div>
            </div>
            {e.body && (
              <div style={{ marginTop: 10, fontSize: 13, color: "var(--mcp-text-mid)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {e.body}
              </div>
            )}
          </div>
        ))}
      </div>
      <McpBottomNav stats={stats} />
    </div>
  );
}
