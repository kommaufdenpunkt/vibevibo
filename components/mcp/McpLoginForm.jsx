"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function McpLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const r = await fetch("/api/mcp/auth", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, totp: needsTotp ? totp : undefined }),
      });
      const d = await r.json();
      if (d.needsTotp && !d.ok) {
        setNeedsTotp(true);
        if (d.error) setError(d.error);
        return;
      }
      if (!r.ok) throw new Error(d.error || "Login fehlgeschlagen.");
      router.push("/mcp");
      router.refresh();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 28 }}>
      {error && <div className="mcp-alert">⚠ {error}</div>}

      {!needsTotp ? (
        <>
          <label className="mcp-label">Username</label>
          <input className="mcp-input" type="text" value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none" autoComplete="username" required
            placeholder="eyfahrlehrer" />
          <div style={{ height: 14 }} />
          <label className="mcp-label">Passwort</label>
          <input className="mcp-input" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" required />
        </>
      ) : (
        <>
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 12,
            background: "rgba(168,85,247,0.15)", color: "var(--mcp-text-strong)",
            fontSize: 13, fontWeight: 600,
          }}>
            🔐 2-Faktor-Code aus deiner Authenticator-App eingeben
          </div>
          <label className="mcp-label">6-stelliger Code</label>
          <input
            className="mcp-input"
            type="text" inputMode="numeric" maxLength={6} autoFocus required
            value={totp} onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            style={{ textAlign: "center", fontSize: 22, letterSpacing: 6, fontFamily: "monospace" }}
          />
        </>
      )}

      <div style={{ height: 22 }} />
      <button type="submit" disabled={busy} className="mcp-btn mcp-btn-primary mcp-btn-block"
        style={{ padding: 14, fontSize: 15 }}>
        {busy ? "⏳…" : needsTotp ? "✓ Code prüfen" : "🔓 Anmelden"}
      </button>
    </form>
  );
}
