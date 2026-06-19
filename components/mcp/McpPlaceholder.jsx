import McpHeader from "./McpHeader";
import McpBottomNav from "./McpBottomNav";

export default function McpPlaceholder({ user, stats = {}, title, icon, description, comingNext }) {
  return (
    <div className="mcp-app">
      <McpHeader user={user} showGreeting={false} />
      <div className="mcp-content">
        <div className="mcp-section-label">{title}</div>
        <div className="mcp-placeholder-card">
          <div className="icon">{icon}</div>
          <b style={{ color: "var(--mcp-text-strong)", fontSize: 16 }}>{title}</b><br/>
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55 }}>
            {description}
          </div>
          {comingNext && (
            <div style={{ marginTop: 14, fontSize: 11, color: "var(--mcp-pink-light)", fontWeight: 700, letterSpacing: 0.5 }}>
              🚧 KOMMT IN PHASE 1B
            </div>
          )}
        </div>
      </div>
      <McpBottomNav stats={stats} />
    </div>
  );
}
