"use client";

// 📊 Live-Polls für Coms. Nur sichtbar wenn Feature freigeschaltet.
// Members können Polls erstellen + voten, Author/Owner können schließen + löschen.

import { useCallback, useEffect, useState } from "react";

export default function ComPolls({ slug, isMember, isOwner, themeColor = "#ec4899" }) {
  const [polls, setPolls] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setErr("");
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/polls`, { credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setPolls(d.polls || []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function vote(pollId, idx) {
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/polls/${pollId}/vote`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIdx: idx }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setPolls((prev) => prev.map((p) => p.id === pollId ? d.poll : p));
    } catch (e) { setMsg({ ok: false, text: e.message }); setTimeout(() => setMsg(null), 3000); }
  }

  async function closePoll(pollId) {
    if (!confirm("Umfrage schließen? Es kann dann nicht mehr abgestimmt werden.")) return;
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/polls/${pollId}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setPolls((prev) => prev.map((p) => p.id === pollId ? d.poll : p));
    } catch (e) { setMsg({ ok: false, text: e.message }); setTimeout(() => setMsg(null), 3000); }
  }

  async function removePoll(pollId) {
    if (!confirm("Umfrage komplett löschen? Stimmen gehen verloren.")) return;
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/polls/${pollId}`, {
        method: "DELETE", credentials: "include",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setPolls((prev) => prev.filter((p) => p.id !== pollId));
    } catch (e) { setMsg({ ok: false, text: e.message }); setTimeout(() => setMsg(null), 3000); }
  }

  if (loading) return null;
  if (err) return (
    <div style={{ padding: 10, background: "#fee2e2", color: "#991b1b", borderRadius: 10, fontSize: 13, marginBottom: 10 }}>⚠ {err}</div>
  );

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
        padding: "0 4px",
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
          📊 Umfragen {polls.length > 0 && `(${polls.length})`}
        </span>
        {isMember && !showCreate && (
          <button onClick={() => setShowCreate(true)} style={{
            marginLeft: "auto", padding: "6px 12px", borderRadius: 999,
            border: "none", background: themeColor, color: "#fff",
            fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>+ Neue Umfrage</button>
        )}
      </div>

      {msg && (
        <div style={{
          padding: 8, borderRadius: 8, marginBottom: 8, fontWeight: 700, fontSize: 13,
          background: msg.ok ? "#dcfce7" : "#fee2e2",
          color: msg.ok ? "#166534" : "#991b1b",
        }}>{msg.text}</div>
      )}

      {showCreate && (
        <PollCreator
          slug={slug} themeColor={themeColor}
          onCancel={() => setShowCreate(false)}
          onCreated={(poll) => {
            setPolls((prev) => [poll, ...prev]);
            setShowCreate(false);
            setMsg({ ok: true, text: "✓ Umfrage erstellt" });
            setTimeout(() => setMsg(null), 3000);
          }}
          onError={(e) => { setMsg({ ok: false, text: e }); setTimeout(() => setMsg(null), 4000); }}
        />
      )}

      {polls.map((p) => (
        <PollCard key={p.id} poll={p} themeColor={themeColor}
          isMember={isMember} isOwner={isOwner}
          onVote={(idx) => vote(p.id, idx)}
          onClose={() => closePoll(p.id)}
          onDelete={() => removePoll(p.id)}
        />
      ))}
    </div>
  );
}

function PollCreator({ slug, themeColor, onCancel, onCreated, onError }) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const [multi, setMulti] = useState(false);
  const [duration, setDuration] = useState(24); // Stunden, 0 = unbegrenzt
  const [busy, setBusy] = useState(false);

  function updateOpt(i, v) {
    setOpts((prev) => prev.map((x, idx) => idx === i ? v : x));
  }
  function addOpt() { if (opts.length < 6) setOpts((p) => [...p, ""]); }
  function removeOpt(i) { setOpts((p) => p.filter((_, idx) => idx !== i)); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/polls`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          options: opts.map((o) => o.trim()).filter(Boolean),
          multi,
          durationHours: duration,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      onCreated(d.poll);
    } catch (e) { onError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} style={{
      background: "rgba(255,255,255,0.96)", borderRadius: 12,
      padding: 12, marginBottom: 10, border: `2px solid ${themeColor}55`,
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 6 }}>
        FRAGE
      </div>
      <input className="vv-input" value={q} onChange={(e) => setQ(e.target.value)}
        maxLength={200} placeholder="z.B. Welcher Film für die Watch-Party?"
        style={{ width: "100%", boxSizing: "border-box", marginBottom: 10 }} />

      <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 6 }}>
        ANTWORT-OPTIONEN ({opts.length}/6)
      </div>
      {opts.map((o, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input className="vv-input" value={o} maxLength={100}
            onChange={(e) => updateOpt(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            style={{ flex: 1 }} />
          {opts.length > 2 && (
            <button type="button" onClick={() => removeOpt(i)} style={{
              padding: "0 10px", borderRadius: 8, border: "1px solid #fecaca",
              background: "#fef2f2", color: "#b91c1c", cursor: "pointer", fontWeight: 700,
            }}>✕</button>
          )}
        </div>
      ))}
      {opts.length < 6 && (
        <button type="button" onClick={addOpt} style={{
          padding: "6px 10px", borderRadius: 8, border: "1px dashed #cbd5e1",
          background: "transparent", color: "#64748b", fontWeight: 700, fontSize: 12,
          cursor: "pointer", marginBottom: 10,
        }}>+ Option hinzufügen</button>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <label style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
          Mehrfach-Auswahl erlauben
        </label>
        <label style={{ fontSize: 12, color: "#475569", marginLeft: "auto" }}>
          Läuft:
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}
            style={{ marginLeft: 6, padding: "4px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}>
            <option value={1}>1 Stunde</option>
            <option value={6}>6 Stunden</option>
            <option value={24}>1 Tag</option>
            <option value={168}>1 Woche</option>
            <option value={0}>unbegrenzt</option>
          </select>
        </label>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={onCancel} className="vv-btn" style={{ flex: 1 }}>Abbrechen</button>
        <button type="submit" disabled={busy} className="vv-btn-big vv-btn-big-pink"
          style={{ flex: 2, padding: 10, fontSize: 14 }}>
          {busy ? "Speichere…" : "📊 Umfrage erstellen"}
        </button>
      </div>
    </form>
  );
}

function PollCard({ poll, themeColor, isMember, isOwner, onVote, onClose, onDelete }) {
  const isAuthor = poll.myVotes !== undefined; // can't tell from here; we just allow buttons via API check
  const total = poll.totalVotes || 0;
  const isClosed = poll.closed || (poll.endsAt && poll.endsAt < Date.now());
  const myVotesSet = new Set(poll.myVotes || []);

  return (
    <div style={{
      background: "rgba(255,255,255,0.96)", borderRadius: 12,
      padding: 12, marginBottom: 8, border: `2px solid ${themeColor}33`,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "start", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{poll.authorEmoji || "👤"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            @{poll.authorUsername} · {fmtTime(poll.createdAt)}
            {poll.multi && <> · 🔢 Mehrfachauswahl</>}
            {isClosed && <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 6, background: "#e2e8f0", color: "#475569", fontWeight: 700 }}>GESCHLOSSEN</span>}
            {!isClosed && poll.endsAt && <> · endet {fmtRelTime(poll.endsAt)}</>}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", marginTop: 2 }}>
            {poll.question}
          </div>
        </div>
        {(isOwner) && (
          <details style={{ position: "relative" }}>
            <summary style={{ cursor: "pointer", listStyle: "none", padding: 4, color: "#64748b", fontSize: 16 }}>⋯</summary>
            <div style={{
              position: "absolute", right: 0, top: "100%", marginTop: 4,
              background: "#fff", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              padding: 4, zIndex: 10, minWidth: 140,
            }}>
              {!isClosed && (
                <button onClick={onClose} style={menuItem}>🔒 Schließen</button>
              )}
              <button onClick={onDelete} style={{ ...menuItem, color: "#b91c1c" }}>🗑 Löschen</button>
            </div>
          </details>
        )}
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(poll.options || []).map((o) => {
          const pct = total > 0 ? Math.round((o.count / total) * 100) : 0;
          const mine = myVotesSet.has(o.idx);
          return (
            <button key={o.idx}
              disabled={!isMember || isClosed}
              onClick={() => onVote(o.idx)}
              title={isClosed ? "Umfrage geschlossen" : !isMember ? "Tritt der Com bei zum Voten" : ""}
              style={{
                position: "relative", padding: "10px 12px", borderRadius: 10,
                border: `2px solid ${mine ? themeColor : "rgba(0,0,0,0.08)"}`,
                background: "#f8fafc",
                cursor: isMember && !isClosed ? "pointer" : "default",
                textAlign: "left", fontFamily: "inherit",
                overflow: "hidden",
              }}>
              {/* Fortschrittsbalken */}
              <div style={{
                position: "absolute", inset: 0,
                width: `${pct}%`,
                background: mine ? `${themeColor}33` : "rgba(0,0,0,0.04)",
                transition: "width 0.4s ease",
                zIndex: 0,
              }} />
              <div style={{
                position: "relative", zIndex: 1,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ flex: 1, fontWeight: 600, color: "#1f2937" }}>
                  {mine && "✓ "}{o.text}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                  {o.count} · {pct}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8" }}>
        {total} Stimme{total === 1 ? "" : "n"}
      </div>
    </div>
  );
}

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function fmtRelTime(ts) {
  const delta = ts - Date.now();
  if (delta <= 0) return "abgelaufen";
  const mins = Math.floor(delta / 60000);
  if (mins < 60) return `in ${mins} Min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours} h`;
  const days = Math.floor(hours / 24);
  return `in ${days} Tag${days === 1 ? "" : "en"}`;
}

const menuItem = {
  display: "block", width: "100%", padding: "8px 12px",
  background: "none", border: "none", textAlign: "left",
  cursor: "pointer", fontSize: 13, color: "#1f2937",
  fontFamily: "inherit",
};
