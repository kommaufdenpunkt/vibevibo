// MCP Login — integriert das bestehende <McpLoginForm /> (mit username + 2FA-Flow,
// POST /api/mcp/auth, Cookie via lib/modAuth.js) in eine Hochsicherheits-Optik.
//
// Server Component:
//  • prüft via getMcpUser() ob schon eingeloggt → redirect("/mcp")
//  • rendert Hochsicherheits-Header (Stufe, TLS-Hinweis, Audit-Info)
//  • wrappt das bestehende McpLoginForm in Glass-Card
//
// CSS-Klassen, die das Form benutzt (mcp-input/mcp-label/mcp-btn/mcp-alert/...)
// kommen aus app/(mcp)/mcp.css — das wurde mit vv_mcp_css_restore (6d0ed62)
// wiederhergestellt.

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
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        background:
          "radial-gradient(ellipse at top, #1a0b3d 0%, #060611 55%), " +
          "radial-gradient(ellipse at bottom right, rgba(124, 58, 237, 0.18), transparent 60%), " +
          "radial-gradient(ellipse at bottom left, rgba(56, 189, 248, 0.12), transparent 55%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "28px 26px 24px",
          background: "rgba(20, 22, 38, 0.65)",
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 24,
          boxShadow:
            "0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
          color: "#f1f1f5",
        }}
      >
        {/* Sicherheitsstufe Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "9px 14px",
            marginBottom: 20,
            background:
              "linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(220, 38, 38, 0.10))",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#fca5a5",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 8 }}>🔴</span>
            Sicherheitsstufe: HOCH
          </span>
          <span style={{ opacity: 0.6, letterSpacing: "0.02em", fontSize: 10 }}>
            MCP v1
          </span>
        </div>

        {/* Logo + Title */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
              boxShadow:
                "0 12px 32px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
              marginBottom: 12,
              fontSize: 26,
            }}
            aria-hidden="true"
          >
            🛡️
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              color: "#f8f8fb",
            }}
          >
            MCP
          </h1>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 12,
              color: "rgba(241, 241, 245, 0.55)",
              fontWeight: 500,
            }}
          >
            Moderator Control Panel
          </p>
        </div>

        {/* Sicherheits-Hinweise */}
        <div
          style={{
            padding: "11px 13px",
            background: "rgba(124, 58, 237, 0.08)",
            border: "1px solid rgba(124, 58, 237, 0.22)",
            borderRadius: 10,
            fontSize: 11,
            color: "rgba(241, 241, 245, 0.72)",
            lineHeight: 1.7,
          }}
        >
          <div>🔒 TLS 1.3 · HSTS · Host-Only-Cookie · SameSite=Strict</div>
          <div>🔐 2-Faktor erforderlich (falls aktiviert)</div>
          <div>📋 Jeder Login-Versuch wird im Audit-Log gespeichert</div>
        </div>

        {/* Login Form — bestehende Komponente, username + 2FA + /api/mcp/auth */}
        <McpLoginForm />

        {/* Footer */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            textAlign: "center",
            fontSize: 10,
            color: "rgba(241, 241, 245, 0.42)",
            lineHeight: 1.7,
            fontWeight: 500,
          }}
        >
          Nur für Mitglieder des VibeVibo-Teams.
          <br />
          Unbefugte Zugriffsversuche werden geloggt und können geahndet werden.
          <br />
          <span style={{ opacity: 0.7 }}>VibeVibo · mcp.vibevibo.de</span>
        </div>
      </div>
    </div>
  );
}
