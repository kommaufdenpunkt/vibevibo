"use client";

// 🎀 Onboarding-Seite — wird nach Warteliste-Freigabe für OAuth-User angezeigt.
//
// Live-Check: Tippen → 300ms Debounce → API-Verfügbarkeit.
// Beide Namen müssen frei sein UND Format passen, sonst Submit deaktiviert.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";

const NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export default function WillkommenPage() {
  const router = useRouter();
  const { me, refresh } = useMe();
  const [loaded, setLoaded] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, reason: null });
  const [displayNameStatus, setDisplayNameStatus] = useState({ checking: false, available: null, reason: null });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Initial laden
  useEffect(() => {
    fetch("/api/me/onboarding")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        // Wenn schon onboardet → direkt zur Startseite
        if (!d.needsOnboarding) {
          router.push("/");
          return;
        }
        // Defaults aus Account übernehmen (User kann ändern)
        setUsername(d.username || "");
        setDisplayName(d.displayName || "");
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [router]);

  // Live-Check für Username
  const usernameCheck = useDebouncedCheck(username, "username", setUsernameStatus);
  void usernameCheck;
  const displayNameCheck = useDebouncedCheck(displayName, "displayName", setDisplayNameStatus);
  void displayNameCheck;

  const usernameValid = NAME_REGEX.test(username) && username.length >= 3 && username.length <= 30;
  const displayNameValid = NAME_REGEX.test(displayName) && displayName.length >= 3 && displayName.length <= 30;
  const canSubmit = usernameValid && displayNameValid
    && usernameStatus.available === true && displayNameStatus.available === true
    && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/me/onboarding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, displayName }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      await refresh?.();
      router.push("/");
    } catch (e) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  if (!me) {
    return (
      <div style={pageWrap()}>
        <p style={{ color: "#1e293b" }}>Bitte einloggen.</p>
      </div>
    );
  }

  if (!loaded) {
    return <div style={pageWrap()}>Lädt…</div>;
  }

  return (
    <div style={pageWrap()}>
      <div style={cardWrap()}>
        <div style={heroWrap()}>
          <div style={{ fontSize: 44, marginBottom: 6 }}>🎀</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
            Willkommen bei VibeVibo!
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#fff", opacity: 0.95, lineHeight: 1.5 }}>
            Such dir deinen Username und deinen Anzeigenamen aus. Beide bekommt niemand sonst.
          </p>
        </div>

        <div style={{ padding: 20 }}>
          <Label>Username (öffentlich, kommt in der URL: vibevibo.de/u/...)</Label>
          <NameField value={username} onChange={setUsername} status={usernameStatus}
            placeholder="z.B. gino_82" />

          <div style={{ height: 14 }} />

          <Label>Anzeigename (so siehst du andere im Feed)</Label>
          <NameField value={displayName} onChange={setDisplayName} status={displayNameStatus}
            placeholder="z.B. Gino-92" />

          <div style={{
            marginTop: 14, padding: 10, borderRadius: 4,
            background: "#f0f4fa", border: "1px solid #c5d2e8",
            borderLeft: "3px solid #3b82f6",
            fontSize: 11.5, color: "#1e3a8a", lineHeight: 1.5,
          }}>
            ℹ <b>Regeln:</b> 3–30 Zeichen · nur a-z, A-Z, 0-9, <code>_</code> und <code>-</code> ·
            <b> keine Leerzeichen</b> · keine Umlaute (ä → ae)
          </div>

          {err && (
            <div style={{
              marginTop: 12, padding: 10, borderRadius: 4,
              background: "#fef2f2", color: "#991b1b",
              border: "1px solid #dc2626", fontSize: 13, fontWeight: 700, textAlign: "center",
            }}>⚠ {err}</div>
          )}

          <button onClick={submit} disabled={!canSubmit} style={{
            marginTop: 16, width: "100%", padding: 13, borderRadius: 4,
            background: canSubmit
              ? "linear-gradient(180deg, #f97316, #ea580c)"
              : "#cbd5e1",
            color: "#fff", border: canSubmit ? "1px solid #c2410c" : "1px solid #94a3b8",
            cursor: canSubmit ? "pointer" : "not-allowed",
            fontFamily: "Tahoma, Verdana, sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: 0.5,
            textShadow: canSubmit ? "0 1px 1px rgba(0,0,0,0.25)" : "none",
            boxShadow: canSubmit ? "inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 0 #9a3412" : "none",
          }}>
            {busy ? "⏳ Speichern…" : "★ Loslegen"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NameField({ value, onChange, status, placeholder }) {
  const v = value || "";
  const validFormat = v.length === 0 || (NAME_REGEX.test(v) && v.length >= 3 && v.length <= 30);
  const hint = !v ? null
    : !validFormat ? { color: "#dc2626", text: "⚠ Nur a-z, A-Z, 0-9, _ und - (3–30 Zeichen)" }
    : status.checking ? { color: "#64748b", text: "⏳ Prüfe…" }
    : status.available === true ? { color: "#16a34a", text: "✓ Frei!" }
    : status.available === false ? { color: "#dc2626", text: status.reason === "taken" ? "⚠ Schon vergeben" : "⚠ Ungültig" }
    : null;

  return (
    <>
      <input
        value={v}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={30}
        style={{
          width: "100%", padding: "10px 12px",
          background: "#fff", color: "#0f172a",
          border: `1px solid ${
            !v ? "#94a3b8"
              : !validFormat ? "#dc2626"
              : status.available === true ? "#16a34a"
              : status.available === false ? "#dc2626"
              : "#94a3b8"
          }`,
          borderRadius: 4, fontFamily: "Verdana, Tahoma, sans-serif", fontSize: 14, fontWeight: 600,
          outline: "none", boxSizing: "border-box",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.08)",
        }}
      />
      {hint && (
        <div style={{ fontSize: 11.5, color: hint.color, marginTop: 4, fontWeight: 700 }}>
          {hint.text}
        </div>
      )}
    </>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: "#1e3a8a",
      letterSpacing: 0.4, marginBottom: 5,
    }}>{children}</div>
  );
}

// Hook: 300ms debounced Check
function useDebouncedCheck(value, paramName, setStatus) {
  const timerRef = useRef(null);
  useEffect(() => {
    if (!value) {
      setStatus({ checking: false, available: null, reason: null });
      return;
    }
    if (!NAME_REGEX.test(value) || value.length < 3 || value.length > 30) {
      setStatus({ checking: false, available: false, reason: "invalid" });
      return;
    }
    setStatus({ checking: true, available: null, reason: null });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/me/check-name?${paramName}=${encodeURIComponent(value)}`);
        const d = await r.json();
        setStatus({ checking: false, available: d.available, reason: d.reason });
      } catch {
        setStatus({ checking: false, available: null, reason: null });
      }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value, paramName, setStatus]);
}

// Layout helpers
function pageWrap() {
  return {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #e8edf5, #d6dfee)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20,
  };
}
function cardWrap() {
  return {
    background: "#ffffff", borderRadius: 6, maxWidth: 520, width: "100%",
    border: "1px solid #c5d2e8",
    boxShadow: "0 12px 40px rgba(30,58,138,0.25)",
    overflow: "hidden",
  };
}
function heroWrap() {
  return {
    background: "linear-gradient(180deg, #1e40af 0%, #1e3a8a 100%)",
    padding: "22px 20px", textAlign: "center",
    borderBottom: "2px solid #f97316",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
  };
}
