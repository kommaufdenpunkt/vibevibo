"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Mcp2faSetup({ alreadyEnabled = false }) {
  const [step, setStep] = useState(alreadyEnabled ? "enabled" : "intro");
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();

  async function start() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/mcp/2fa/setup", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSecret(d.secret);
      setOtpauthUrl(d.otpauthUrl);
      setStep("scan");
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function verify() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/mcp/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setStep("done");
      setTimeout(() => router.refresh(), 1000);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function disable() {
    if (!confirm("2FA wirklich deaktivieren? Du musst es danach neu einrichten.")) return;
    setBusy(true);
    try {
      await fetch("/api/mcp/2fa/disable", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      router.refresh();
    } finally { setBusy(false); }
  }

  if (step === "enabled") {
    return (
      <div className="mcp-report-item" style={{ background: "rgba(16,185,129,0.1)" }}>
        <div className="mcp-report-row-1">
          <div className="mcp-report-avatar" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>✓</div>
          <div className="mcp-report-info">
            <div className="mcp-report-cat" style={{ color: "var(--mcp-green)" }}>2FA AKTIV</div>
            <div className="mcp-report-title">Dein Account ist mit 2FA geschützt</div>
          </div>
        </div>
        <button onClick={disable} disabled={busy}
          className="mcp-btn mcp-btn-secondary mcp-btn-block" style={{ marginTop: 12 }}>
          🔓 2FA deaktivieren
        </button>
      </div>
    );
  }

  if (step === "scan") {
    // Google Charts QR-API für Display (öffentliche QR-Generation, kein Tracking)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(otpauthUrl)}`;
    return (
      <div className="mcp-report-item">
        <div style={{ textAlign: "center" }}>
          <div className="mcp-section-label" style={{ justifyContent: "center" }}>📲 Schritt 1: QR scannen</div>
          <img src={qrUrl} alt="QR" style={{ width: 200, height: 200, background: "#fff", borderRadius: 12, padding: 8 }} />
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--mcp-text-soft)", lineHeight: 1.5 }}>
            Öffne Google Authenticator (oder Authy/1Password) → ＋ → Code scannen.<br/>
            Oder manuell den Schlüssel eingeben:
          </div>
          <div style={{
            marginTop: 8, padding: "10px 14px", background: "rgba(255,255,255,0.05)",
            borderRadius: 10, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all",
            color: "var(--mcp-text-mid)",
          }}>{secret}</div>
        </div>

        <div className="mcp-section-label" style={{ marginTop: 18 }}>🔢 Schritt 2: Code eingeben</div>
        {err && <div className="mcp-alert">⚠ {err}</div>}
        <input
          className="mcp-input"
          type="text" inputMode="numeric" maxLength={6}
          placeholder="123456"
          value={code} onChange={(e) => setCode(e.target.value)}
          style={{ textAlign: "center", fontSize: 22, letterSpacing: 6, fontFamily: "monospace" }}
        />
        <button onClick={verify} disabled={busy || code.length !== 6}
          className="mcp-btn mcp-btn-primary mcp-btn-block" style={{ marginTop: 12 }}>
          {busy ? "⏳…" : "✓ Aktivieren"}
        </button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="mcp-report-item" style={{ background: "rgba(16,185,129,0.15)", textAlign: "center" }}>
        <div style={{ fontSize: 38 }}>✅</div>
        <b style={{ color: "var(--mcp-text-strong)", fontSize: 16 }}>2FA aktiviert!</b><br/>
        <div style={{ marginTop: 6, fontSize: 13, color: "var(--mcp-text-mid)" }}>
          Bei jedem Login wirst du ab jetzt nach dem 6-stelligen Code gefragt.
        </div>
      </div>
    );
  }

  // intro
  return (
    <div className="mcp-report-item">
      <div className="mcp-section-label">🔐 2-Faktor-Authentifizierung</div>
      <div style={{ fontSize: 13, color: "var(--mcp-text-mid)", lineHeight: 1.6, marginBottom: 14 }}>
        Schütze deinen Mod-Account mit einer zweiten Sicherheitsebene. Nach Aktivierung wirst du bei jedem Login zusätzlich nach einem 6-stelligen Code aus deiner Authenticator-App gefragt.<br/><br/>
        <b>Was du brauchst:</b><br/>
        📲 Google Authenticator / Authy / 1Password / Aegis (gratis)
      </div>
      {err && <div className="mcp-alert">⚠ {err}</div>}
      <button onClick={start} disabled={busy}
        className="mcp-btn mcp-btn-primary mcp-btn-block">
        {busy ? "⏳…" : "🚀 2FA jetzt einrichten"}
      </button>
    </div>
  );
}
