"use client";

// 🚩 Meldungen (mcp_reports) — kategorisiert + Pull/Lock + NOTFALL-Priorität.
// Notfälle (Suizid/Gewalt/Minderjährige) werden nach oben sortiert, rot markiert,
// und oben als Alarm-Banner angezeigt.

import { useCallback, useEffect, useMemo, useState } from "react";

const CRITICAL = new Set(["suizid", "selbstverletzung", "gewalt", "drohung", "minderjaehrige", "missbrauch"]);

const CAT = {
  suizid: { e: "🆘", label: "Suizid/Selbstgefährdung" },
  selbstverletzung: { e: "🆘", label: "Selbstverletzung" },
  gewalt: { e: "⚠️", label: "Gewalt/Drohung" },
  drohung: { e: "⚠️", label: "Drohung" },
  minderjaehrige: { e: "🧒", label: "Minderjährige" },
  missbrauch: { e: "🧒", label: "Missbrauch" },
  beleidigung: { e: "💬", label: "Beleidigung" },
  nsfw: { e: "🔞", label: "NSFW" },
  bild: { e: "📷", label: "Fotos" }, foto: { e: "📷", label: "Fotos" },
  voice: { e: "🎤", label: "Voice" },
  drogen: { e: "💊", label: "Drogen" },
  betrug: { e: "🎭", label: "Betrug/Fake" }, fake: { e: "🎭", label: "Fake" },
  spam: { e: "🚯", label: "Spam" },
  live: { e: "📡", label: "Live" },
  sonstiges: { e: "📌", label: "Sonstiges" },
};
function catInfo(c) {
  const key = String(c || "sonstiges").toLowerCase();
  return CAT[key] || { e: "📌", label: key.charAt(0).toUpperCase() + key.slice(1) };
}
const isCrit = (c) => CRITICAL.has(String(c || "").toLowerCase());

