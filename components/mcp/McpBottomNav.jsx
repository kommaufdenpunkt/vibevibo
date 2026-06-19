"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/mcp", emoji: "🚩", label: "MELDUNG", badgeKey: "reportsOpen" },
  { href: "/mcp/bilder", emoji: "🖼", label: "BILDER", badgeKey: "profilePicsPending" },
  { href: "/mcp/tickets", emoji: "🎫", label: "TICKET", badgeKey: "ticketsOpen" },
  { href: "/mcp/team-chat", emoji: "💬", label: "CHAT" },
  { href: "/mcp/mehr", emoji: "⋯", label: "MEHR" },
];

export default function McpBottomNav({ stats = {} }) {
  const pathname = usePathname() || "";
  return (
    <nav className="mcp-bottom-nav">
      {TABS.map((t) => {
        const active = pathname === t.href || (t.href !== "/mcp" && pathname.startsWith(t.href));
        const badge = t.badgeKey ? stats[t.badgeKey] || 0 : 0;
        return (
          <Link key={t.href} href={t.href} className={`mcp-nav-item${active ? " active" : ""}`}>
            <div className="mcp-nav-icon-wrap">
              <span>{t.emoji}</span>
              {badge > 0 && <span className="mcp-nav-badge">{badge}</span>}
            </div>
            <div>{t.label}</div>
          </Link>
        );
      })}
    </nav>
  );
}
