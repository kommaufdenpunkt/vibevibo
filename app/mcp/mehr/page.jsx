import { redirect } from "next/navigation";
import Link from "next/link";
import { getMcpUser } from "@/lib/modAuth";
import { getMcpDashboardStats } from "@/lib/db";
import McpHeader from "@/components/mcp/McpHeader";
import McpBottomNav from "@/components/mcp/McpBottomNav";
import McpLogoutButton from "@/components/mcp/McpLogoutButton";

export const dynamic = "force-dynamic";

const ITEMS = [
  { href: "/mcp/neuigkeiten", emoji: "📰", label: "Was gibt es Neues" },
  { href: "/mcp/team", emoji: "👥", label: "Team-Übersicht" },
  { href: "/mcp/akte", emoji: "📋", label: "Akte & Audit" },
];

export default async function McpMehrPage() {
  const me = await getMcpUser();
  if (!me) redirect("/mcp/login");
  const stats = getMcpDashboardStats();
  return (
    <div className="mcp-app">
      <McpHeader user={me} showGreeting={false} />
      <div className="mcp-content">
        <div className="mcp-section-label">⋯ Mehr</div>
        {ITEMS.map((it) => (
          <Link key={it.href} href={it.href} className="mcp-report-item" style={{ marginTop: 10 }}>
            <div className="mcp-report-row-1">
              <div className="mcp-report-avatar">{it.emoji}</div>
              <div className="mcp-report-info">
                <div className="mcp-report-title">{it.label}</div>
              </div>
              <div style={{ color: "var(--mcp-text-faint)", fontSize: 18 }}>→</div>
            </div>
          </Link>
        ))}
        <div className="mcp-section-label" style={{ marginTop: 22 }}>Konto</div>
        <div className="mcp-report-item">
          <div className="mcp-report-row-1">
            <div className="mcp-report-avatar">{me.emoji || "👤"}</div>
            <div className="mcp-report-info">
              <div className="mcp-report-cat">EINGELOGGT ALS</div>
              <div className="mcp-report-title">@{me.username}</div>
            </div>
            <span className={`mcp-role-pill ${me.role}`}>
              {me.role === "admin" ? "ADMIN" : me.role === "teamleitung" ? "LEAD" : "MOD"}
            </span>
          </div>
        </div>
        <McpLogoutButton />
      </div>
      <McpBottomNav stats={stats} />
    </div>
  );
}
