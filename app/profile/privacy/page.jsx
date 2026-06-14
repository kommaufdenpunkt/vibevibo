"use client";

// 🛡 Privatsphäre & Schutz — User stellt selbst ein, wer ihn kontaktieren darf.
// Mit "Maximaler Schutz"-Bundle als 1-Klick-Lösung (besonders für Frauen empfohlen).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";

export default function PrivacyPage() {
  const { me, loading } = useMe();
  const [privacy, setPrivacy] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (!me) return;
    fetch("/api/me/privacy", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setPrivacy(d?.privacy || null))
      .catch(() => {});
  }, [me]);

  async function update(patch) {
    setBusy(true);
    try {
      const r = await fetch("/api/me/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setPrivacy(d.privacy);
      setFlash("✓ Einstellung gespeichert");
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
    } finally {
      setBusy(false);
      setTimeout(() => setFlash(""), 3000);
    }
  }

  if (loading) return null;
  if (!me) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Link href="/login?next=/profile/privacy" className="vv-btn vv-btn-pink">Zum Login</Link>
      </div>
    );
  }
  if (!privacy) {
    return (
      <div style={{ padding: 30, textAlign: "center", color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
        ⏳ Lade Einstellungen…
      </div>
    );
  }

  return (
    <div style={{ background: "transparent", paddingBottom: 100 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "12px 12px 0" }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #1e40af 0%, #6366f1 50%, #a855f7 100%)",
          backgroundSize: "200% 200%",
          animation: "vv-shield-hero 14s ease infinite",
          color: "#fff", borderRadius: 18, padding: "18px 20px",
          marginBottom: 14, boxShadow: "0 8px 24px rgba(99,102,241,0.35)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.9, letterSpacing: 1, textTransform: "uppercase" }}>
            🛡 Schutz & Privatsphäre
          </div>
          <h1 style={{ margin: "4px 0 6px", fontSize: 24, fontWeight: 900 }}>
            Du bestimmst, wer dich kontaktieren darf
          </h1>
          <div style={{ fontSize: 13, opacity: 0.95, lineHeight: 1.4 }}>
            Wir wollen, dass du dich hier sicher fühlst. Hier stellst du ein, wer dich anschreiben,
            auf deine Pinnwand posten oder dein Profil verfolgen darf.
          </div>
        </div>
        <style>{`
          @keyframes vv-shield-hero {
            0%, 100% { background-position: 0% 50%; }
            50%      { background-position: 100% 50%; }
          }
        `}</style>

        {flash && (
          <div style={{
            background: flash.startsWith("⚠") ? "#fee2e2" : "#dcfce7",
            color: flash.startsWith("⚠") ? "#991b1b" : "#166534",
            padding: 10, borderRadius: 12, marginBottom: 10,
            fontWeight: 700, fontSize: 13, textAlign: "center",
          }}>{flash}</div>
        )}

        {/* === MAXIMALER SCHUTZ (Bundle-Toggle) === */}
        <div style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderRadius: 16, padding: 16, marginBottom: 14,
          border: privacy.shieldMode ? "3px solid #ec4899" : "1px solid rgba(0,0,0,0.08)",
          boxShadow: privacy.shieldMode ? "0 8px 24px rgba(236,72,153,0.25)" : "0 2px 8px rgba(0,0,0,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ fontSize: 36, lineHeight: 1 }}>🛡</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: "#1f2937" }}>
                Maximaler Schutz
              </div>
              <div style={{ fontSize: 13, color: "#475569", marginTop: 2, lineHeight: 1.4 }}>
                Ein Klick aktiviert alle drei strengsten Einstellungen: Nachrichten nur von Freunden,
                Pinnwand nur von Freunden, Profil-Besuche werden nicht protokolliert. Empfohlen vor allem
                für alle, die ungewollte Nachrichten vermeiden wollen.
              </div>
            </div>
          </div>
          <button type="button" disabled={busy}
            onClick={() => update({ shieldMode: !privacy.shieldMode })}
            style={{
              marginTop: 12, width: "100%",
              background: privacy.shieldMode
                ? "linear-gradient(135deg, #ec4899, #be185d)"
                : "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff", border: "none", padding: "12px 16px",
              borderRadius: 12, fontWeight: 900, fontSize: 14, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
            {privacy.shieldMode ? "🛡 Aktiv — Klick zum Deaktivieren" : "🛡 Maximalen Schutz aktivieren"}
          </button>
        </div>

        {/* === DM-Policy === */}
        <SettingBlock
          icon="✉️" title="Wer darf mir Nachrichten schreiben?"
          locked={privacy.shieldMode}
          lockedHint="(durch Maximalen Schutz auf 'Nur Freunde')">
          <RadioRow current={privacy.rawDmPolicy} disabled={busy || privacy.shieldMode}
            onChange={(v) => update({ dmPolicy: v })}
            options={[
              ["open",     "Jeder",          "Alle User können mich anschreiben (offen wie früher)"],
              ["friends",  "Nur Freunde",    "Nur Top-Friends oder bisherige Konversations-Partner"],
              ["verified", "Verifizierte",   "Nur User mit Foto + min. 7 Tage altem Account"],
              ["nobody",   "Niemand",        "Komplett geschlossen — niemand kann anschreiben"],
            ]} />
        </SettingBlock>

        {/* === Wall-Policy === */}
        <SettingBlock
          icon="📌" title="Wer darf auf meine Pinnwand schreiben?"
          locked={privacy.shieldMode}
          lockedHint="(durch Maximalen Schutz auf 'Nur Freunde')">
          <RadioRow current={privacy.rawWallPolicy} disabled={busy || privacy.shieldMode}
            onChange={(v) => update({ wallPolicy: v })}
            options={[
              ["open",    "Jeder",        "Klassisch — alle dürfen posten"],
              ["friends", "Nur Freunde",  "Nur Top-Friends oder Konversations-Partner"],
              ["nobody",  "Niemand",      "Pinnwand komplett zu (nur ich)"],
            ]} />
        </SettingBlock>

        {/* === Hide Visits === */}
        <SettingBlock
          icon="👀" title="Profil-Besuche verstecken"
          locked={privacy.shieldMode}
          lockedHint="(durch Maximalen Schutz aktiv)">
          <ToggleRow current={privacy.rawHideVisits} disabled={busy || privacy.shieldMode}
            onChange={(v) => update({ hideVisits: v })}
            label="Besuche meines Profils werden NICHT als Benachrichtigung gespeichert"
            description="Wenn aktiv, sieht niemand wer mein Profil besucht hat. Klassisches Verhalten: deaktiviert." />
        </SettingBlock>

        {/* === Block-Liste & Stummschaltungen — Verweis === */}
        <div style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          borderRadius: 14, padding: 14, marginTop: 10,
          border: "1px solid rgba(0,0,0,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 22 }}>🔇</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1f2937" }}>
                Einzelne User blockieren / stummschalten
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Im Messenger neben dem Namen → „⋮" → „Blockieren" oder „Stummschalten"
              </div>
            </div>
            <Link href="/messenger" style={{
              background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff",
              padding: "8px 14px", borderRadius: 999, fontWeight: 800, fontSize: 12,
              textDecoration: "none",
            }}>Messenger →</Link>
          </div>
        </div>

        {/* === Fidolin === */}
        <div style={{
          background: "rgba(254,243,199,0.85)",
          border: "1px solid rgba(245,158,11,0.3)",
          backdropFilter: "blur(12px)",
          borderRadius: 14, padding: 14, marginTop: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 22 }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#78350f" }}>
                Fidolin schützt dich automatisch
              </div>
              <div style={{ fontSize: 11.5, color: "#92400e", marginTop: 2, lineHeight: 1.4 }}>
                Beleidigungen, sexuelle Anspielungen, Drohungen werden von der KI sofort blockiert.
                Wiederholte Verstöße führen zu Auto-Banns (1 Tag bis 7 Tage). Du musst nichts melden.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function SettingBlock({ icon, title, locked, lockedHint, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(12px)",
      borderRadius: 16, padding: 16, marginBottom: 12,
      border: "1px solid rgba(0,0,0,0.06)",
      opacity: locked ? 0.75 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 22 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#1f2937" }}>{title}</div>
          {locked && (
            <div style={{ fontSize: 11, color: "#9d174d", fontWeight: 700 }}>
              🔒 {lockedHint}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function RadioRow({ current, options, onChange, disabled }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {options.map(([value, label, desc]) => (
        <label key={value} style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "10px 12px", borderRadius: 10,
          background: current === value ? "rgba(236,72,153,0.08)" : "rgba(248,250,252,0.7)",
          border: current === value ? "2px solid #ec4899" : "1px solid rgba(0,0,0,0.06)",
          cursor: disabled ? "not-allowed" : "pointer",
        }}>
          <input type="radio" checked={current === value} disabled={disabled}
            onChange={() => onChange(value)}
            style={{ marginTop: 3, accentColor: "#ec4899" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1f2937" }}>{label}</div>
            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 1, lineHeight: 1.4 }}>{desc}</div>
          </div>
        </label>
      ))}
    </div>
  );
}

function ToggleRow({ current, onChange, disabled, label, description }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 12px", borderRadius: 10,
      background: current ? "rgba(236,72,153,0.08)" : "rgba(248,250,252,0.7)",
      border: current ? "2px solid #ec4899" : "1px solid rgba(0,0,0,0.06)",
      cursor: disabled ? "not-allowed" : "pointer",
    }}>
      <input type="checkbox" checked={!!current} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 20, height: 20, accentColor: "#ec4899" }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1f2937" }}>{label}</div>
        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 1, lineHeight: 1.4 }}>{description}</div>
      </div>
    </label>
  );
}
