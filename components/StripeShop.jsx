"use client";

// 💳 Echtgeld-Shop (Stripe)
// Drei Pakete: VIP-Monat, Vibes-Pack S, Vibes-Pack M.
// Klick öffnet Stripe Checkout in neuem Tab. Nach Bezahlung schreibt der
// Webhook die Vibes/VIP-Zeit dem Account gut.

import { useEffect, useState } from "react";
import { listStripePackages } from "@/lib/stripe-prices";

// Diese Liste wird im Build clientseitig eingebettet — keine Server-Daten noetig.
const PACKAGES = listStripePackages();

export default function StripeShop() {
  const [busy, setBusy] = useState("");
  const [flash, setFlash] = useState("");

  // Beim Mount: Wenn ?stripe=success in der URL ist, Hinweis zeigen.
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const s = p.get("stripe");
      if (s === "success") {
        setFlash("✅ Zahlung erfolgreich! Vibes/VIP werden gleich gutgeschrieben.");
        setTimeout(() => setFlash(""), 8000);
      } else if (s === "cancel") {
        setFlash("ⓘ Zahlung abgebrochen — kein Geld abgebucht.");
        setTimeout(() => setFlash(""), 5000);
      }
    } catch { /* ignore */ }
  }, []);

  async function checkout(priceId) {
    setBusy(priceId); setFlash("");
    try {
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) {
        throw new Error(d.error || d.detail || "Checkout-Fehler");
      }
      // In neuem Tab oeffnen — auf Mobile faellt das idR auf gleicher Tab zurueck.
      window.location.href = d.url;
    } catch (e) {
      setFlash(`⚠ ${e.message || String(e)}`);
      setTimeout(() => setFlash(""), 5000);
    } finally { setBusy(""); }
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #fef3c7, #fce7f3)",
      border: "2px solid #f59e0b",
      borderRadius: 14, padding: 14, marginBottom: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>💳</span>
        <h3 style={{ margin: 0, color: "#7c2d12", fontSize: 16 }}>Echtgeld-Pakete</h3>
        <span style={{
          fontSize: 10, fontWeight: 800, background: "#fff", color: "#7c2d12",
          padding: "2px 8px", borderRadius: 999, marginLeft: "auto",
        }}>Stripe</span>
      </div>
      <div style={{ fontSize: 12, color: "#7c2d12", opacity: 0.85, marginBottom: 12 }}>
        Vibes oder VIP-Zeit mit echtem Geld kaufen — wenn dir das Spielen zu langsam geht.
        Sichere Bezahlung über Stripe. Kein Abo, keine versteckten Kosten.
      </div>

      {flash && (
        <div style={{
          padding: 8, marginBottom: 10, borderRadius: 8,
          background: flash.startsWith("⚠") ? "#fee2e2" : (flash.startsWith("ⓘ") ? "#dbeafe" : "#dcfce7"),
          color: flash.startsWith("⚠") ? "#991b1b" : (flash.startsWith("ⓘ") ? "#1e40af" : "#166534"),
          fontWeight: 700, fontSize: 13,
        }}>{flash}</div>
      )}

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10,
      }}>
        {PACKAGES.map((p) => (
          <div key={p.priceId} style={{
            background: "#fff",
            border: "1.5px solid #fcd34d",
            borderRadius: 12, padding: 12,
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 22 }}>{p.emoji}</span>
              <strong style={{ color: "#7c2d12", fontSize: 14 }}>{p.label}</strong>
            </div>
            <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.35 }}>{p.description}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{
                fontWeight: 900, fontSize: 17, color: "#7c2d12",
              }}>{p.priceLabel}</span>
              <button
                type="button"
                disabled={busy === p.priceId}
                onClick={() => checkout(p.priceId)}
                style={{
                  marginLeft: "auto",
                  background: busy === p.priceId ? "#fbbf24" : "linear-gradient(135deg, #f59e0b, #ea580c)",
                  color: "#fff", border: "none", padding: "6px 12px",
                  borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer",
                }}
              >
                {busy === p.priceId ? "Öffne…" : "Kaufen →"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 10.5, color: "#7c2d12", opacity: 0.75, lineHeight: 1.5 }}>
        🔒 Zahlung läuft über Stripe. VibeVibo speichert keine Kreditkarten-Daten.
        Mehrwertsteuer wird automatisch berechnet. Widerruf entfällt, da digitale Inhalte
        sofort bereitgestellt werden (§ 356 Abs. 5 BGB).
      </div>
    </div>
  );
}
