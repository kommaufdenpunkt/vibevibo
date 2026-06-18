"use client";

// 🛡 Privatsphäre & Schutz — User stellt selbst ein, wer ihn kontaktieren darf.
// Mit "Maximaler Schutz"-Bundle als 1-Klick-Lösung (besonders für Frauen empfohlen).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import PremiumHero from "@/components/PremiumHero";

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

        <PremiumHero
          eyebrow="🛡 Schutz & Privatsphäre"
          title="Du bestimmst, wer dich kontaktieren darf"
          subtitle="Wir wollen, dass du dich hier sicher fühlst. Hier stellst du ein, wer dich anschreiben, auf deine Pinnwand posten oder dein Profil verfolgen darf."
          gradient="cool"
          sparkles={["🛡", "✨", "★"]}
        />

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

        {/* === RUHEZEIT === */}
        <SettingBlock
          icon="🌙" title="Ruhezeit für Nachrichten"
          locked={false}>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 10, lineHeight: 1.4 }}>
            In dieser Zeit empfängst du <b>keine Nachrichten von Fremden</b> — nur Freunde dürfen
            durch. Perfekt für nachts oder Arbeitszeit.
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>von Uhr</span>
              <select disabled={busy} value={privacy.quietFromHour ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  update({ quietFromHour: v === "" ? null : Number(v) });
                }}
                style={{
                  padding: "8px 10px", borderRadius: 8, fontSize: 14,
                  border: "1px solid rgba(0,0,0,0.12)", background: "#fff",
                }}>
                <option value="">— aus —</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2,"0")}:00</option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>bis Uhr</span>
              <select disabled={busy} value={privacy.quietToHour ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  update({ quietToHour: v === "" ? null : Number(v) });
                }}
                style={{
                  padding: "8px 10px", borderRadius: 8, fontSize: 14,
                  border: "1px solid rgba(0,0,0,0.12)", background: "#fff",
                }}>
                <option value="">— aus —</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2,"0")}:00</option>
                ))}
              </select>
            </label>
            {privacy.quietActive && (
              <div style={{
                background: "linear-gradient(135deg, #6366f1, #4338ca)",
                color: "#fff", padding: "6px 12px", borderRadius: 999,
                fontSize: 12, fontWeight: 800,
                boxShadow: "0 2px 8px rgba(67,56,202,0.35)",
              }}>
                🌙 {String(privacy.quietFromHour).padStart(2,"0")}-{String(privacy.quietToHour).padStart(2,"0")} Uhr aktiv
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
            Tipp: über Mitternacht möglich — z.B. 22 bis 8 = nachts gesperrt
          </div>
        </SettingBlock>

        {/* === FIDOLIN STRICT FIRST MESSAGE === */}
        <SettingBlock
          icon="🤖" title="Fidolin strenger bei Erst-Nachrichten">
          <ToggleRow current={privacy.strictFirstMsg} disabled={busy}
            onChange={(v) => update({ strictFirstMsg: v })}
            label="Bei der ersten Nachricht von Fremden: Fidolin prüft besonders streng"
            description="Auch leicht anzügliche, distanzlose oder anbaggernde Erst-Nachrichten werden blockiert. Du bekommst die Nachricht gar nicht erst zu sehen. Bei späteren Nachrichten gilt der normale Filter." />
        </SettingBlock>

        {/* === 🛡 FRAUEN-SCHUTZ — Verified-Only DM + Live-Strict === */}
        <SettingBlock
          icon="🛡" title="Frauen-Schutz (empfohlen für weibliche Accounts)">
          <ToggleRow current={privacy.verifiedOnlyDm} disabled={busy}
            onChange={(v) => update({ verifiedOnlyDm: v })}
            label="Nur stimm-verifizierte User dürfen mir schreiben"
            description="Verhindert dass Männer sich als Frau tarnen, um dich anzuschreiben. Verifizierung passiert per kurzer Sprachprobe — Gemini-KI bestätigt das Geschlecht. Verifizierte tragen ein ✓-Badge." />

          <div style={{ height: 10 }} />

          <ToggleRow current={privacy.liveStrictMode} disabled={busy}
            onChange={(v) => update({ liveStrictMode: v })}
            label="Strict-Modus für Live-Streams (Streamer-Schutz)"
            description="In deinen Live-Streams werden Sprachnachrichten + Kommentare strenger gefiltert: Anmache, Komplikomplimente, Date-Anfragen werden automatisch blockiert." />

          <div style={{
            marginTop: 12, padding: 10, borderRadius: 10,
            background: "linear-gradient(135deg, #fdf2f8, #fce7f3)",
            border: "1px solid #f9a8d4",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#831843", marginBottom: 6 }}>
              🎤 Stimm-Verifikation
            </div>
            <div style={{ fontSize: 12, color: "#9d174d", marginBottom: 8, lineHeight: 1.4 }}>
              Reiche eine 5-15-Sekunden-Sprachprobe ein. Fidolin schätzt das Geschlecht
              deiner Stimme. Bei Match kriegst du das ✓-Verifiziert-Badge — andere können dich
              dann priorisieren und du kannst „Nur Verifizierte dürfen mir schreiben" aktivieren.
            </div>
            <Link href="/profile/verify" style={{
              display: "inline-block", padding: "8px 14px", borderRadius: 999,
              background: "linear-gradient(135deg, #ec4899, #be185d)", color: "#fff",
              textDecoration: "none", fontWeight: 800, fontSize: 12,
            }}>🛡 Jetzt verifizieren →</Link>
          </div>
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
