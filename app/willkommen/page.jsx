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
        <p style={{ color: "#5c2e27" }}>Bitte einloggen.</p>
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
            marginTop: 14, padding: 10, borderRadius: 8,
            background: "#f4ead5", border: "2px solid #8b6f47",
            fontSize: 11.5, color: "#5c2e27", lineHeight: 1.5,
          }}>
            ℹ <b>Regeln:</b> 3–30 Zeichen · nur a-z, A-Z, 0-9, <code>_</code> und <code>-</code> ·
            <b> keine Leerzeichen</b> · keine Umlaute (ä → ae)
          </div>

          {err && (
            <div style={{
              marginTop: 12, padding: 10, borderRadius: 8,
              background: "#fbe5e0", color: "#7a2e26",
              border: "2px solid #a3473d", fontSize: 13, fontWeight: 700, textAlign: "center",
            }}>⚠ {err}</div>
          )}

          <button onClick={submit} disabled={!canSubmit} style={{
            marginTop: 16, width: "100%", padding: 14, borderRadius: 10,
            background: canSubmit
              ? "linear-gradient(135deg, #a3473d, #7a2e26)"
              : "#d4c89a",
            color: "#fff", border: "3px ridge #fff",
            cursor: canSubmit ? "pointer" : "not-allowed",
            fontFamily: "inherit", fontWeight: 900, fontSize: 15, letterSpacing: 0.8,
            textShadow: canSubmit ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
          }}>
            {busy ? "⏳ Speichern…" : "★ LOSLEGEN ★"}
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
    : !validFormat ? { color: "#a3473d", text: "⚠ Nur a-z, A-Z, 0-9, _ und - (3–30 Zeichen)" }
    : status.checking ? { color: "#8b6f47", text: "⏳ Prüfe…" }
    : status.available === true ? { color: "#5c4830", text: "✓ Frei!" }
    : status.available === false ? { color: "#a3473d", text: status.reason === "taken" ? "⚠ Schon vergeben" : "⚠ Ungültig" }
    : null;

  return (
    <>
      <input
        value={v}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={30}
        style={{
          width: "100%", padding: 12,
          background: "#fff", color: "#2c241a",
          border: `2px ridge ${
            !v ? "#8b6f47"
              : !validFormat ? "#a3473d"
              : status.available === true ? "#5c4830"
              : status.available === false ? "#a3473d"
              : "#8b6f47"
          }`,
          borderRadius: 10, fontFamily: "inherit", fontSize: 15, fontWeight: 700,
          outline: "none", boxSizing: "border-box",
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
      fontSize: 10.5, fontWeight: 900, color: "#5c4830",
      letterSpacing: 0.5, marginBottom: 5, textTransform: "uppercase",
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
    background: "linear-gradient(135deg, #f4ead5, #e8d8b8)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20,
  };
}
function cardWrap() {
  return {
    background: "#fff8e7", borderRadius: 16, maxWidth: 520, width: "100%",
    border: "4px ridge #8b6f47",
    boxShadow: "0 12px 40px rgba(92, 72, 48, 0.35)",
    overflow: "hidden",
  };
}
function heroWrap() {
  return {
    background: "linear-gradient(135deg, #a3473d, #8b6f47, #c8a25c)",
    backgroundSize: "200% 100%",
    animation: "vv-wk-wave 8s ease-in-out infinite",
    padding: "22px 20px", textAlign: "center",
    borderBottom: "3px ridge #fff",
  };
}
