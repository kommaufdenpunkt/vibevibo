"use client";

// 🎀 Admin — Fidolin-Erinnerungs-Posts verwalten.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const CATEGORIES = [
  { id: "general", label: "Allgemein", emoji: "✨" },
  { id: "history", label: "Geschichte", emoji: "🧱" },
  { id: "sport",   label: "Sport",      emoji: "⚽" },
  { id: "tech",    label: "Tech",       emoji: "💾" },
  { id: "music",   label: "Musik",      emoji: "🎵" },
  { id: "tv",      label: "TV/Film",    emoji: "📺" },
  { id: "candy",   label: "Süßigkeiten", emoji: "🍫" },
  { id: "fashion", label: "Mode",       emoji: "👟" },
];

export default function FidolinMemoriesAdmin() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null);
  const [pw, setPw] = useState("");

  const refresh = useCallback(async () => {
    const p = pw || new URLSearchParams(window.location.search).get("pw") || "";
    if (!pw && p) setPw(p);
    const r = await fetch(`/api/admin/fidolin-memories?pw=${encodeURIComponent(p)}`);
    if (r.ok) setData(await r.json());
    else setData({ error: (await r.json()).error || "Auth-Fehler" });
  }, [pw]);

  useEffect(() => { refresh(); }, [refresh]);

  async function save(payload) {
    const r = await fetch(`/api/admin/fidolin-memories?pw=${encodeURIComponent(pw)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r.ok) { setData(await r.json()); setEditing(null); }
    else alert((await r.json()).error || "Fehler");
  }
  async function toggleActive(id, active) {
    await fetch(`/api/admin/fidolin-memories?id=${id}&pw=${encodeURIComponent(pw)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    refresh();
  }
  async function remove(id) {
    if (!confirm("Wirklich löschen?")) return;
    await fetch(`/api/admin/fidolin-memories?id=${id}&pw=${encodeURIComponent(pw)}`, { method: "DELETE" });
    refresh();
  }

  if (!data) return <div style={{ padding: 20 }}>Lädt…</div>;
  if (data.error) {
    return (
      <div style={{ padding: 20, maxWidth: 400, margin: "30px auto" }}>
        <h2>🎀 Fidolin-Memories Admin</h2>
        <div style={{ padding: 12, background: "#fef3c7", borderRadius: 8, fontSize: 13 }}>
          {data.error}. Setz `?pw=DEIN_ADMIN_PW` an die URL.
        </div>
      </div>
    );
  }

  const memories = data.memories || [];

  return (
    <div style={{ maxWidth: 920, margin: "20px auto", padding: 12 }}>
      <div style={{
        background: "linear-gradient(135deg, #fce7f3, #f5d0fe)",
        border: "3px ridge #ec4899", borderRadius: 14,
        padding: 18, marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 32 }}>🎀</span>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#831843" }}>Fidolin-Memories</h1>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#831843" }}>
              {memories.length} Erinnerungen · {memories.filter((m) => m.active).length} aktiv ·
              Cron postet täglich max. 1 Treffer pro Tag.
            </p>
          </div>
          <button onClick={() => setEditing({ active: 1, emoji: "📅", category: "general" })} style={{
            padding: "10px 16px", borderRadius: 10,
            background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
            border: "2px ridge #fff", fontWeight: 900, fontSize: 13, cursor: "pointer",
            fontFamily: "inherit",
          }}>+ Neu</button>
        </div>
      </div>

      {editing && (
        <EditModal
          entry={editing}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {memories.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "#94a3b8" }}>
            Noch keine Erinnerungen. Klick „+ Neu" oben.
          </div>
        ) : memories.map((m) => (
          <MemoryRow
            key={m.id}
            memory={m}
            onEdit={() => setEditing(m)}
            onToggle={() => toggleActive(m.id, !m.active)}
            onDelete={() => remove(m.id)}
          />
        ))}
      </div>

      <div style={{ marginTop: 20, textAlign: "center" }}>
        <Link href="/admin" style={{ color: "#475569", fontSize: 13, textDecoration: "none" }}>← Zurück zum Admin</Link>
      </div>
    </div>
  );
}

