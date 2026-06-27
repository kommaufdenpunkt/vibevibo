"use client";

// 🚩 Meldungen-Liste (Mod-Tool) — zeigt offene Nachrichten-Meldungen mit
// Kontext-Snippet und One-Tap "Erledigt" / "Abweisen".
// Defensiv geschrieben: rendert vorhandene Felder, ohne exaktes Schema vorauszusetzen.

import { useCallback, useEffect, useState } from "react";

function relTime(ts) {
  if (!ts) return "";
  const n = Number(ts);
  const ms = n < 1e12 ? n * 1000 : n; // sek vs ms tolerant
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "gerade eben";
  if (s < 3600) return `vor ${Math.floor(s / 60)} min`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} h`;
  return `vor ${Math.floor(s / 86400)} d`;
}

function reporterName(r) {
  return r.reporter_display || r.reporter_username || r.reporterDisplay
    || r.reporterUsername || (r.reporter_user_id ? `User #${r.reporter_user_id}` : "Unbekannt");
}

function SnippetView({ snippet }) {
  if (!snippet) return null;
  const arr = Array.isArray(snippet) ? snippet : [snippet];
  if (arr.length === 0) return null;
  return (
    <div style={{ background: "rgba(0,0,0,0.22)", borderRadius: 10, padding: "8px 11px", marginBottom: 10, display: "grid", gap: 4 }}>
      {arr.map((m, i) => {
        const text = typeof m === "string" ? m : (m?.text ?? m?.body ?? JSON.stringify(m));
        const who = typeof m === "object" ? (m?.from || m?.username || m?.display_name || m?.sender || "") : "";
        const reported = typeof m === "object" && (m?.reported || m?.isReported);
        return (
          <div key={i} style={{
            fontSize: 12, lineHeight: 1.45,
            color: reported ? "#fecaca" : "rgba(255,255,255,0.8)",
            fontWeight: reported ? 700 : 400,
          }}>
            {who ? <b style={{ color: "rgba(255,255,255,0.6)" }}>{who}: </b> : null}{text}
          </div>
        );
      })}
    </div>
  );
}

export default function MeldungenClient() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(0);
  const [flash, setFlash] = useState("");

  const load = useCallback(() => {
    setErr("");
    fetch("/api/mcp/reports")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => { if (!ok) throw new Error(d?.error || "Fehler."); setData(d); })
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function resolve(id, status) {
    setBusyId(id);
    try {
      const r = await fetch(`/api/mcp/reports/${id}/resolve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Fehler.");
      setFlash(status === "dismissed" ? "Meldung abgewiesen." : "✅ Meldung erledigt.");
      setTimeout(() => setFlash(""), 3000);
      load();
    } catch (e) {
      setFlash("⚠ " + e.message);
      setTimeout(() => setFlash(""), 4000);
    } finally { setBusyId(0); }
  }

  const reports = data?.reports || [];

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 14 }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(239,68,68,0.26), rgba(185,28,28,0.2))",
        border: "1px solid rgba(248,113,113,0.4)", borderRadius: 16, padding: "18px",
        marginBottom: 16, boxShadow: "0 10px 32px rgba(220,38,38,0.22), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 32 }}>🚩</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#fff" }}>Meldungen</h1>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
              Gemeldete Nachrichten — prüfen & per Tap erledigen.
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
          marginBottom: 12, padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 700, color: "#fff",
          background: flash.startsWith("⚠") ? "rgba(245,158,11,0.18)" : "rgba(34,197,94,0.18)",
          border: `1px solid ${flash.startsWith("⚠") ? "rgba(245,158,11,0.5)" : "rgba(34,197,94,0.5)"}`,
        }}>{flash}</div>
      )}

      {err && (
        <div style={{ padding: 16, borderRadius: 12, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#fff", marginBottom: 12 }}>
          ⚠ {err}
          <button type="button" onClick={load} style={{ marginLeft: 10, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, color: "#fff", padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}>Neu laden</button>
        </div>
      )}

      {!data && !err && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.6)" }}>Lädt…</div>}

      {data && reports.length === 0 && !err && (
        <div style={{ textAlign: "center", padding: 40, borderRadius: 16, background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✨</div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>Keine offenen Meldungen</div>
          <div style={{ fontSize: 12.5, marginTop: 4 }}>Alles sauber — gute Arbeit!</div>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {reports.map((r) => {
          const busy = busyId === r.id;
          return (
            <div key={r.id} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14, padding: 14, boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
              opacity: busy ? 0.6 : 1, transition: "opacity 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#fca5a5", background: "rgba(239,68,68,0.18)", border: "1px solid rgba(248,113,113,0.35)", borderRadius: 999, padding: "2px 9px" }}>
                  🚩 Meldung #{r.id}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{relTime(r.created_at || r.createdAt)}</span>
              </div>

              {(r.reason) && (
                <div style={{ fontSize: 13, color: "#fff", fontWeight: 700, marginBottom: 8 }}>
                  Grund: <span style={{ fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>{r.reason}</span>
                </div>
              )}

              <SnippetView snippet={r.snippet} />

              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginBottom: 12 }}>
                Gemeldet von <b style={{ color: "rgba(255,255,255,0.85)" }}>{reporterName(r)}</b>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" disabled={busy} onClick={() => resolve(r.id, "resolved")} style={{
                  flex: 1, padding: "10px 14px", borderRadius: 10, border: "none", cursor: busy ? "wait" : "pointer",
                  background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", fontWeight: 800, fontSize: 13, fontFamily: "inherit",
                }}>✅ Erledigt</button>
                <button type="button" disabled={busy} onClick={() => resolve(r.id, "dismissed")} style={{
                  flex: 1, padding: "10px 14px", borderRadius: 10, cursor: busy ? "wait" : "pointer",
                  background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.2)",
                  fontWeight: 800, fontSize: 13, fontFamily: "inherit",
                }}>Abweisen</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
