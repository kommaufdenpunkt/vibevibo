// MCP Login — polished glassmorphism, dark, professional.
// Auth-Endpoint kommt in Ship 1.7. Bis dahin: clean UI + Form-State + Hint.

"use client";

import { useState } from "react";

export default function McpLoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/mcp/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.ok) {
        window.location.href = "/mcp";
        return;
      }

      let msg = "Anmeldung fehlgeschlagen.";
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {}
      // Endpoint noch nicht da → freundlicher Hinweis
      if (res.status === 404) {
        msg = "Auth-Endpoint noch nicht aktiv (Ship 1.7). UI ist fertig.";
      }
      setError(msg);
    } catch (err) {
      setError("Netzwerkfehler. Versuch's nochmal.");
    } finally {
      setLoading(false);
    }
  }

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
        className="mcp-glass"
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "40px 32px 32px",
        }}
      >
        {/* Logo / Wordmark */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
              boxShadow:
                "0 12px 32px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
              marginBottom: 16,
              fontSize: 30,
            }}
            aria-hidden="true"
          >
            🛡️
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              color: "#f8f8fb",
            }}
          >
            MCP
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "rgba(241, 241, 245, 0.55)",
              fontWeight: 500,
            }}
          >
            Moderator Control Panel
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="mcp-email" className="mcp-label">
              E-Mail
            </label>
            <input
              id="mcp-email"
              type="email"
              autoComplete="username"
              required
              placeholder="moderator@vibevibo.de"
              className="mcp-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="mcp-password" className="mcp-label">
              Passwort
            </label>
            <input
              id="mcp-password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="mcp-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="mcp-error" role="alert" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="mcp-btn"
            disabled={loading || !email || !password}
          >
            {loading ? "Prüfe…" : "Anmelden"}
          </button>
        </form>

        {/* Footer */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: "rgba(241, 241, 245, 0.4)",
              lineHeight: 1.6,
            }}
          >
            🔒 Nur für Mitglieder des VibeVibo-Teams.
            <br />
            Alle Zugriffe werden protokolliert.
          </p>
        </div>
      </div>

      {/* Mini-Brand am Rand */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 11,
          color: "rgba(241, 241, 245, 0.25)",
          fontWeight: 500,
          pointerEvents: "none",
        }}
      >
        VibeVibo · mcp.vibevibo.de
      </div>
    </div>
  );
}