function relTime(ts) {
  if (!ts) return "";
  const n = Number(ts); const ms = n < 1e12 ? n * 1000 : n;
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "gerade eben";
  if (s < 3600) return `vor ${Math.floor(s / 60)} min`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} h`;
  return `vor ${Math.floor(s / 86400)} d`;
}

export default function MeldungenClient() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [cat, setCat] = useState("__all");
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
  // Notfälle: alle 20s automatisch aktualisieren.
  useEffect(() => {
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const meId = data?.meId;
  // Notfälle zuerst, dann neueste.
  const reports = useMemo(() => {
    const arr = [...(data?.reports || [])];
    arr.sort((a, b) => {
      const ca = isCrit(a.category) ? 1 : 0, cb = isCrit(b.category) ? 1 : 0;
      if (ca !== cb) return cb - ca;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return arr;
  }, [data]);

  const critCount = reports.filter((r) => isCrit(r.category)).length;

  const cats = useMemo(() => {
    const counts = {};
    for (const r of reports) {
      const k = String(r.category || "sonstiges").toLowerCase();
      counts[k] = (counts[k] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => (isCrit(b[0]) - isCrit(a[0])) || (b[1] - a[1]))
      .map(([k, n]) => ({ key: k, n, crit: isCrit(k), ...catInfo(k) }));
  }, [reports]);

  const visible = cat === "__all" ? reports : reports.filter((r) => String(r.category || "sonstiges").toLowerCase() === cat);

  async function act(id, action) {
    let resolution;
    if (action === "resolve") {
      resolution = window.prompt("Was wurde getan? (z. B. Verwarnt / Gelöscht / Gebannt / OK)", "erledigt");
      if (resolution === null) return;
    }
    setBusyId(id);
    try {
      const r = await fetch(`/api/mcp/reports/${id}/action`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, resolution }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Fehler.");
      setFlash(action === "claim" ? "🔒 Übernommen." : action === "release" ? "↩ Freigegeben." : "✅ Erledigt.");
      setTimeout(() => setFlash(""), 3000);
      load();
    } catch (e) {
      setFlash("⚠ " + e.message);
      setTimeout(() => setFlash(""), 4500);
    } finally { setBusyId(0); }
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: 14 }}>
      <style>{`@keyframes vv-sos-pulse {0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.5)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0)}}`}</style>

      <div style={{
        background: "linear-gradient(135deg, rgba(239,68,68,0.26), rgba(185,28,28,0.2))",
        border: "1px solid rgba(248,113,113,0.4)", borderRadius: 16, padding: 18, marginBottom: 14,
        boxShadow: "0 10px 32px rgba(220,38,38,0.22), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 32 }}>🚩</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#fff" }}>Meldungen</h1>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>Übernehmen 🔒 → prüfen → erledigen.</div>
          </div>
          <span style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 999, padding: "5px 12px", fontSize: 13, fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }}>{reports.length} aktiv</span>
        </div>
      </div>

      {/* Notfall-Alarm */}
      {critCount > 0 && (
        <div style={{
          marginBottom: 12, padding: "12px 14px", borderRadius: 12,
          background: "linear-gradient(135deg, #b91c1c, #7f1d1d)", color: "#fff",
          border: "1px solid #ef4444", fontWeight: 800, fontSize: 13.5,
          animation: "vv-sos-pulse 1.6s ease-in-out infinite",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          🆘 {critCount} Notfall-Meldung{critCount > 1 ? "en" : ""} — bitte ZUERST bearbeiten!
        </div>
      )}

      {/* Kategorie-Tabs */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 10 }}>
        <Chip active={cat === "__all"} onClick={() => setCat("__all")} label={`Alle ${reports.length}`} emoji="📋" />
        {cats.map((c) => (
          <Chip key={c.key} active={cat === c.key} crit={c.crit} onClick={() => setCat(c.key)} label={`${c.label} ${c.n}`} emoji={c.e} />
        ))}
      </div>

      {flash && (
        <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 700, color: "#fff", background: flash.startsWith("⚠") ? "rgba(245,158,11,0.18)" : "rgba(34,197,94,0.18)", border: `1px solid ${flash.startsWith("⚠") ? "rgba(245,158,11,0.5)" : "rgba(34,197,94,0.5)"}` }}>{flash}</div>
      )}
      {err && (
        <div style={{ padding: 16, borderRadius: 12, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#fff", marginBottom: 12 }}>
          ⚠ {err}<button type="button" onClick={load} style={{ marginLeft: 10, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, color: "#fff", padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}>Neu laden</button>
        </div>
      )}
      {!data && !err && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.6)" }}>Lädt…</div>}
      {data && visible.length === 0 && !err && (
        <div style={{ textAlign: "center", padding: 40, borderRadius: 16, background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✨</div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>Keine Meldungen{cat !== "__all" ? " hier" : ""}</div>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {visible.map((r) => {
          const busy = busyId === r.id;
          const ci = catInfo(r.category);
          const crit = isCrit(r.category);
          const claimedByMe = r.status === "claimed" && Number(r.claimedBy) === Number(meId);
          const claimedByOther = r.status === "claimed" && !claimedByMe;
          return (
            <div key={r.id} style={{
              background: crit ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${crit ? "rgba(239,68,68,0.6)" : claimedByMe ? "rgba(34,197,94,0.45)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 14, padding: 14, boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
              opacity: busy ? 0.6 : 1, transition: "opacity 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", background: crit ? "rgba(239,68,68,0.5)" : "rgba(124,58,237,0.3)", border: `1px solid ${crit ? "#ef4444" : "rgba(167,139,250,0.4)"}`, borderRadius: 999, padding: "2px 10px" }}>
                  {ci.e} {ci.label}
                </span>
                {crit && <span style={{ fontSize: 11, fontWeight: 900, color: "#fff", background: "#dc2626", borderRadius: 999, padding: "2px 8px" }}>🆘 NOTFALL</span>}
                {claimedByMe && <span style={{ fontSize: 11, fontWeight: 800, color: "#86efac" }}>🔒 deins</span>}
                {claimedByOther && <span style={{ fontSize: 11, fontWeight: 700, color: "#fca5a5" }}>🔒 @{r.claimedByUsername || "?"}</span>}
                <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{relTime(r.createdAt)}</span>
              </div>

              {r.contentSnapshot && (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", background: "rgba(0,0,0,0.22)", borderRadius: 10, padding: "9px 11px", marginBottom: 8, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{r.contentSnapshot}</div>
              )}
              {r.reason && <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.78)", marginBottom: 8 }}><b style={{ color: "#fca5a5" }}>Grund:</b> {r.reason}</div>}

              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginBottom: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span>Melder: <b style={{ color: "rgba(255,255,255,0.8)" }}>@{r.reporterUsername || r.reporterId}</b></span>
                {r.targetUsername && <span>Betroffen: <b style={{ color: "rgba(255,255,255,0.8)" }}>@{r.targetUsername}</b></span>}
                {r.targetType && <span style={{ opacity: 0.7 }}>· {r.targetType}</span>}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {r.status === "open" && (
                  <button type="button" disabled={busy} onClick={() => act(r.id, "claim")} style={btn(crit ? "linear-gradient(135deg, #dc2626, #991b1b)" : "linear-gradient(135deg, #7c3aed, #5b21b6)")}>
                    🔒 Übernehmen
                  </button>
                )}
                {claimedByMe && (
                  <>
                    <button type="button" disabled={busy} onClick={() => act(r.id, "resolve")} style={btn("linear-gradient(135deg, #16a34a, #15803d)")}>✅ Erledigt</button>
                    <button type="button" disabled={busy} onClick={() => act(r.id, "release")} style={{ ...btn("rgba(255,255,255,0.08)"), color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.2)", flex: "0 0 auto" }}>↩</button>
                  </>
                )}
                {claimedByOther && (
                  <div style={{ flex: 1, textAlign: "center", padding: 10, fontSize: 12.5, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>In Bearbeitung · @{r.claimedByUsername || "Mod"}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ active, onClick, label, emoji, crit }) {
  return (
    <button type="button" onClick={onClick} style={{
      flexShrink: 0, padding: "7px 13px", borderRadius: 999, cursor: "pointer",
      fontSize: 12.5, fontWeight: 800, fontFamily: "inherit", whiteSpace: "nowrap",
      background: active ? (crit ? "linear-gradient(135deg,#dc2626,#7f1d1d)" : "linear-gradient(135deg, #ec4899, #7c3aed)") : crit ? "rgba(239,68,68,0.14)" : "rgba(255,255,255,0.07)",
      color: active ? "#fff" : crit ? "#fca5a5" : "rgba(255,255,255,0.7)",
      border: `1px solid ${active ? "rgba(244,114,182,0.5)" : crit ? "rgba(239,68,68,0.45)" : "rgba(255,255,255,0.12)"}`,
    }}>{emoji} {label}</button>
  );
}
function btn(bg) {
  return { flex: 1, padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: bg, color: "#fff", fontWeight: 800, fontSize: 13, fontFamily: "inherit" };
}
