// 🔐 Akte-Access-Gate
// Wrappt Userakte-Inhalt mit einem Reason-Modal. Akte wird NUR sichtbar
// nachdem der Mod eine Begründung eingegeben hat (min 10 Zeichen).
// Begründung wird in akte_access_log gespeichert → Owner kann sehen wer
// warum welche Akte angeschaut hat.
//
// Verwendung:
//   <AkteAccessGate userId={42} username="max.mustermann">
//     <ActualAkteContent />
//   </AkteAccessGate>

"use client";

import { useEffect, useState } from "react";

export default function AkteAccessGate({ userId, username = "", children }) {
  const [status, setStatus] = useState("checking"); // checking | gate | unlocked | error
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await fetch(`/api/mcp/akte/check-access?targetUserId=${userId}`, {
          credentials: "include",
        });
        const d = await r.json();
        if (cancel) return;
        if (d?.hasAccess) {
          setStatus("unlocked");
        } else {
          setStatus("gate");
        }
      } catch (e) {
        if (!cancel) {
          setError(e.message);
          setStatus("error");
        }
      }
    })();
    return () => { cancel = true; };
  }, [userId]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (reason.trim().length < 10) {
      setError("Begründung muss mindestens 10 Zeichen lang sein.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/mcp/akte/log-access", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId, reason: reason.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Fehler beim Speichern.");
      setStatus("unlocked");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--mcp-text-mid, #888)" }}>
        🔐 Zugriff wird geprüft …
      </div>
    );
  }

  if (status === "unlocked") {
    return <>{children}</>;
  }

  // Gate-Modal
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          padding: "28px 26px",
          background: "rgba(18, 18, 30, 0.85)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: 20,
          color: "#f1f1f5",
        }}
      >
        {/* Banner */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: 10,
            marginBottom: 18,
            fontSize: 12,
            fontWeight: 700,
            color: "#fca5a5",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>🔒</span>
          <span>Userakte — Zugriff protokollpflichtig</span>
        </div>

        {/* Title */}
        <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800 }}>
          Warum möchtest du diese Akte einsehen?
        </h2>
        <p
          style={{
            margin: "0 0 18px",
            fontSize: 13,
            color: "rgba(241, 241, 245, 0.62)",
            lineHeight: 1.6,
          }}
        >
          Wie bei einer polizeilichen Akte: jeder Zugriff wird geloggt
          {username && (
            <>
              {" "}— <strong style={{ color: "#fca5a5" }}>@{username}</strong>
            </>
          )}
          . Die Owner-Übersicht zeigt: <em>wer</em> wann welche Akte mit{" "}
          <em>welcher Begründung</em> geöffnet hat.
        </p>

        <form onSubmit={submit}>
          <label
            htmlFor="akte-reason"
            style={{
              display: "block",
              marginBottom: 6,
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(241, 241, 245, 0.7)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Begründung (min. 10 Zeichen)
          </label>
          <textarea
            id="akte-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={busy}
            rows={3}
            placeholder="z.B. Verdacht auf Fake-Profil – Meldung von User #1234 zu Bild-Authentizität"
            maxLength={500}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 10,
              color: "#f1f1f5",
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              lineHeight: 1.5,
            }}
          />
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: reason.length >= 10 ? "#86efac" : "rgba(241, 241, 245, 0.4)",
              textAlign: "right",
            }}
          >
            {reason.length} / 500
          </div>

          {error && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: 10,
                color: "#fca5a5",
                fontSize: 13,
                fontWeight: 600,
              }}
              role="alert"
            >
              ⚠ {error}
            </div>
          )}

          <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => window.history.back()}
              disabled={busy}
              style={{
                padding: "10px 18px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 10,
                color: "rgba(241, 241, 245, 0.7)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={busy || reason.trim().length < 10}
              style={{
                padding: "10px 22px",
                background:
                  reason.trim().length >= 10
                    ? "linear-gradient(135deg, #dc2626, #7f1d1d)"
                    : "rgba(255, 255, 255, 0.04)",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.6 : 1,
                fontFamily: "inherit",
                boxShadow:
                  reason.trim().length >= 10
                    ? "0 6px 18px rgba(220, 38, 38, 0.3)"
                    : "none",
              }}
            >
              {busy ? "⏳…" : "🔓 Akte einsehen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
