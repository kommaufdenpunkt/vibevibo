"use client";

export const dynamic = "force-dynamic";

// 🛡 Admin: Verifikations-Übersicht — Stimm-verifizierte und verdächtige Accounts.
// Hier kannst du Accounts manuell verifizieren oder die Verdacht-Flagge zurücknehmen.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const STATUS_LABEL = {
  none:       { label: "Keine",       color: "#475569", bg: "#e2e8f0" },
  pending:    { label: "Ausstehend",  color: "#92400e", bg: "#fef3c7" },
  verified:   { label: "Verifiziert", color: "#166534", bg: "#dcfce7" },
  rejected:   { label: "Abgelehnt",   color: "#991b1b", bg: "#fee2e2" },
  suspicious: { label: "⚠ Verdächtig", color: "#7c2d12", bg: "#fed7aa" },
};

export default function AdminVerificationsPage() {
  const [filter, setFilter] = useState("suspicious");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [samples, setSamples] = useState({});
  const [flash, setFlash] = useState("");
  const [pw, setPw] = useState("");

  useEffect(() => {
    setPw(new URLSearchParams(window.location.search).get("pw") || "");
  }, []);

  const load = useCallback(async () => {
    if (!pw) return;
    setLoading(true);
    try {
      const url = `/api/admin/verifications?pw=${encodeURIComponent(pw)}${filter ? `&status=${filter}` : ""}`;
      const r = await fetch(url, { credentials: "include" });
      const d = await r.json();
      if (r.ok) setList(d.list || []);
      else setFlash(d.error || "Fehler");
    } catch (e) { setFlash(e.message); }
    finally { setLoading(false); }
  }, [filter, pw]);

  useEffect(() => { load(); }, [load]);

  async function loadSamples(userId) {
    try {
      const r = await fetch(`/api/admin/verifications?pw=${encodeURIComponent(pw)}&userId=${userId}`, { credentials: "include" });
      const d = await r.json();
      if (r.ok) setSamples((prev) => ({ ...prev, [userId]: d.samples || [] }));
    } catch {}
  }

  async function act(userId, action) {
    const reason = action !== "reset"
      ? prompt(action === "verify" ? "Begründung (optional):" : "Grund der Ablehnung (optional):") || ""
      : "";
    try {
      const r = await fetch(`/api/admin/verifications?pw=${encodeURIComponent(pw)}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, reason }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setFlash(`✓ ${action} ausgeführt für User #${userId}`);
      load();
    } catch (e) { setFlash(`⚠ ${e.message}`); }
    finally { setTimeout(() => setFlash(""), 3500); }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "20px auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Link href={`/admin?pw=${encodeURIComponent(pw)}`} style={{
          background: "rgba(255,255,255,0.85)", color: "#1f2937",
          padding: "6px 12px", borderRadius: 999, textDecoration: "none",
          fontSize: 13, fontWeight: 700,
        }}>← Admin</Link>
        <h1 style={{ margin: 0, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.3)", fontSize: 22 }}>
          🛡 Stimm-Verifikationen
        </h1>
      </div>

      <div style={{
        background: "rgba(255,255,255,0.96)", borderRadius: 14, padding: 14, marginBottom: 12,
      }}>
        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
          Hier siehst du alle Accounts, bei denen Fidolin die Stimme analysiert hat.
          <br/>
          <b>⚠ Verdächtig</b>: Account behauptet ein Geschlecht, aber in mindestens 3 Sprachnachrichten
          klang die Stimme klar gegenteilig (Konfidenz ≥0.7). Manuell prüfen + entscheiden.
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {["suspicious", "verified", "rejected", "pending", null].map((s) => (
            <button key={s || "all"} onClick={() => setFilter(s)} style={{
              padding: "6px 12px", borderRadius: 999,
              border: filter === s ? "2px solid #ec4899" : "1px solid rgba(0,0,0,0.1)",
              background: filter === s ? "#fdf2f8" : "#fff",
              cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12,
              color: filter === s ? "#ec4899" : "#475569",
            }}>
              {s ? STATUS_LABEL[s]?.label || s : "Alle"}
            </button>
          ))}
        </div>
      </div>

      {flash && (
        <div style={{
          padding: 10, borderRadius: 10, marginBottom: 10,
          background: flash.startsWith("⚠") ? "#fee2e2" : "#dcfce7",
          color: flash.startsWith("⚠") ? "#991b1b" : "#166534",
          fontWeight: 700, fontSize: 13,
        }}>{flash}</div>
      )}

      {loading && <div style={{ color: "#fff", textAlign: "center", padding: 20 }}>⏳ Lade…</div>}

      {!loading && list.length === 0 && (
        <div style={{
          padding: 24, textAlign: "center", color: "#fff",
          background: "rgba(255,255,255,0.15)", borderRadius: 14,
        }}>Keine Einträge in dieser Kategorie.</div>
      )}

      {list.map((u) => {
        const st = STATUS_LABEL[u.status] || STATUS_LABEL.none;
        const isOpen = expanded === u.id;
        return (
          <div key={u.id} style={{
            background: "rgba(255,255,255,0.96)", borderRadius: 12, padding: 12,
            marginBottom: 8, border: "1px solid rgba(0,0,0,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 24 }}>{u.emoji || "👤"}</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <Link href={`/u/${u.username}`} style={{ fontSize: 15, fontWeight: 800, color: "#1f2937", textDecoration: "none" }}>
                  {u.displayName || `@${u.username}`}
                </Link>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  @{u.username} · Gender: {u.gender || "—"} · Score: {u.voiceScore}/100 · Samples: {u.sampleCount}
                </div>
              </div>
              <span style={{
                padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800,
                background: st.bg, color: st.color,
              }}>{st.label}</span>
              <button onClick={() => {
                if (isOpen) { setExpanded(null); return; }
                setExpanded(u.id);
                if (!samples[u.id]) loadSamples(u.id);
              }} style={smallBtn("#64748b")}>
                {isOpen ? "▴ Zu" : "▾ Samples"}
              </button>
            </div>

            {isOpen && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed rgba(0,0,0,0.08)" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 6 }}>
                  🎤 LETZTE VOICE-SAMPLES
                </div>
                {!samples[u.id] && <div style={{ fontSize: 12, color: "#94a3b8" }}>Lade…</div>}
                {samples[u.id]?.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8" }}>Keine Samples.</div>}
                {(samples[u.id] || []).map((s) => (
                  <div key={s.id} style={{
                    background: "#f8fafc", padding: 6, borderRadius: 6, marginBottom: 4, fontSize: 11,
                  }}>
                    <b style={{ color: "#1f2937" }}>{s.sampleKind}</b> · erkannt: <b>{s.detectedGender || "—"}</b> · Konfidenz: {(s.confidence * 100).toFixed(0)}% · {new Date(s.createdAt).toLocaleString("de-DE")}
                    {s.reason && <div style={{ color: "#64748b", marginTop: 2 }}>{s.reason}</div>}
                  </div>
                ))}

                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button onClick={() => act(u.id, "verify")} style={smallBtn("#16a34a")}>
                    ✓ Manuell verifizieren
                  </button>
                  <button onClick={() => act(u.id, "reject")} style={smallBtn("#dc2626")}>
                    ✗ Ablehnen
                  </button>
                  <button onClick={() => act(u.id, "reset")} style={smallBtn("#64748b")}>
                    ↻ Zurücksetzen
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const smallBtn = (color) => ({
  padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
  background: color, color: "#fff", fontFamily: "inherit",
  fontWeight: 700, fontSize: 12,
});
