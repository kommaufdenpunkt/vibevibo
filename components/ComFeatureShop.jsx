"use client";

// 🔓 Com-Feature-Shop — Owner schaltet Funktionen mit Vibes frei.
// • Katalog wird vom Server geladen (lib/comFeatures.js)
// • Owner-only: nur Owner sieht Preise + Freischalten-Buttons + sein Vibes-Konto
// • Officers/Members sehen lesend was schon aktiv ist
// • Konfigurierbare Features (Animated Theme) zeigen Theme-Picker

import { useEffect, useState } from "react";

export default function ComFeatureShop({ slug, isOwner, onChange, themeColor = "#ec4899" }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);

  async function load() {
    setErr("");
    try {
      const r = await fetch(`/api/groups/${slug}/features`, { credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setData(d);
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  async function unlock(featureKey, label) {
    if (!confirm(`„${label}" jetzt freischalten? Vibes werden aus deinem Konto abgebucht.`)) return;
    setBusy(featureKey); setMsg(null);
    try {
      const r = await fetch(`/api/groups/${slug}/features/unlock`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureKey }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setMsg({ ok: true, text: `✓ „${label}" ist jetzt aktiv!` });
      await load();
      onChange?.();
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    finally {
      setBusy("");
      setTimeout(() => setMsg(null), 4000);
    }
  }

  async function reconfigure(featureKey, payload) {
    setBusy(featureKey); setMsg(null);
    try {
      const r = await fetch(`/api/groups/${slug}/features/config`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureKey, payload }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setMsg({ ok: true, text: "✓ Gespeichert" });
      await load();
      onChange?.();
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    finally {
      setBusy("");
      setTimeout(() => setMsg(null), 3000);
    }
  }

  if (err) return <div style={errBox}>⚠ {err}</div>;
  if (!data) return <div style={{ padding: 14, fontSize: 13, color: "#64748b" }}>⏳ Lade Funktionen…</div>;

  const { catalog = [], categories = {}, unlocked = [], memberCount = 0, myBalance } = data;
  const unlockedMap = Object.fromEntries(unlocked.map((u) => [u.featureKey, u]));

  const grouped = {};
  for (const f of catalog) {
    if (!grouped[f.category]) grouped[f.category] = [];
    grouped[f.category].push(f);
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.96)", borderRadius: 14, padding: 14,
      border: `2px solid ${themeColor}33`, marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <h3 style={{ margin: 0, color: "#1f2937" }}>🔓 Funktionen freischalten</h3>
        {isOwner && myBalance != null && (
          <span style={{
            marginLeft: "auto", fontSize: 12, fontWeight: 800,
            padding: "4px 10px", borderRadius: 999,
            background: "#fef3c7", color: "#92400e",
          }}>
            Dein Konto: {myBalance.toLocaleString("de-DE")} ✨
          </span>
        )}
      </div>

      <div style={{
        fontSize: 12, color: "#64748b", marginBottom: 10, lineHeight: 1.4,
      }}>
        {isOwner
          ? <>Schalte Features für deine Com frei — einmal Vibes bezahlen, bleibt dauerhaft an.
              Manche brauchen eine Mindest-Mitgliederzahl. <b>🤖 Fidolin protokolliert jede Freischaltung.</b></>
          : <>Nur der Owner kann Funktionen freischalten. Hier siehst du was schon aktiv ist.</>}
        <br/>
        <span style={{ color: "#94a3b8" }}>Aktuelle Mitglieder: <b>{memberCount}</b></span>
      </div>

      {msg && (
        <div style={{
          padding: 8, borderRadius: 8, marginBottom: 10,
          background: msg.ok ? "#dcfce7" : "#fee2e2",
          color: msg.ok ? "#166534" : "#991b1b",
          fontWeight: 700, fontSize: 13,
        }}>{msg.text}</div>
      )}

      {Object.entries(grouped).map(([catKey, feats]) => {
        const cat = categories[catKey] || { label: catKey, color: "#64748b" };
        return (
          <div key={catKey} style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 11, fontWeight: 800, letterSpacing: 0.8,
              textTransform: "uppercase", marginBottom: 6, color: cat.color,
            }}>{cat.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {feats.map((f) => {
                const u = unlockedMap[f.key];
                const isUnlocked = !!u;
                const memberGap = f.memberGate > memberCount ? f.memberGate - memberCount : 0;
                const canUnlock = isOwner && f.available && !isUnlocked && memberGap === 0;
                const tooPoor = isOwner && myBalance != null && myBalance < f.costVibes;

                return (
                  <div key={f.key} style={{
                    padding: 10, borderRadius: 10,
                    background: isUnlocked ? "#ecfdf5" : f.available ? "#f8fafc" : "#f1f5f9",
                    border: `1px solid ${isUnlocked ? "#86efac" : "rgba(0,0,0,0.06)"}`,
                    opacity: !f.available && !isUnlocked ? 0.7 : 1,
                  }}>
                    <div style={{ display: "flex", alignItems: "start", gap: 8 }}>
                      <span style={{ fontSize: 22, lineHeight: 1 }}>{f.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <b style={{ fontSize: 14, color: "#1f2937" }}>{f.label}</b>
                          {isUnlocked && <span style={badgeActive}>✓ AKTIV</span>}
                          {!f.available && !isUnlocked && <span style={badgeSoon}>🚧 Bald</span>}
                          {f.memberGate > 0 && <span style={badgeGate}>👥 ab {f.memberGate}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                          {f.description}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {!isUnlocked && f.available && (
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e" }}>
                            {f.costVibes.toLocaleString("de-DE")} ✨
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Konfigurations-Panel — Single-Value-Payload-Picker */}
                    {isUnlocked && f.configurable && (() => {
                      // Welche Property im Payload entspricht dieser Funktion?
                      const payloadKey =
                        f.key === "animated_theme" ? "theme"
                        : f.key === "hero_seasonal" ? "season"
                        : f.key === "sound_fx" ? "sound"
                        : null;
                      if (!payloadKey) return null;
                      return (
                        <OptionPicker
                          title="🎨 EFFEKT WÄHLEN"
                          current={u.payload?.[payloadKey]}
                          options={f.options}
                          themeColor={themeColor}
                          canEdit={isOwner}
                          busy={busy === f.key}
                          onPick={(val) => reconfigure(f.key, { [payloadKey]: val })}
                        />
                      );
                    })()}

                    {/* Freischalten / Statushinweis */}
                    {!isUnlocked && f.available && (
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {memberGap > 0 ? (
                          <span style={{ fontSize: 12, color: "#92400e", fontWeight: 700 }}>
                            👥 noch {memberGap} Mitglieder fehlen
                          </span>
                        ) : !isOwner ? (
                          <span style={{ fontSize: 12, color: "#64748b" }}>Nur der Owner kann das freischalten.</span>
                        ) : tooPoor ? (
                          <span style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>
                            ⚠ Nicht genug Vibes
                          </span>
                        ) : null}

                        {canUnlock && (
                          <button onClick={() => unlock(f.key, f.label)} disabled={busy === f.key || tooPoor}
                            style={{
                              marginLeft: "auto", padding: "8px 14px", borderRadius: 8,
                              border: "none", cursor: tooPoor ? "not-allowed" : "pointer",
                              background: tooPoor ? "#cbd5e1" : themeColor, color: "#fff",
                              fontFamily: "inherit", fontWeight: 800, fontSize: 13,
                              opacity: busy === f.key ? 0.6 : 1,
                            }}>
                            {busy === f.key ? "⏳…" : "🔓 Freischalten"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OptionPicker({ title, current, options, themeColor, canEdit, busy, onPick }) {
  return (
    <div style={{ marginTop: 10, padding: 8, background: "rgba(255,255,255,0.7)", borderRadius: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {(options || []).map((o) => {
          const active = o.id === current;
          return (
            <button key={o.id}
              disabled={!canEdit || busy}
              onClick={() => onPick(o.id)}
              style={{
                padding: "6px 10px", borderRadius: 999, fontSize: 12,
                fontFamily: "inherit", fontWeight: 700,
                cursor: canEdit ? "pointer" : "default",
                border: `2px solid ${active ? themeColor : "transparent"}`,
                background: active ? "#fdf2f8" : "#f1f5f9",
                color: active ? themeColor : "#475569",
                opacity: busy ? 0.6 : 1,
              }}>{o.label}</button>
          );
        })}
      </div>
    </div>
  );
}

const errBox = { padding: 10, background: "#fee2e2", color: "#991b1b", borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 12 };
const badgeActive = { fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#16a34a", color: "#fff", fontWeight: 800 };
const badgeSoon = { fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#e2e8f0", color: "#64748b", fontWeight: 800 };
const badgeGate = { fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#fef3c7", color: "#92400e", fontWeight: 800 };
