"use client";

// 🔐 Admin-Login-Form — POSTet das Passwort an /api/admin/login (nicht in URL!).
// Wird in /admin/performance + analogen Pages eingebaut, ersetzt die alte
// ?pw=...-GET-Form.

import { useState } from "react";

export default function AdminLoginForm({ next = "/admin" }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pw, next }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Login fehlgeschlagen.");
      // Wechsel zur Ziel-URL (Cookie ist gesetzt → Server-Render greift)
      window.location.href = d.next || next;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 8 }}>
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="Admin-Passwort"
        autoFocus
        autoComplete="current-password"
        required
        disabled={busy}
        style={{
          width: "100%", padding: "12px 14px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 10,
          color: "#fff", fontSize: 15,
          fontFamily: "inherit", outline: "none",
          boxSizing: "border-box",
        }}
      />
      <button
        type="submit"
        disabled={busy || !pw}
        style={{
          width: "100%", marginTop: 12, padding: "12px 16px",
          background: busy ? "rgba(168,85,247,0.5)"
            : "linear-gradient(135deg, #ec4899, #a855f7)",
          color: "#fff", border: "none", borderRadius: 10,
          fontWeight: 800, fontSize: 14,
          cursor: busy ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          boxShadow: "0 4px 16px rgba(168,85,247,0.3)",
        }}
      >
        {busy ? "⏳ Login …" : "🔓 Anmelden"}
      </button>
      {error && (
        <div role="alert" style={{
          marginTop: 12, padding: "10px 12px",
          background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.35)",
          borderRadius: 8, color: "#fca5a5",
          fontSize: 12.5, fontWeight: 600,
        }}>⚠ {error}</div>
      )}
      <div style={{
        marginTop: 14, fontSize: 11,
        color: "rgba(255,255,255,0.45)",
        textAlign: "center", lineHeight: 1.5,
      }}>
        Passwort wird per HTTPS gesendet, im HttpOnly-Cookie gespeichert (8h).
        <br/>Niemals in URL oder Browser-Historie.
      </div>
    </form>
  );
}
