// Admin Login auf admin.vibevibo.de.
// Interner Pfad /adminpanel/login — extern admin.vibevibo.de/login

"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp]         = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await fetch("/api/adminpanel/auth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username, password,
          totp: needsTotp ? totp : undefined,
        }),
      });
      const d = await r.json();
      if (d.needsTotp && !d.ok) {
        setNeedsTotp(true);
        if (d.error) setError(d.error);
        return;
      }
      if (!r.ok) throw new Error(d.error || "Login fehlgeschlagen.");
      window.location.href = "/"; // → Admin-Dashboard
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "32px 20px",
      background: "radial-gradient(ellipse at top, #0a0512 0%, #010103 60%), "
        + "radial-gradient(ellipse at bottom right, rgba(239, 68, 68, 0.07), transparent 65%), "
        + "radial-gradient(ellipse at bottom left, rgba(56, 189, 248, 0.04), transparent 60%)",
    }}>
      <div style={{
        width: "100%", maxWidth: 440, padding: "28px 26px 24px",
        background: "rgba(18, 18, 30, 0.72)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: 24,
        boxShadow: "0 25px 70px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        color: "#f1f1f5",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 14px", marginBottom: 20,
          background: "linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(220, 38, 38, 0.12))",
          border: "1px solid rgba(239, 68, 68, 0.5)",
          borderRadius: 10, fontSize: 11, fontWeight: 800,
          letterSpacing: "0.06em", textTransform: "uppercase", color: "#fca5a5",
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 8 }}>🔴</span>
            Sicherheitsstufe: MAXIMAL
          </span>
          <span style={{ opacity: 0.6, letterSpacing: "0.02em", fontSize: 10 }}>ADMIN v1</span>
        </div>

        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)",
            boxShadow: "0 12px 32px rgba(220, 38, 38, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
            marginBottom: 12, fontSize: 26,
          }}>🛡️</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em", color: "#f8f8fb" }}>
            ADMIN
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(241, 241, 245, 0.55)", fontWeight: 500 }}>
            VibeVibo Administration
          </p>
        </div>

        <div style={{
          padding: "11px 13px", background: "rgba(239, 68, 68, 0.06)",
          border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 10,
          fontSize: 11, color: "rgba(241, 241, 245, 0.72)", lineHeight: 1.7,
        }}>
          <div>🔒 TLS 1.3 · HSTS · Host-Only-Cookie · SameSite=Strict</div>
          <div>🚫 VPN / Proxy / Tor BLOCKIERT (strict mode)</div>
          <div>🔐 Nur Admins+ · 2-Faktor erforderlich (falls aktiv)</div>
          <div>📋 Jeder Versuch im Audit-Log</div>
        </div>

        <form onSubmit={submit} style={{ marginTop: 22 }}>
          {error && (
            <div style={{
              marginBottom: 14, padding: "10px 12px",
              background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)",
              borderRadius: 10, color: "#fca5a5", fontSize: 13, fontWeight: 600,
            }} role="alert">⚠ {error}</div>
          )}

          {!needsTotp ? (
            <>
              <label htmlFor="admin-username" style={labelStyle}>Username</label>
              <input id="admin-username" type="text" autoCapitalize="none" autoComplete="username" required
                value={username} onChange={(e) => setUsername(e.target.value)} disabled={busy} style={inputStyle} />
              <div style={{ height: 14 }} />
              <label htmlFor="admin-password" style={labelStyle}>Passwort</label>
              <input id="admin-password" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} style={inputStyle} />
            </>
          ) : (
            <>
              <div style={{
                padding: "10px 14px", borderRadius: 10, marginBottom: 12,
                background: "rgba(239, 68, 68, 0.15)", color: "#fef2f2", fontSize: 13, fontWeight: 600,
              }}>
                🔐 2-Faktor-Code aus deiner Authenticator-App eingeben
              </div>
              <label htmlFor="admin-totp" style={labelStyle}>6-stelliger Code</label>
              <input id="admin-totp" type="text" inputMode="numeric" maxLength={6} autoFocus required
                value={totp} onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                style={{ ...inputStyle, textAlign: "center", fontSize: 22, letterSpacing: 6, fontFamily: "monospace" }} />
            </>
          )}

          <button type="submit" disabled={busy || !username || !password}
            style={{
              marginTop: 22, width: "100%", padding: 14,
              background: "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)",
              color: "#fff", border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 700, letterSpacing: "0.01em",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy || !username || !password ? 0.55 : 1,
              boxShadow: "0 8px 24px rgba(220, 38, 38, 0.35)", fontFamily: "inherit",
            }}>
            {busy ? "⏳…" : needsTotp ? "✓ Code prüfen" : "🔓 Admin-Login"}
          </button>
        </form>

        <div style={{
          marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          textAlign: "center", fontSize: 10, color: "rgba(241, 241, 245, 0.4)",
          lineHeight: 1.7, fontWeight: 500,
        }}>
          NUR FÜR ADMINS. Mod-Rollen werden hier abgelehnt.<br />
          Unbefugte Zugriffsversuche werden geloggt und können geahndet werden.<br />
          <span style={{ opacity: 0.7 }}>VibeVibo · admin.vibevibo.de</span>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "12px 14px",
  background: "rgba(255, 255, 255, 0.04)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 10, color: "#f1f1f5", fontSize: 15,
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  display: "block", marginBottom: 6, fontSize: 11, fontWeight: 700,
  color: "rgba(241, 241, 245, 0.7)", textTransform: "uppercase", letterSpacing: "0.06em",
};
