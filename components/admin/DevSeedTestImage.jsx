"use client";

// 🧪 Dev-Tool für Admin: Test-Bild in Moderations-Queue legen.
// Spart das Coolify-Terminal — ein Klick, Bild ist auf prod in der Queue.

import { useState } from "react";

export default function DevSeedTestImage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function seed() {
    setError("");
    setResult(null);
    setBusy(true);
    try {
      const r = await fetch("/api/adminpanel/dev/seed-test-image", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Fehler beim Insert.");
      setResult(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      marginTop: 32, padding: 18,
      background: "rgba(251, 146, 60, 0.05)",
      border: "1px dashed rgba(251, 146, 60, 0.3)",
      borderRadius: 14,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
        fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
        textTransform: "uppercase", color: "#fb923c",
      }}>
        🧪 DEV-TOOLS
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
        Test-Bild in Moderations-Queue legen
      </div>
      <div style={{ fontSize: 12, color: "rgba(241,241,245,0.55)", lineHeight: 1.5, marginBottom: 14 }}>
        Erzeugt ein Picsum-Test-Bild auf prod-DB, sichtbar im Bildertool zum
        Approve/Reject-Testen. User-ID = du selbst.
      </div>

      <button
        type="button"
        onClick={seed}
        disabled={busy}
        style={{
          padding: "10px 18px", fontSize: 13, fontWeight: 700,
          background: busy
            ? "rgba(251, 146, 60, 0.4)"
            : "linear-gradient(135deg, #fb923c, #ea580c)",
          color: "#fff", border: "none", borderRadius: 10,
          cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit",
        }}
      >
        {busy ? "⏳ Lege an…" : "🧪 Test-Bild erzeugen"}
      </button>

      {error && (
        <div style={{
          marginTop: 12, padding: "10px 12px",
          background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: 8, color: "#fca5a5", fontSize: 12,
        }}>
          ⚠ {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: 12, padding: "10px 12px",
          background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: 8, color: "#86efac", fontSize: 12, lineHeight: 1.6,
        }}>
          ✓ Queue-ID <strong>#{result.queueId}</strong> angelegt für User #{result.userId}.
          <br/>
          <a
            href="https://mcp.vibevibo.de/mcp/bilder"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#fbbf24", textDecoration: "underline" }}
          >
            → Im Bildertool öffnen
          </a>
        </div>
      )}
    </div>
  );
}
