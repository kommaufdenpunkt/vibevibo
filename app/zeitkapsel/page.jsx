"use client";

// ⏳ Zeitkapsel — schreib deinem zukünftigen Ich. Öffnet sich erst am Zieldatum.
// Selbst-enthalten, dunkel (kein Abhängigkeit von globalem CSS).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const CARD = "rgba(22,22,27,0.92)";
const BORDER = "rgba(255,255,255,0.12)";
const TXT = "#eef1f3";
const MUT = "rgba(238,241,243,0.6)";

function fmtDate(ts) {
  try { return new Date(ts).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" }); }
  catch { return "—"; }
}
function daysLeft(ts) {
  const d = Math.ceil((ts - Date.now()) / 86400000);
  return d <= 0 ? "heute" : d === 1 ? "morgen" : `in ${d} Tagen`;
}

export default function ZeitkapselPage() {
  const [capsules, setCapsules] = useState(null);
  const [msg, setMsg] = useState("");
  const [when, setWhen] = useState("1y");
  const [customDate, setCustomDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/zeitkapsel", { credentials: "include" });
      if (r.status === 401) { setCapsules("login"); return; }
      const d = await r.json();
      if (r.ok) setCapsules(d.capsules || []);
    } catch { setCapsules([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function deliverAt() {
    const now = Date.now();
    if (when === "1m") return now + 30 * 86400000;
    if (when === "6m") return now + 182 * 86400000;
    if (when === "1y") return now + 365 * 86400000;
    if (when === "custom") { const t = new Date(customDate + "T09:00:00").getTime(); return Number.isFinite(t) ? t : NaN; }
    return NaN;
  }

  async function save() {
    setBusy(true); setFlash("");
    try {
      const dl = deliverAt();
      if (!msg.trim()) { setFlash("⚠ Schreib zuerst eine Nachricht."); setBusy(false); return; }
      if (!Number.isFinite(dl)) { setFlash("⚠ Wähle ein gültiges Datum."); setBusy(false); return; }
      const r = await fetch("/api/zeitkapsel", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, deliverAt: dl }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Speichern fehlgeschlagen.");
      setMsg(""); setFlash("✅ Zeitkapsel versiegelt! 🔒 Sie öffnet sich " + daysLeft(dl) + ".");
      load();
    } catch (e) { setFlash("⚠ " + e.message); }
    finally { setBusy(false); }
  }

  const WHENS = [
    ["1m", "in 1 Monat"], ["6m", "in 6 Monaten"], ["1y", "in 1 Jahr"], ["custom", "eigenes Datum"],
  ];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 14px 44px", color: TXT }}>
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, background: "linear-gradient(180deg,#141519 0%,#0c0d0f 100%)", backgroundColor: "#0c0d0f" }} />

      <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 16, background: "linear-gradient(135deg, rgba(168,85,247,0.18), rgba(255,255,255,0.03))", border: `1px solid ${BORDER}`, padding: "18px 18px 20px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.4, color: "#c084fc" }}>⏳ ZEITKAPSEL</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginTop: 3 }}>Brief an dein zukünftiges Ich</div>
        <div style={{ fontSize: 13, color: MUT, marginTop: 6, lineHeight: 1.5 }}>
          Schreib dir eine Nachricht — sie wird <b style={{ color: TXT }}>versiegelt</b> und öffnet sich <b style={{ color: TXT }}>erst am Zieldatum</b>. Was möchtest du deinem späteren Ich sagen?
        </div>
      </div>

      {capsules === "login" ? (
        <div style={{ padding: 18, borderRadius: 14, background: CARD, border: `1px solid ${BORDER}`, textAlign: "center" }}>
          <div style={{ fontSize: 34 }}>🔒</div>
          <div style={{ marginTop: 6, marginBottom: 10, color: MUT }}>Zum Schreiben einer Zeitkapsel bitte einloggen.</div>
          <Link href="/login?next=/zeitkapsel" style={{ display: "inline-block", padding: "10px 18px", borderRadius: 10, background: "linear-gradient(135deg,#a855f7,#7e22ce)", color: "#fff", fontWeight: 800, textDecoration: "none" }}>🔑 Einloggen</Link>
        </div>
      ) : (
        <>
          {/* Neue Kapsel */}
          <div style={{ borderRadius: 14, background: CARD, border: `1px solid ${BORDER}`, padding: 14, marginBottom: 16 }}>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} maxLength={2000}
              placeholder="Liebes Ich in einem Jahr, …"
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical", borderRadius: 10, padding: "11px 12px", fontSize: 14, fontFamily: "inherit", background: "rgba(0,0,0,0.3)", color: TXT, border: `1.5px solid ${BORDER}` }} />
            <div style={{ fontSize: 11.5, fontWeight: 800, color: "#c084fc", margin: "12px 0 6px" }}>📅 Wann soll sie sich öffnen?</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {WHENS.map(([k, label]) => {
                const active = when === k;
                return (
                  <button key={k} type="button" onClick={() => setWhen(k)} style={{
                    padding: "8px 12px", borderRadius: 999, fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, cursor: "pointer",
                    background: active ? "linear-gradient(135deg,#a855f7,#7e22ce)" : "rgba(255,255,255,0.06)",
                    color: active ? "#fff" : MUT, border: active ? "1px solid rgba(255,255,255,0.3)" : `1px solid ${BORDER}`,
                  }}>{label}</button>
                );
              })}
            </div>
            {when === "custom" && (
              <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)}
                style={{ marginTop: 8, padding: "9px 11px", borderRadius: 10, fontSize: 14, fontFamily: "inherit", background: "rgba(0,0,0,0.3)", color: TXT, border: `1.5px solid ${BORDER}` }} />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button type="button" onClick={save} disabled={busy} style={{
                padding: "11px 20px", borderRadius: 10, border: "none", cursor: busy ? "wait" : "pointer",
                background: "linear-gradient(135deg,#a855f7,#7e22ce)", color: "#fff", fontWeight: 900, fontSize: 14, fontFamily: "inherit",
              }}>{busy ? "…" : "🔒 Zeitkapsel versiegeln"}</button>
              {flash && <span style={{ fontSize: 12.5, fontWeight: 700, color: flash.startsWith("⚠") ? "#fca5a5" : "#86efac" }}>{flash}</span>}
            </div>
          </div>

          {/* Meine Kapseln */}
          <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", marginBottom: 8 }}>📦 Meine Zeitkapseln</div>
          {capsules === null ? (
            <div style={{ color: MUT }}>⏳ Lädt …</div>
          ) : capsules.length === 0 ? (
            <div style={{ padding: 18, borderRadius: 14, background: CARD, border: `1px dashed ${BORDER}`, textAlign: "center", color: MUT }}>
              Noch keine Zeitkapsel. Schreib deine erste! ⏳
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {capsules.map((c) => (
                <div key={c.id} style={{ borderRadius: 12, background: CARD, border: `1px solid ${c.unlocked ? "rgba(134,239,172,0.4)" : BORDER}`, padding: 12 }}>
                  {c.unlocked ? (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#86efac", marginBottom: 5 }}>💌 Geöffnet · {fmtDate(c.deliverAt)}</div>
                      <div style={{ whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.5, color: TXT }}>{c.message}</div>
                    </>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 24 }}>🔒</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: TXT }}>Versiegelt bis {fmtDate(c.deliverAt)}</div>
                        <div style={{ fontSize: 11.5, color: MUT }}>öffnet sich {daysLeft(c.deliverAt)} · geschrieben {fmtDate(c.createdAt)}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
