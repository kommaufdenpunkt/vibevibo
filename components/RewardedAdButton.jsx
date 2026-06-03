"use client";

// Rewarded-Video-Button: User klickt -> Server gibt Token -> Werbung laeuft
// (Provider oder Simulator) -> Mindest-Wartezeit serverseitig geprueft ->
// Vibes-Reward gut geschrieben.
//
// Anti-Cheat:
//   - Token ist server-generiert, single-use, 5 Min gueltig
//   - Wartezeit prueft SERVER (Date.now() - started_at), Client kann nicht luegen
//   - Daily-Cap + Cooldown wird serverseitig erzwungen
//   - Provider-Callback: nur signierte S2S-Requests werden anerkannt
//   - Fidolin-Watchdog rollt verdaechtige Rewards zurueck

import { useCallback, useEffect, useState } from "react";
import { useMe } from "@/lib/useMe";

export default function RewardedAdButton({ slot = "default", compact = false, label }) {
  const { me, refresh } = useMe();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle|loading|playing|completed|error
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [token, setToken] = useState("");
  const [rewardJustGot, setRewardJustGot] = useState(0);

  const load = useCallback(() => {
    fetch("/api/ads/status").then((r) => r.json()).then(setStatus).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  // Wenn User kein Consent oder NEIN gewaehlt hat -> Button nicht anzeigen
  if (!me) return null;
  if ((me.adsConsent || 0) === 0) return null;
  if (me.adsConsent === -1) return null;
  if (me.vip) return null;

  const canRequest = status?.canRequest !== false;
  const remaining = status ? Math.max(0, status.maxRewardsPerDay - status.rewardsToday) : null;

  async function start() {
    setBusy(true); setError(""); setPhase("loading");
    setShowModal(true); setProgress(0);
    try {
      const r = await fetch("/api/ads/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Konnte Werbung nicht starten");
        setPhase("error");
        setBusy(false);
        return;
      }
      setToken(data.token);
      setPhase("playing");
      // Mindest-Wartezeit aus Config (Simulator: 15s, real: 25s)
      const totalSec = data.config?.minWatchSeconds || 25;
      const startedAt = Date.now();
      const t = setInterval(() => {
        const passed = (Date.now() - startedAt) / 1000;
        const pct = Math.min(100, Math.round((passed / totalSec) * 100));
        setProgress(pct);
        if (passed >= totalSec) {
          clearInterval(t);
          finishSim(data.token, data.config);
        }
      }, 250);
    } catch (e) {
      setError(e.message || "Fehler");
      setPhase("error");
      setBusy(false);
    }
  }

  async function finishSim(tk, cfg) {
    if (!cfg?.simulator) {
      // Im Echt-Modus warten wir auf den Provider-Callback ans Backend.
      // Hier reicht "Loading-Phase voruebergehen" + Polling.
      setPhase("completed");
      setRewardJustGot(0);
      setBusy(false);
      await refresh?.();
      load();
      return;
    }
    try {
      const r = await fetch("/api/ads/simcomplete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tk }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Reward-Vergabe fehlgeschlagen");
        setPhase("error");
      } else {
        setRewardJustGot(data.rewarded || 0);
        setPhase("completed");
        await refresh?.();
        load();
      }
    } catch (e) {
      setError(e.message || "Fehler");
      setPhase("error");
    } finally { setBusy(false); }
  }

  function close() {
    setShowModal(false);
    setPhase("idle"); setProgress(0); setError(""); setToken(""); setRewardJustGot(0);
  }

  // Button — kompakt oder voll
  if (compact) {
    return (
      <>
        <button type="button" disabled={!canRequest || busy} onClick={start}
          title={canRequest ? "Werbung gucken für Vibes" : (status?.vip ? "VIP-User brauchen keine Werbung" : "Tageslimit erreicht")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: canRequest ? "linear-gradient(135deg, #f59e0b, #d97706)" : "#e5e5e7",
            color: canRequest ? "#fff" : "#9ca3af", border: "none",
            borderRadius: 999, padding: "6px 10px", fontWeight: 800, fontSize: 12,
            cursor: canRequest ? "pointer" : "not-allowed", fontFamily: "inherit",
          }}>
          📺 +{status?.rewardAmount || 15} ✨
        </button>
        {showModal && renderModal()}
      </>
    );
  }

  return (
    <>
      <div className="vv-card" style={{
        background: "linear-gradient(135deg, #fef3c7, #fde68a)",
        border: "2px dashed #f59e0b",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 36 }}>📺</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#92400e" }}>
              {label || "Gratis-Vibes: Werbung gucken"}
            </div>
            <div style={{ fontSize: 12, color: "#92400e" }}>
              {canRequest
                ? `+${status?.rewardAmount || 15} ✨ pro Video · noch ${remaining}/${status?.maxRewardsPerDay || 5} heute`
                : (status?.vip
                  ? "Du bist VIP — du brauchst das nicht 😎"
                  : "Tageslimit erreicht, komm morgen wieder")}
            </div>
          </div>
          <button type="button" disabled={!canRequest || busy} onClick={start}
            style={{
              background: canRequest ? "linear-gradient(135deg, #f59e0b, #b45309)" : "#fcd34d",
              color: canRequest ? "#fff" : "#92400e", border: "none",
              borderRadius: 10, padding: "10px 14px", fontWeight: 800, fontSize: 13,
              cursor: canRequest ? "pointer" : "not-allowed", fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}>
            {busy ? "…" : "▶ Starten"}
          </button>
        </div>
      </div>

      {showModal && renderModal()}
    </>
  );

  function renderModal() {
    return (
      <div onClick={close}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}>
        <div onClick={(e) => e.stopPropagation()}
          style={{
            background: "var(--vv-card, #fff)", color: "var(--vv-text, #1c1c1e)",
            borderRadius: 18, padding: 18, width: "100%", maxWidth: 420,
            boxShadow: "0 12px 40px rgba(0,0,0,0.4)", fontFamily: "Arial, sans-serif",
          }}>
          {phase === "loading" && <div style={{ textAlign: "center" }}>📺 Werbung wird geladen…</div>}

          {phase === "playing" && (
            <div>
              <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                📺 Werbung läuft — bitte bleib hier, sonst gibt's keinen Reward.
              </div>
              {/* Simulator-Modus: ein nostalgisch animiertes Mock-Video */}
              <div style={{
                background: "linear-gradient(135deg, #1c1c1e, #4b5563)",
                borderRadius: 12, height: 160,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 18, fontWeight: 800, marginBottom: 10,
              }}>
                <span style={{ animation: "vv-pop 1.4s ease-in-out infinite" }}>📺 Anzeige</span>
              </div>
              <div style={{
                background: "#e5e7eb", height: 10, borderRadius: 999, overflow: "hidden",
              }}>
                <div style={{
                  width: `${progress}%`, height: "100%",
                  background: "linear-gradient(90deg, #f59e0b, #ec4899)",
                  transition: "width 0.2s linear",
                }} />
              </div>
              <div style={{ fontSize: 11, textAlign: "center", marginTop: 6, color: "var(--vv-muted, #888)" }}>
                Bitte warten… ({progress}%)
              </div>
            </div>
          )}

          {phase === "completed" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48 }}>🎉</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>
                Danke! +{rewardJustGot} ✨
              </div>
              <div className="vv-muted" style={{ fontSize: 12, marginTop: 4 }}>
                Wurde deinem Konto gut geschrieben.
              </div>
              <button type="button" onClick={close}
                style={{
                  marginTop: 14, width: "100%", padding: "10px 12px",
                  background: "linear-gradient(135deg, #ec4899, #be185d)", color: "#fff",
                  border: "none", borderRadius: 10, fontWeight: 800, cursor: "pointer",
                  fontFamily: "inherit",
                }}>
                Schließen
              </button>
            </div>
          )}

          {phase === "error" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36 }}>⚠</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#b91c1c", marginTop: 4 }}>
                {error || "Etwas ist schief gelaufen."}
              </div>
              <button type="button" onClick={close}
                style={{
                  marginTop: 14, width: "100%", padding: "10px 12px",
                  background: "var(--vv-surface, #f5f5f7)", color: "var(--vv-text, #1c1c1e)",
                  border: "1px solid var(--vv-border, #ddd)", borderRadius: 10, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                Schließen
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}
