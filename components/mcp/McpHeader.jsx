"use client";
import Link from "next/link";

function greeting(hour) {
  if (hour < 5) return "Späte Schicht";
  if (hour < 11) return "Guten Morgen";
  if (hour < 14) return "Hallo";
  if (hour < 18) return "Guten Tag";
  if (hour < 22) return "Guten Abend";
  return "Späte Schicht";
}

function roleClass(role) {
  if (role === "admin") return "admin";
  if (role === "teamleitung") return "teamleitung";
  return "moderator";
}

function roleLabel(role) {
  if (role === "admin") return "ADMIN";
  if (role === "teamleitung") return "LEAD";
  return "MOD";
}

export default function McpHeader({ user, showGreeting = true }) {
  const now = new Date();
  const dayName = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"][now.getDay()];
  const time = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const greet = greeting(now.getHours());
  const displayName = user?.displayName || user?.username || "Mod";

  return (
    <header className="mcp-header">
      <div className="mcp-header-row">
        <Link href="/mcp" className="mcp-brand" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="mcp-brand-mark">⚡</div>
          <div className="mcp-brand-text">
            MCP
            <small>VIBEVIBO TEAM</small>
          </div>
        </Link>
        <div className="mcp-spacer" />
        <Link href="/mcp/mehr" className="mcp-avatar-chip">
          <span className="mcp-avatar-chip-text">@{user?.username || "—"}</span>
          <span className={`mcp-role-pill ${roleClass(user?.role)}`}>{roleLabel(user?.role)}</span>
        </Link>
      </div>

      {showGreeting && (
        <div className="mcp-greeting">
          <div className="mcp-greeting-time">
            <span className="mcp-live-dot" />
            {dayName} · {time} Uhr
          </div>
          <div className="mcp-greeting-text">{greet} <span className="accent">{displayName}</span> 👋</div>
        </div>
      )}
    </header>
  );
}
