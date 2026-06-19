import { redirect } from "next/navigation";
import { getMcpUser } from "@/lib/modAuth";
import McpLoginForm from "@/components/mcp/McpLoginForm";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "MCP Login — VibeVibo Team",
  robots: { index: false, follow: false },
};

export default async function McpLoginPage() {
  const me = await getMcpUser();
  if (me) redirect("/mcp");
  return (
    <div className="mcp-app" style={{ paddingBottom: 0 }}>
      <div className="mcp-header">
        <div className="mcp-header-row">
          <div className="mcp-brand">
            <div className="mcp-brand-mark">⚡</div>
            <div className="mcp-brand-text">
              MCP
              <small>VIBEVIBO TEAM</small>
            </div>
          </div>
        </div>
        <div className="mcp-greeting">
          <div className="mcp-greeting-time">Mod Control Panel</div>
          <div className="mcp-greeting-text">
            <span className="accent">Anmelden</span>
          </div>
        </div>
      </div>
      <div className="mcp-content">
        <p style={{ color: "var(--mcp-text-soft)", fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>
          Nur Mitglieder des VibeVibo-Teams haben Zugriff.<br/>
          Falls du Hilfe brauchst, melde dich bei einer Teamleitung.
        </p>
        <McpLoginForm />
      </div>
    </div>
  );
}
