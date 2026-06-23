import { redirect } from "next/navigation";
import { getMcpUser } from "@/lib/modAuth";
import McpLoginForm from "@/components/mcp/McpLoginForm";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "MCP Login — VibeVibo Team",
  robots: { index: false, follow: false },
};

// 🚑 Self-contained Inline-Style-Version weil mcp.css wegen Sub-Layout-html/body-Bug
// nicht geladen wird. Alles als CSS-in-JS damit es OHNE externe Stylesheets schick aussieht.

export default async function McpLoginPage() {
  let me = null;
  let authError = "";
  try {
    me = await getMcpUser();
  } catch (e) {
    authError = e?.message || String(e);
  }
  if (me) redirect("/mcp");

  return (
    <div style={wrapStyle}>
      {/* dezenter pulsierender Glow-Effekt im Hintergrund */}
      <div style={glowOrb1} />
      <div style={glowOrb2} />

      <div style={cardStyle}>
        {/* Header: Brand */}
        <div style={brandRowStyle}>
          <div style={brandIconStyle}>⚡</div>
          <div>
            <div style={brandTitleStyle}>MCP</div>
            <div style={brandSubStyle}>MODERATOR CONTROL PANEL</div>
          </div>
        </div>

        {/* Greeting */}
        <div style={greetingStyle}>
          <div style={greetingPreStyle}>Anmeldung erforderlich</div>
          <h1 style={greetingHeadStyle}>
            Willkommen, <span style={greetingAccentStyle}>Team</span>.
          </h1>
        </div>

        {/* Optional auth-error indicator */}
        {authError && (
          <div style={errorBoxStyle}>
            <strong>⚠ Auth-Fehler:</strong> {authError}
          </div>
        )}

        {/* Description */}
        <p style={descStyle}>
          Nur Mitglieder des VibeVibo-Teams haben Zugriff zu diesem Bereich.
          Falls du Hilfe brauchst, melde dich bei einer <strong style={{ color: "#a5b4fc" }}>Teamleitung</strong>.
        </p>

        {/* Security note */}
        <div style={securityNoteStyle}>
          🔒 Sichere Verbindung &middot; 2FA-Pflicht aktiv &middot; Alle Aktionen werden protokolliert
        </div>

        {/* Form section — eingerahmt mit subtler Border */}
        <div style={formSectionStyle}>
          <McpLoginForm />
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          VibeVibo MCP &middot; v1.0 &middot; Mod-Tools nur für autorisierte Nutzer
        </div>
      </div>
    </div>
  );
}

// ─────────── STYLES (self-contained, keine externe CSS-Abhängigkeit) ───────────

const wrapStyle = {
  minHeight: "100vh",
  background: "radial-gradient(ellipse at top, #1a1a3e 0%, #0a0a14 50%, #060611 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 20px",
  fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
  position: "relative",
  overflow: "hidden",
};

const glowOrb1 = {
  position: "absolute",
  top: "-200px",
  left: "-100px",
  width: 400,
  height: 400,
  background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
  pointerEvents: "none",
  filter: "blur(60px)",
};

const glowOrb2 = {
  position: "absolute",
  bottom: "-200px",
  right: "-100px",
  width: 500,
  height: 500,
  background: "radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 70%)",
  pointerEvents: "none",
  filter: "blur(80px)",
};

const cardStyle = {
  position: "relative",
  zIndex: 1,
  width: "100%",
  maxWidth: 440,
  background: "rgba(15, 16, 30, 0.85)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  borderRadius: 20,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  padding: "32px 28px",
  boxShadow: "0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.12) inset",
  color: "#e6e7ee",
};

const brandRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  marginBottom: 22,
};

const brandIconStyle = {
  width: 52, height: 52, borderRadius: 14,
  background: "linear-gradient(135deg, #6366f1, #a855f7)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 26,
  boxShadow: "0 8px 24px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
};

const brandTitleStyle = {
  fontSize: 28, fontWeight: 900, letterSpacing: 1.5,
  fontFamily: '"Outfit", "Inter", sans-serif',
  background: "linear-gradient(135deg, #fff, #a5b4fc)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  lineHeight: 1,
};

const brandSubStyle = {
  fontSize: 10, fontWeight: 700, letterSpacing: 2,
  color: "rgba(165, 180, 252, 0.7)",
  marginTop: 4,
};

const greetingStyle = {
  marginBottom: 18,
  paddingBottom: 16,
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const greetingPreStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
  color: "rgba(165, 180, 252, 0.6)",
  textTransform: "uppercase",
};

const greetingHeadStyle = {
  fontSize: 22, fontWeight: 800,
  fontFamily: '"Outfit", "Inter", sans-serif',
  margin: "6px 0 0",
  color: "#fff",
};

const greetingAccentStyle = {
  background: "linear-gradient(135deg, #ec4899, #a855f7)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const errorBoxStyle = {
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.35)",
  color: "#fca5a5",
  padding: "10px 14px",
  borderRadius: 10,
  fontSize: 12,
  marginBottom: 16,
  lineHeight: 1.5,
};

const descStyle = {
  fontSize: 13,
  color: "rgba(230, 231, 238, 0.75)",
  lineHeight: 1.6,
  marginBottom: 16,
};

const securityNoteStyle = {
  fontSize: 10.5,
  color: "rgba(165, 180, 252, 0.55)",
  background: "rgba(99, 102, 241, 0.06)",
  border: "1px solid rgba(99, 102, 241, 0.15)",
  borderRadius: 8,
  padding: "8px 12px",
  marginBottom: 22,
  textAlign: "center",
  letterSpacing: 0.2,
};

const formSectionStyle = {
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: 14,
  padding: 18,
  marginBottom: 18,
};

const footerStyle = {
  fontSize: 10,
  color: "rgba(255, 255, 255, 0.3)",
  textAlign: "center",
  letterSpacing: 0.5,
  marginTop: 8,
};
