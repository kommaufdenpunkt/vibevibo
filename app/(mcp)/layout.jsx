// Route-Groups in Next.js sind IMMER nested unter dem Root-Layout.
// Sub-Layouts dürfen KEIN eigenes <html>/<body> haben — sonst nested HTML invalid.
// Stattdessen wrappen wir Children in einer mcp-body-root-Klasse + JS-Hider,
// der ALLE VibeVibo-Chrome-Geschwister im DOM versteckt (Coms-Bar, Banner,
// Footer, Edge-Panels, portalierte Toasts).

import "./mcp.css";
import McpChromeHider from "./McpChromeHider";

export const metadata = {
  title: "MCP — VibeVibo Moderator Control Panel",
  description: "Internes Panel — nur für Mitglieder des VibeVibo-Teams.",
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: "#0a0a14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function McpLayout({ children }) {
  return (
    <div
      className="mcp-body-root"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        overflow: "auto",
        background: "#060611",
      }}
    >
      <McpChromeHider />
      {children}
    </div>
  );
}