function MemoryRow({ memory, onEdit, onToggle, onDelete }) {
  const dateLabel = memory.month > 0
    ? (memory.day > 0
        ? `${String(memory.day).padStart(2, "0")}.${String(memory.month).padStart(2, "0")}.`
        : `${String(memory.month).padStart(2, "0")}. (ganzer Monat)`)
    : "(jederzeit)";
  return (
    <div style={{
      background: memory.active ? "rgba(255,255,255,0.95)" : "rgba(245,245,247,0.95)",
      borderRadius: 10, padding: 12,
      border: memory.active ? "1.5px solid rgba(236,72,153,0.3)" : "1.5px solid rgba(0,0,0,0.08)",
      opacity: memory.active ? 1 : 0.6,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{memory.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {memory.category} · 📅 {dateLabel}{memory.anniYear > 0 ? ` · ⏳ ${memory.anniYear}` : ""}
        </div>
        <div style={{ fontSize: 13, color: "#1c1c1e", marginTop: 2, lineHeight: 1.4 }}>
          {memory.content}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <button onClick={onToggle} title={memory.active ? "Deaktivieren" : "Aktivieren"} style={{
          padding: "4px 10px", borderRadius: 8, fontSize: 11,
          background: memory.active ? "rgba(34,197,94,0.15)" : "rgba(148,163,184,0.15)",
          color: memory.active ? "#15803d" : "#64748b",
          border: "1px solid currentColor", cursor: "pointer", fontWeight: 700, fontFamily: "inherit",
        }}>{memory.active ? "✓ Aktiv" : "○ Aus"}</button>
        <button onClick={onEdit} style={{
          padding: "4px 10px", borderRadius: 8, fontSize: 11,
          background: "rgba(99,102,241,0.12)", color: "#3730a3",
          border: "1px solid rgba(99,102,241,0.3)", cursor: "pointer", fontWeight: 700, fontFamily: "inherit",
        }}>✎ Edit</button>
        <button onClick={onDelete} style={{
          padding: "4px 10px", borderRadius: 8, fontSize: 11,
          background: "rgba(239,68,68,0.12)", color: "#b91c1c",
          border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontWeight: 700, fontFamily: "inherit",
        }}>🗑</button>
      </div>
    </div>
  );
}

function EditModal({ entry, onCancel, onSave }) {
  const [form, setForm] = useState({
    id: entry.id || null,
    month: entry.month || 0,
    day: entry.day || 0,
    anniYear: entry.anniYear || 0,
    category: entry.category || "general",
    emoji: entry.emoji || "📅",
    content: entry.content || "",
    active: entry.active !== false,
  });
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!form.content.trim()) return alert("Content fehlt");
    setBusy(true);
    try { await onSave(form); }
    finally { setBusy(false); }
  }

  return (
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", padding: 22, borderRadius: 14, maxWidth: 540, width: "100%",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 900 }}>
          {entry.id ? "🎀 Erinnerung bearbeiten" : "🎀 Neue Erinnerung"}
        </h3>

        <Label>{'Inhalt (Pflicht — {years} wird durch Jahre ersetzt)'}</Label>
        <textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={4}
          maxLength={500}
          placeholder="Heute vor {years} Jahren ist die Mauer gefallen 🧱"
          style={inputStyle}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
          <div>
            <Label>Monat (1-12, 0=egal)</Label>
            <input type="number" min={0} max={12} value={form.month}
              onChange={(e) => setForm({ ...form, month: Number(e.target.value) })} style={inputStyle} />
          </div>
          <div>
            <Label>Tag (1-31, 0=egal)</Label>
            <input type="number" min={0} max={31} value={form.day}
              onChange={(e) => setForm({ ...form, day: Number(e.target.value) })} style={inputStyle} />
          </div>
          <div>
            <Label>Jahrestag (0=aus)</Label>
            <input type="number" min={0} max={2100} value={form.anniYear}
              onChange={(e) => setForm({ ...form, anniYear: Number(e.target.value) })} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8, marginTop: 10 }}>
          <div>
            <Label>Kategorie</Label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Emoji</Label>
            <input value={form.emoji} maxLength={4}
              onChange={(e) => setForm({ ...form, emoji: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13 }}>
          <input type="checkbox" checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          <span>Aktiv (Cron postet sie)</span>
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onCancel} disabled={busy} style={{
            flex: 1, padding: 12, borderRadius: 10, background: "#f5f5f7", color: "#475569",
            border: "1px solid #e5e5e7", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>Abbrechen</button>
          <button onClick={submit} disabled={busy || !form.content.trim()} style={{
            flex: 2, padding: 12, borderRadius: 10,
            background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
            border: "none", fontWeight: 900, cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
          }}>{busy ? "⏳…" : "Speichern"}</button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: 10, borderRadius: 8,
  border: "1.5px solid #cbd5e1", fontSize: 13, fontFamily: "inherit",
  boxSizing: "border-box",
};

function Label({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: "#475569", letterSpacing: 0.3, marginBottom: 3, textTransform: "uppercase" }}>{children}</div>;
}
