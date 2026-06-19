"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function McpLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Login fehlgeschlagen.");
      router.push("/mcp");
      router.refresh();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 28 }}>
      {error && <div className="mcp-alert">⚠ {error}</div>}
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
      <div style={{ height: 22 }} />
      <button type="submit" disabled={busy} className="mcp-btn mcp-btn-primary mcp-btn-block"
        style={{ padding: 14, fontSize: 15 }}>
        {busy ? "⏳ Anmelden…" : "🔓 Anmelden"}
      </button>
    </form>
  );
}
