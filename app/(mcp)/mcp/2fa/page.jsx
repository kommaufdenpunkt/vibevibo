// 🔐 2FA-Setup-Seite für MCP-User.

import { redirect } from "next/navigation";
import { getMcpUser } from "@/lib/modAuth";
import { isMcpTotpEnabled, getMcpDashboardStats } from "@/lib/db";
import McpHeader from "@/components/mcp/McpHeader";
import McpBottomNav from "@/components/mcp/McpBottomNav";
import Mcp2faSetup from "@/components/mcp/Mcp2faSetup";

export const dynamic = "force-dynamic";

export default async function McpTwoFaPage() {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");
  const enabled = isMcpTotpEnabled(me.id);
  const stats = getMcpDashboardStats();

  return (
    <div className="mcp-app">
      <McpHeader user={me} showGreeting={false} />
      <div className="mcp-content">
        <div className="mcp-section-label">🔐 2-Faktor-Authentifizierung</div>
        <Mcp2faSetup alreadyEnabled={enabled} />
      </div>
      <McpBottomNav stats={stats} />
    </div>
  );
}
