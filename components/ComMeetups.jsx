"use client";

// 🤝 Meetup-Planer für Coms — echte Treffen mit Ort/Datum/RSVP (Ja/Nein/Vielleicht).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export default function ComMeetups({ slug, isMember, isOwner, themeColor = "#ec4899" }) {
  const [meetups, setMeetups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/meetups`, { credentials: "include" });
      const d = await r.json();
      if (r.ok) setMeetups(d.meetups || []);
    } catch {}
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  function flash(ok, text) {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3500);
  }

  async function rsvp(meetupId, status) {
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/meetups/${meetupId}/rsvp`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setMeetups((prev) => prev.map((m) => m.id === meetupId ? d.meetup : m));
    } catch (e) { flash(false, e.message); }
  }

  async function cancelMeetup(meetupId) {
    if (!confirm("Meetup wirklich absagen? Alle Mitglieder sehen das dann.")) return;
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/meetups/${meetupId}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setMeetups((prev) => prev.map((m) => m.id === meetupId ? d.meetup : m));
    } catch (e) { flash(false, e.message); }
  }

  async function deleteMeetup(meetupId) {
    if (!confirm("Meetup komplett löschen?")) return;
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/meetups/${meetupId}`, {
        method: "DELETE", credentials: "include",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setMeetups((prev) => prev.filter((m) => m.id !== meetupId));
    } catch (e) { flash(false, e.message); }
  }

  if (loading) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
        padding: "0 4px",
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
          🤝 Meetups {meetups.length > 0 && `(${meetups.length})`}
        </span>
        {isMember && !showCreate && (
          <button onClick={() => setShowCreate(true)} style={{
            marginLeft: "auto", padding: "6px 12px", borderRadius: 999,
            border: "none", background: themeColor, color: "#fff",
            fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>+ Treffen planen</button>
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
        <MeetupCreator
          slug={slug} themeColor={themeColor}
          onCancel={() => setShowCreate(false)}
          onCreated={(meetup) => {
            setMeetups((prev) => [meetup, ...prev]);
            setShowCreate(false);
            flash(true, "✓ Meetup erstellt!");
          }}
          onError={(e) => flash(false, e)}
        />
      )}

      {meetups.map((m) => (
        <MeetupCard key={m.id} meetup={m} themeColor={themeColor}
          isMember={isMember}
          canModerate={isOwner}
          onRsvp={(status) => rsvp(m.id, status)}
          onCancel={() => cancelMeetup(m.id)}
          onDelete={() => deleteMeetup(m.id)}
        />
      ))}
    </div>
  );
}

function MeetupCard({ meetup, themeColor, isMember, canModerate, onRsvp, onCancel, onDelete }) {
  const past = meetup.startsAt < Date.now() - 6 * 3600 * 1000;
  const m = meetup;
  const yourTag = m.myRsvp === "yes" ? "✅ Du bist dabei" : m.myRsvp === "maybe" ? "🤔 Du: Vielleicht" : m.myRsvp === "no" ? "🚫 Du: Abgesagt" : null;

  return (
    <div style={{
      background: m.cancelled ? "rgba(254,226,226,0.92)" : past ? "rgba(241,245,249,0.96)" : "rgba(255,255,255,0.96)",
      borderRadius: 12, padding: 12, marginBottom: 8,
      border: `2px solid ${m.cancelled ? "#fca5a5" : past ? "rgba(0,0,0,0.06)" : `${themeColor}33`}`,
      opacity: past ? 0.75 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "start", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 26 }}>🤝</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <b style={{ fontSize: 15, color: "#1f2937" }}>{m.title}</b>
            {m.cancelled && <span style={badgeCancelled}>ABGESAGT</span>}
            {past && !m.cancelled && <span style={badgePast}>vergangen</span>}
            {yourTag && <span style={{
              padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800,
              background: "#fef3c7", color: "#92400e",
            }}>{yourTag}</span>}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            von <Link href={`/u/${m.hostUsername}`} style={{ color: "#475569" }}>@{m.hostUsername}</Link>
          </div>
        </div>
        {canModerate && (
          <details style={{ position: "relative" }}>
            <summary style={{ cursor: "pointer", listStyle: "none", padding: 4, color: "#64748b", fontSize: 16 }}>⋯</summary>
            <div style={{
              position: "absolute", right: 0, top: "100%", marginTop: 4,
              background: "#fff", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              padding: 4, zIndex: 10, minWidth: 140,
            }}>
              {!m.cancelled && !past && (
                <button onClick={onCancel} style={menuItem}>🚫 Absagen</button>
              )}
              <button onClick={onDelete} style={{ ...menuItem, color: "#b91c1c" }}>🗑 Löschen</button>
            </div>
          </details>
        )}
      </div>

      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#475569",
        background: "#f8fafc", padding: 8, borderRadius: 8, marginBottom: 8,
      }}>
        <div>📅 <b>{fmtDate(m.startsAt)}</b></div>
        <div>⏰ {fmtTime(m.startsAt)}{m.endsAt ? ` – ${fmtTime(m.endsAt)}` : ""}</div>
        <div>📍 {m.location}</div>
        {m.maxAttendees > 0 && (
          <div>👥 max {m.maxAttendees}</div>
        )}
      </div>

      {m.description && (
        <div style={{
          fontSize: 13, color: "#475569", lineHeight: 1.4,
          whiteSpace: "pre-wrap", marginBottom: 10,
        }}>
          {m.description}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#64748b", marginRight: 6 }}>
          ✅ {m.rsvpCounts.yes} · 🤔 {m.rsvpCounts.maybe} · 🚫 {m.rsvpCounts.no}
        </span>
        {isMember && !m.cancelled && !past && (
          <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
            <RsvpBtn active={m.myRsvp === "yes"} color="#16a34a" onClick={() => onRsvp(m.myRsvp === "yes" ? "none" : "yes")}>✅ Zusagen</RsvpBtn>
            <RsvpBtn active={m.myRsvp === "maybe"} color="#f59e0b" onClick={() => onRsvp(m.myRsvp === "maybe" ? "none" : "maybe")}>🤔 Vielleicht</RsvpBtn>
            <RsvpBtn active={m.myRsvp === "no"} color="#64748b" onClick={() => onRsvp(m.myRsvp === "no" ? "none" : "no")}>🚫 Absagen</RsvpBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function RsvpBtn({ active, color, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 10px", borderRadius: 8, cursor: "pointer",
      border: `2px solid ${active ? color : "rgba(0,0,0,0.1)"}`,
      background: active ? color : "#fff",
      color: active ? "#fff" : "#475569",
      fontFamily: "inherit", fontWeight: 700, fontSize: 11,
    }}>{children}</button>
  );
}

function MeetupCreator({ slug, themeColor, onCancel, onCreated, onError }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxAttendees, setMaxAttendees] = useState(0);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!date || !time) { onError("Datum und Uhrzeit fehlen."); return; }
    const startsAt = new Date(`${date}T${time}`).getTime();
    const endsAt = endTime ? new Date(`${date}T${endTime}`).getTime() : null;
    setBusy(true);
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(slug)}/meetups`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, location, startsAt, endsAt, maxAttendees: Number(maxAttendees) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      onCreated(d.meetup);
    } catch (e) { onError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} style={{
      background: "rgba(255,255,255,0.96)", borderRadius: 12,
      padding: 12, marginBottom: 10, border: `2px solid ${themeColor}55`,
    }}>
      <FieldLabel>TITEL</FieldLabel>
      <input className="vv-input" value={title} onChange={(e) => setTitle(e.target.value)}
        maxLength={160} placeholder="z.B. Sommerfest im Park"
        style={{ width: "100%", boxSizing: "border-box", marginBottom: 10 }} />

      <FieldLabel>BESCHREIBUNG (optional)</FieldLabel>
      <textarea className="vv-input" value={description} onChange={(e) => setDescription(e.target.value)}
        maxLength={2000} placeholder="Was machen wir? Was solltest du mitbringen?"
        rows={3} style={{ width: "100%", boxSizing: "border-box", marginBottom: 10, resize: "vertical" }} />

      <FieldLabel>TREFFPUNKT</FieldLabel>
      <input className="vv-input" value={location} onChange={(e) => setLocation(e.target.value)}
        maxLength={240} placeholder="z.B. Englischer Garten, München — am Monopteros"
        style={{ width: "100%", boxSizing: "border-box", marginBottom: 10 }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div>
          <FieldLabel>DATUM</FieldLabel>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            style={inputStyle} />
        </div>
        <div>
          <FieldLabel>VON</FieldLabel>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <FieldLabel>BIS (optional)</FieldLabel>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <FieldLabel>MAX TEILNEHMER (0 = unbegrenzt)</FieldLabel>
      <input type="number" min={0} max={500} value={maxAttendees}
        onChange={(e) => setMaxAttendees(e.target.value)}
        style={{ ...inputStyle, marginBottom: 10 }} />

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={onCancel} className="vv-btn" style={{ flex: 1 }}>Abbrechen</button>
        <button type="submit" disabled={busy} className="vv-btn-big vv-btn-big-pink"
          style={{ flex: 2, padding: 10, fontSize: 14 }}>
          {busy ? "Speichere…" : "🤝 Meetup planen"}
        </button>
      </div>
    </form>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 4 }}>{children}</div>;
}

const inputStyle = {
  width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
  border: "1px solid rgba(0,0,0,0.12)", background: "#fff",
  fontFamily: "inherit", boxSizing: "border-box",
};

const badgeCancelled = { fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#fca5a5", color: "#7f1d1d", fontWeight: 800 };
const badgePast = { fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#e2e8f0", color: "#475569", fontWeight: 800 };
const menuItem = { display: "block", width: "100%", padding: "8px 12px", background: "none", border: "none", textAlign: "left", cursor: "pointer", fontSize: 13, color: "#1f2937", fontFamily: "inherit" };

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
