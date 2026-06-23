// 🚑 FIX: Route-Groups in Next.js sind IMMER nested unter dem Root-Layout.
// Sub-Layouts dürfen KEIN eigenes <html>/<body> haben — sonst nested HTML invalid.
// Stattdessen wrappen wir nur die Children in einer mcp-body-root-Klasse.
// Die Root-Layout-Wrapper (vv-page, vv-banner, vv-footer) bleiben sichtbar —
// für TRUE standalone müsste man app/layout.jsx auf Route-Groups splitten.

import "./mcp.css";

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
        // 🛡 MCP überdeckt VibeVibo-Layout via position:fixed + z-index
        // damit's wie eine standalone Hochsicherheits-Seite aussieht.
        position: "fixed",
        inset: 0,
        zIndex: 99998,
        overflow: "auto",
        background: "#060611",
      }}
    >
      {children}
    </div>
  );
}
