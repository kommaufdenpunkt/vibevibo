"use client";

// 🏘 MCP — Coms-Namens-Anträge (Leitung/Mod).
// Listet offene Anträge auf Com-Umbenennung. Genehmigen zieht 400 ✨ ab und
// benennt die Com um; Ablehnen erfordert eine Begründung.

import { useCallback, useEffect, useState } from "react";

function relTime(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "gerade eben";
  if (s < 3600) return `vor ${Math.floor(s / 60)} min`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} h`;
  return `vor ${Math.floor(s / 86400)} d`;
}

export default function ComsRequestsPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(0);
  const [flash, setFlash] = useState("");

  const load = useCallback(() => {
    setErr("");
    fetch("/api/mcp/coms-requests?limit=100")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d?.error || "Fehler beim Laden.");
        setData(d);
      })
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(reqId, action) {
    let note = null;
    if (action === "reject") {
      note = window.prompt("Begründung für die Ablehnung (min. 5 Zeichen):") || "";
      if (note.trim().length < 5) { setFlash("⚠ Begründung zu kurz."); setTimeout(() => setFlash(""), 2500); return; }
    } else {
      note = window.prompt("Optionale Anmerkung an den Owner (leer lassen geht):") || null;
    }
    setBusyId(reqId);
    try {
      const r = await fetch(`/api/mcp/coms-requests/${reqId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Aktion fehlgeschlagen.");
      setFlash(action === "approve"
        ? `✅ Genehmigt — Com heißt jetzt „${d.newName}"${d.vibesCharged ? ` · ${d.vibesCharged} ✨ abgezogen` : ""}.`
        : "❌ Antrag abgelehnt.");
      setTimeout(() => setFlash(""), 4000);
      load();
    } catch (e) {
      setFlash("⚠ " + e.message);
      setTimeout(() => setFlash(""), 5000);
    } finally {
      setBusyId(0);
    }
  }

  const requests = data?.requests || [];

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 14 }}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, rgba(124,58,237,0.28), rgba(236,72,153,0.20))",
        border: "1px solid rgba(167,139,250,0.4)",
        borderRadius: 16, padding: "18px 18px", marginBottom: 16,
        boxShadow: "0 10px 32px rgba(124,58,237,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 34, filter: "drop-shadow(0 3px 8px rgba(124,58,237,0.5))" }}>🏘</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#fff" }}>Coms-Namens-Anträge</h1>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
              Genehmigen zieht <b style={{ color: "#ffd9ee" }}>400 ✨</b> ab & benennt die Com um. Ablehnen ist kostenlos.
            </div>
          </div>
          <span style={{
            background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 999, padding: "5px 12px", fontSize: 13, fontWeight: 800, color: "#fff", whiteSpace: "nowrap",
          }}>{data?.total ?? "–"} offen</span>
        </div>
      </div>

      {flash && (
        <div style={{
          marginBottom: 12, padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 700,
          background: flash.startsWith("⚠") ? "rgba(245,158,11,0.18)" : "rgba(34,197,94,0.18)",
          border: `1px solid ${flash.startsWith("⚠") ? "rgba(245,158,11,0.5)" : "rgba(34,197,94,0.5)"}`,
          color: "#fff",
        }}>{flash}</div>
      )}

      {err && (
        <div style={{ padding: 16, borderRadius: 12, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#fff", marginBottom: 12 }}>
          ⚠ {err}
          <button type="button" onClick={load} style={{ marginLeft: 10, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, color: "#fff", padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}>Neu laden</button>
        </div>
      )}

      {!data && !err && (
        <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.6)" }}>Lädt…</div>
      )}

      {data && requests.length === 0 && !err && (
        <div style={{
          textAlign: "center", padding: 40, borderRadius: 16,
          background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.15)",
          color: "rgba(255,255,255,0.7)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>Keine offenen Anträge</div>
          <div style={{ fontSize: 12.5, marginTop: 4 }}>Alle Coms-Namens-Anträge sind bearbeitet.</div>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {requests.map((r) => {
          const busy = busyId === r.id;
          return (
            <div key={r.id} style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14, padding: 14,
              boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
              opacity: busy ? 0.6 : 1, transition: "opacity 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#c4b5fd", background: "rgba(124,58,237,0.2)", border: "1px solid rgba(167,139,250,0.35)", borderRadius: 999, padding: "2px 9px" }}>
                  /{r.com_slug}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{relTime(r.requested_at)}</span>
                <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 800, color: "#fbbf24" }}>{r.cost_vibes} ✨</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "line-through" }}>
                  {r.old_value || "(aktueller Name)"}
                </div>
                <span style={{ fontSize: 16, color: "#a78bfa" }}>→</span>
                <div style={{ fontSize: 17, fontWeight: 900, color: "#fff" }}>„{r.new_value}"</div>
              </div>

              {r.reason && (
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.78)", background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "8px 11px", marginBottom: 10, lineHeight: 1.5 }}>
                  💬 {r.reason}
                </div>
              )}

              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginBottom: 12 }}>
                Antrag von <b style={{ color: "rgba(255,255,255,0.85)" }}>{r.requester_display || r.requester_username || `User #${r.requested_by_user_id}`}</b>
                {r.requester_username ? ` (@${r.requester_username})` : ""}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" disabled={busy} onClick={() => act(r.id, "approve")} style={{
                  flex: 1, padding: "10px 14px", borderRadius: 10, border: "none", cursor: busy ? "wait" : "pointer",
                  background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", fontWeight: 800, fontSize: 13,
                  fontFamily: "inherit",
                }}>✅ Genehmigen ({r.cost_vibes} ✨)</button>
                <button type="button" disabled={busy} onClick={() => act(r.id, "reject")} style={{
                  flex: 1, padding: "10px 14px", borderRadius: 10, cursor: busy ? "wait" : "pointer",
                  background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.4)",
                  fontWeight: 800, fontSize: 13, fontFamily: "inherit",
                }}>❌ Ablehnen</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
