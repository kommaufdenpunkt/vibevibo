import { redirect } from "next/navigation";
import { getMcpUser } from "@/lib/modAuth";
import { getMcpDashboardStats, isTeamleitungRole } from "@/lib/db";
import McpPlaceholder from "@/components/mcp/McpPlaceholder";
import McpHeader from "@/components/mcp/McpHeader";
import McpBottomNav from "@/components/mcp/McpBottomNav";

export const dynamic = "force-dynamic";

export default async function McpTeamChatPage() {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");
  const stats = getMcpDashboardStats();
  if (!isTeamleitungRole(me.id)) {
    // Normale Mods kommen nicht in den Team-Chat
    return (
      <div className="mcp-app">
        <McpHeader user={me} showGreeting={false} />
        <div className="mcp-content">
          <div className="mcp-section-label">💬 Team-Chat</div>
          <div className="mcp-placeholder-card">
            <div className="icon">🔒</div>
            <b style={{ color: "var(--mcp-text-strong)", fontSize: 16 }}>Nur Teamleitungen + Admin</b><br/>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55 }}>
              Der interne Team-Chat ist Teamleitungen und Admins vorbehalten.
              Für allgemeine Mod-Kommunikation gibt es bald einen separaten Bereich.
            </div>
          </div>
        </div>
        <McpBottomNav stats={stats} />
      </div>
    );
  }
  return (
    <McpPlaceholder
      user={me} stats={stats}
      title="💬 Team-Chat"
      icon="💬"
      description="Interner Chat nur für Teamleitungen + Admin. Schnelle Abstimmungen über Sanktionen, schwierige Fälle, neue Mod-Kandidaten."
      comingNext
    />
  );
}
