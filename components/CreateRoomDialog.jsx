"use client";

// Wiederverwendbarer Dialog zum Erstellen eines Gruppenchats.
// Verwendet in /messenger und im ChatOverlay.
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import Avatar from "./Avatar";
import { ColoredName } from "./GenderAge";

export default function CreateRoomDialog({ users, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("💬");
  const [picked, setPicked] = useState(() => new Set());
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() =>
    users
      .filter((u) =>
        u.displayName.toLowerCase().includes(filter.toLowerCase()) ||
        u.username.toLowerCase().includes(filter.toLowerCase()))
      .slice(0, 80),
    [users, filter]
  );

  function toggle(u) {
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(u.username)) next.delete(u.username);
      else if (next.size < 24) next.add(u.username);
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const res = await api.createRoom(name.trim(), emoji, Array.from(picked));
      onCreated(res.room);
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        style={{ background: "#fff", borderRadius: 14, maxWidth: 480, width: "100%", maxHeight: "86vh", overflow: "auto", padding: 16, fontFamily: "Arial, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2 style={{ margin: 0, flex: 1, fontSize: 18 }}>👯 Gruppenchat erstellen</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888" }}>×</button>
        </div>
        <p style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
          Bis zu 25 Mitglieder. Fidolin liest mit – sei nett.
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <input type="text" value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))} maxLength={4}
            className="vv-input" style={{ width: 60, fontSize: 20, textAlign: "center" }} />
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
            placeholder="Gruppenname (z.B. „Mathe-AG“)" className="vv-input" style={{ flex: 1 }} />
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>Mitglieder hinzufügen ({picked.size}/24):</div>
          <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Person suchen…"
            className="vv-input" style={{ width: "100%" }} />
          <div style={{ marginTop: 8, maxHeight: 240, overflow: "auto", border: "1px solid #eee", borderRadius: 8, padding: 6 }}>
            {filtered.map((u) => {
              const on = picked.has(u.username);
              return (
                <label key={u.username} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", cursor: "pointer", borderRadius: 6, background: on ? "#eef3fb" : "transparent" }}>
                  <input type="checkbox" checked={on} onChange={() => toggle(u)} />
                  <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>
                      <ColoredName gender={u.gender} age={u.age} name={u.displayName} />
                    </div>
                    <div className="vv-muted" style={{ fontSize: 11 }}>@{u.username}</div>
                  </div>
                </label>
              );
            })}
            {filtered.length === 0 && <div className="vv-muted" style={{ padding: 8 }}>Niemand gefunden.</div>}
          </div>
        </div>

        {error && <div style={{ marginTop: 10, color: "#c2185b", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} className="vv-btn">Abbrechen</button>
          <button type="submit" disabled={busy || !name.trim()} className="vv-btn vv-btn-pink">
            {busy ? "…" : "Erstellen"}
          </button>
        </div>
      </form>
    </div>
  );
}
