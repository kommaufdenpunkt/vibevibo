"use client";

// Credits-Panel: Saldo, Rang, Streak, Daily-Bonus-Sammeln, Verlauf.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import HelpCard from "./HelpCard";

const RANK_EMOJI = { newbie: "🌱", regular: "✨", star: "⭐", legend: "👑" };

export default function CreditsPanel() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  const load = useCallback(async () => {
    try { setData(await api.credits()); }
    catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function claim() {
    setError(""); setBusy(true);
    try {
      const r = await api.claimDaily();
      setFlash(`+${r.amount} Credits! Streak: ${r.streak} Tage 🔥`);
      setTimeout(() => setFlash(""), 4000);
      await load();
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  if (!data) return <div className="vv-msgapp-empty">Lade Vibes…</div>;
  const { balance, totalEarned, streak, rank, seasonMultiplier, canClaimDaily, nextDailyPreview, seasonEvents, history } = data;

  return (
    <div style={{ padding: 14 }}>
      <HelpCard id="credits-intro" title="Was sind Vibes?" emoji="✨" color="#ec4899">
        <b>Vibes ✨ sind die Währung von VibeVibo.</b> Du verdienst sie
        durch Aktivität auf der Plattform und gibst sie im Shop aus —
        für VIBO-Futter, Möbel, Sammelkarten, Outfits.
        <br/><br/>
        <b>Wie verdienen?</b> Tägliches Login, Quests, Pinnwand-Posts,
        Gruscheln, Geschenke, Fotos, Mini-Game, Realitätskarte
        (Items in der Stadt einsammeln).
        <br/><br/>
        <b>Wofür ausgeben?</b> Shop (Futter/Möbel/Karten), Spenden an
        Freunde, später Outfits + Premium-Funktionen.
        <br/><br/>
        <b>Anti-Inflation:</b> Max 60 Vibes/Tag aus Aktivität. So bleibt
        die Währung wertvoll und niemand kann farmen.
      </HelpCard>
      {/* Saldo-Karte */}
      <div style={{
        background: "linear-gradient(135deg, #ff3e9d 0%, #b91e7c 100%)",
        color: "#fff", borderRadius: 14, padding: 18, textAlign: "center",
        boxShadow: "0 8px 22px rgba(255,62,157,0.30)",
      }}>
        <div style={{ fontSize: 12, opacity: 0.9, letterSpacing: 1 }}>DEINE VIBES</div>
        <div style={{ fontSize: 42, fontWeight: 800, marginTop: 4 }}>✨ {balance}</div>
        <div style={{ fontSize: 12, opacity: 0.95, marginTop: 4 }}>
          insg. {totalEarned} gesammelt · {RANK_EMOJI[rank.id]} {rank.label} · 🔥 {streak} Tage Streak
        </div>
        {seasonMultiplier > 1 && (
          <div style={{ marginTop: 8, background: "rgba(255,255,255,0.18)", padding: "4px 10px", borderRadius: 999, display: "inline-block", fontSize: 12, fontWeight: 600 }}>
            🎉 Saison-Bonus aktiv: ×{seasonMultiplier.toFixed(2)}
          </div>
        )}
      </div>

      {/* Aktive Saison-Events */}
      {seasonEvents.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {seasonEvents.map((e) => (
            <div key={e.id} style={{
              background: "var(--vv-card,#fff)", border: "1px solid var(--vv-border,#eee)",
              borderRadius: 10, padding: 10, display: "flex", alignItems: "center", gap: 10, marginBottom: 6,
            }}>
              <span style={{ fontSize: 24 }}>{e.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{e.name}</div>
                <div style={{ fontSize: 11, color: "var(--vv-muted,#666)" }}>{e.description || `×${(e.multiplier / 100).toFixed(2)} Credits`}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Daily Bonus */}
      <div style={{ marginTop: 14 }}>
        <button type="button" onClick={claim} disabled={busy || !canClaimDaily}
          style={{
            width: "100%", padding: 14, border: "none", borderRadius: 12, cursor: canClaimDaily ? "pointer" : "default",
            background: canClaimDaily ? "linear-gradient(135deg, #fbbf24, #f97316)" : "rgba(120,120,128,0.15)",
            color: canClaimDaily ? "#1c1c1e" : "var(--vv-muted,#888)",
            fontSize: 16, fontWeight: 700,
            opacity: busy ? 0.5 : 1,
          }}>
          {canClaimDaily
            ? `🎁 Tages-Bonus abholen (+${nextDailyPreview} Vibes)`
            : "✅ Heute schon abgeholt — komm morgen wieder"}
        </button>
        {flash && <div style={{ marginTop: 8, color: "#0d8a3f", fontWeight: 600, textAlign: "center" }}>{flash}</div>}
        {error && <div style={{ marginTop: 8, color: "#c2185b", fontWeight: 600, textAlign: "center" }}>{error}</div>}
      </div>

      {/* Earn-Übersicht */}
      <div style={{ marginTop: 18 }}>
        <div className="vv-msgapp-section" style={{ padding: "0 0 6px" }}>So sammelst du Vibes</div>
        <div style={{ fontSize: 13, color: "var(--vv-muted,#666)", lineHeight: 1.6 }}>
          🎁 Tages-Bonus täglich · 🔥 Streak bis +25%<br />
          📌 Pinnwand-Beitrag schreiben · 🫶 Gruscheln (geben &amp; bekommen)<br />
          🎀 Geschenk verschicken / empfangen · 📷 Foto hochladen
        </div>
        <div style={{ fontSize: 11, color: "var(--vv-muted,#888)", marginTop: 6, fontStyle: "italic" }}>
          Anti-Inflation: max 60 Vibes/Tag aus Aktivität · max 1× pro Person/Tag · Spam zählt nicht doppelt.
        </div>
      </div>

      {/* Link zu vollständigem Transaktions-Verlauf */}
      <div style={{ marginTop: 14 }}>
        <Link href="/profile/transactions" style={{
          display: "block", textAlign: "center", padding: 12,
          borderRadius: 10, border: "1px solid var(--vv-border,#eee)",
          background: "var(--vv-card,#fff)",
          color: "var(--vv-text,#1c1c1e)", textDecoration: "none",
          fontSize: 13, fontWeight: 600,
        }}>
          💰 Alle Transaktionen ansehen →
        </Link>
      </div>
    </div>
  );
}
