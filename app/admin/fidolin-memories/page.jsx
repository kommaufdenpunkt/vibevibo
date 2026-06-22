"use client";

// 🎀 Admin — Fidolin-Erinnerungs-Posts verwalten (v2).
//
// v2: + Seed-Now Button (für leere Tabelle), + Jetzt-Posten pro Eintrag,
//     + Heute-fällig Banner oben, + Kategorie-Filter, + Cron-Setup-Doku inline.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const CATEGORIES = [
  { id: "all",     label: "Alle",       emoji: "✨" },
  { id: "general", label: "Allgemein",  emoji: "🌸" },
  { id: "history", label: "Geschichte", emoji: "🧱" },
  { id: "sport",   label: "Sport",      emoji: "⚽" },
  { id: "tech",    label: "Tech",       emoji: "💾" },
  { id: "music",   label: "Musik",      emoji: "🎵" },
  { id: "tv",      label: "TV/Film",    emoji: "📺" },
  { id: "candy",   label: "Süßes",      emoji: "🍫" },
  { id: "fashion", label: "Mode",       emoji: "👟" },
];

export default function FidolinMemoriesAdmin() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null);
  const [pw, setPw] = useState("");
  const [filter, setFilter] = useState("all");
  const [showCronHelp, setShowCronHelp] = useState(false);
  const [busy, setBusy] = useState("");

  const refresh = useCallback(async () => {
    const p = pw || (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("pw") || ""
      : "");
    if (!pw && p) setPw(p);
    const r = await fetch(`/api/admin/fidolin-memories?pw=${encodeURIComponent(p)}`);
    if (r.ok) setData(await r.json());
    else setData({ error: (await r.json().catch(() => ({}))).error || "Auth-Fehler" });
  }, [pw]);

  useEffect(() => { refresh(); }, [refresh]);

  async function save(payload) {
    const r = await fetch(`/api/admin/fidolin-memories?pw=${encodeURIComponent(pw)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r.ok) { setData(await r.json()); setEditing(null); }
    else alert((await r.json().catch(() => ({}))).error || "Fehler");
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

  async function seedNow() {
    if (!confirm("28 Standard-Erinnerungen importieren?\n\n(Mauerfall, ICQ-Sound, Sommermärchen 2006, Tamagotchi, Pokémon, Lindenstraße, GZSZ, Negro-Kuss, Buffalo-Schuhe etc.)\n\nWird nur ausgeführt wenn die Tabelle leer ist.")) return;
    setBusy("seed");
    try {
      const r = await fetch(`/api/admin/fidolin-memories?action=seed&pw=${encodeURIComponent(pw)}`, { method: "POST" });
      const j = await r.json();
      if (j.seeded > 0) alert(`✓ ${j.seeded} Standard-Erinnerungen importiert.`);
      else alert("Nichts importiert — Tabelle war nicht leer.");
      setData(j);
    } finally { setBusy(""); }
  }

  async function postNow(id, preview) {
    if (!confirm(`Jetzt sofort posten?\n\n"${preview.slice(0, 200)}${preview.length > 200 ? "…" : ""}"`)) return;
    setBusy(`post-${id}`);
    try {
      const r = await fetch(`/api/admin/fidolin-memories?action=post&id=${id}&pw=${encodeURIComponent(pw)}`, { method: "POST" });
      const j = await r.json();
      if (j.ok) alert(`✓ Gepostet!\n\n"${(j.text || preview).slice(0, 300)}"`);
      else alert(`Fehler: ${j.error || "unbekannt"}`);
      setData(j);
    } finally { setBusy(""); }
  }

  if (!data) return <div style={{ padding: 20 }}>Lädt…</div>;
  if (data.error) {
    return (
      <div style={{ padding: 20, maxWidth: 400, margin: "30px auto" }}>
        <h2>🎀 Fidolin-Memories Admin</h2>
        <div style={{ padding: 12, background: "#fef3c7", borderRadius: 8, fontSize: 13 }}>
          {data.error}. Setz <code>?pw=DEIN_ADMIN_PW</code> an die URL.
        </div>
      </div>
    );
  }

  const memories = data.memories || [];
  const due = data.due || [];
  const activeCount = memories.filter((m) => m.active).length;
  const filtered = filter === "all" ? memories : memories.filter((m) => m.category === filter);

  return (
    <div style={{ maxWidth: 920, margin: "20px auto", padding: 12 }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #fce7f3, #f5d0fe)",
        border: "3px ridge #ec4899", borderRadius: 14,
        padding: 18, marginBottom: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 32 }}>🎀</span>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#831843" }}>Fidolin-Memories</h1>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#831843" }}>
              {memories.length} Erinnerungen · {activeCount} aktiv · {due.length} heute fällig · Cron postet max. 1/Tag.
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

      {/* Heute-fällig Banner */}
      {due.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #fef9c3, #fde68a)",
          border: "2px solid #f59e0b", borderRadius: 12,
          padding: 12, marginBottom: 12,
        }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#78350f", marginBottom: 6 }}>
            ⏰ Heute fällig ({due.length}) — Cron postet automatisch nur den ersten.
          </div>
          {due.map((m, i) => (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 8px", borderRadius: 8,
              background: i === 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
              marginBottom: 4, borderLeft: i === 0 ? "3px solid #16a34a" : "3px solid #d4d4d8",
            }}>
              <span style={{ fontSize: 18 }}>{m.emoji}</span>
              <div style={{ flex: 1, fontSize: 12, color: "#1c1917" }}>
                {i === 0 && <strong style={{ color: "#15803d" }}>NÄCHSTER · </strong>}
                {m.content.slice(0, 110)}{m.content.length > 110 ? "…" : ""}
              </div>
              <button
                onClick={() => postNow(m.id, m.content)}
                disabled={busy === `post-${m.id}`}
                style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 11,
                  background: "linear-gradient(135deg, #16a34a, #059669)", color: "#fff",
                  border: "none", cursor: "pointer", fontWeight: 800, fontFamily: "inherit",
                }}
              >{busy === `post-${m.id}` ? "⏳" : "🚀 Jetzt"}</button>
            </div>
          ))}
        </div>
      )}

      {/* Empty-State: Seed-Banner */}
      {memories.length === 0 && (
        <div style={{
          background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
          border: "2px dashed #3b82f6", borderRadius: 12,
          padding: 18, marginBottom: 12, textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🌱</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1e3a8a", marginBottom: 4 }}>
            Noch keine Erinnerungen.
          </div>
          <div style={{ fontSize: 12, color: "#1e40af", marginBottom: 14, lineHeight: 1.5 }}>
            Importier den Standard-Katalog (28 Einträge — Mauerfall, Sommermärchen, ICQ, Pokémon, Lindenstraße, Buffalo-Schuhe…)<br/>
            oder klick „+ Neu" oben und leg eigene Einträge an.
          </div>
          <button
            onClick={seedNow}
            disabled={busy === "seed"}
            style={{
              padding: "10px 20px", borderRadius: 10,
              background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff",
              border: "2px ridge #fff", fontWeight: 900, fontSize: 13,
              cursor: busy === "seed" ? "wait" : "pointer",
              fontFamily: "inherit",
            }}
          >{busy === "seed" ? "⏳ Importiere…" : "🌱 Standard-Katalog importieren"}</button>
        </div>
      )}

      {/* Kategorie-Filter */}
      {memories.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10,
          padding: 8, background: "rgba(255,255,255,0.6)", borderRadius: 10,
        }}>
          {CATEGORIES.map((c) => {
            const count = c.id === "all" ? memories.length : memories.filter((m) => m.category === c.id).length;
            const active = filter === c.id;
            if (c.id !== "all" && count === 0) return null;
            return (
              <button key={c.id} onClick={() => setFilter(c.id)} style={{
                padding: "5px 10px", borderRadius: 16, fontSize: 11,
                background: active ? "linear-gradient(135deg, #ec4899, #a855f7)" : "rgba(255,255,255,0.8)",
                color: active ? "#fff" : "#475569",
                border: active ? "1.5px ridge #fff" : "1.5px solid #cbd5e1",
                cursor: "pointer", fontWeight: 800, fontFamily: "inherit",
              }}>{c.emoji} {c.label} ({count})</button>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editing && <EditModal entry={editing} onCancel={() => setEditing(null)} onSave={save} />}

      {/* Liste */}
      <div style={{ display: "grid", gap: 8 }}>
        {filtered.length === 0 && memories.length > 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            Keine Einträge in dieser Kategorie.
          </div>
        ) : filtered.map((m) => (
          <MemoryRow
            key={m.id}
            memory={m}
            busy={busy === `post-${m.id}`}
            onEdit={() => setEditing(m)}
            onToggle={() => toggleActive(m.id, !m.active)}
            onDelete={() => remove(m.id)}
            onPost={() => postNow(m.id, m.content)}
          />
        ))}
      </div>

      {/* Cron Help */}
      <div style={{ marginTop: 22 }}>
        <button onClick={() => setShowCronHelp(!showCronHelp)} style={{
          padding: "8px 12px", borderRadius: 8, fontSize: 12,
          background: "rgba(99,102,241,0.1)", color: "#3730a3",
          border: "1px solid rgba(99,102,241,0.3)",
          cursor: "pointer", fontWeight: 800, fontFamily: "inherit",
        }}>{showCronHelp ? "▼" : "▶"} ⏰ Coolify-Cron-Setup anzeigen</button>
        {showCronHelp && (
          <div style={{
            marginTop: 8, padding: 14, background: "rgba(255,255,255,0.9)",
            borderRadius: 10, border: "1px solid #e5e5e7", fontSize: 12, lineHeight: 1.6,
            color: "#1c1c1e",
          }}>
            <strong style={{ fontSize: 13 }}>So richtest du den Auto-Posting-Cron in Coolify ein:</strong>
            <ol style={{ paddingLeft: 20, marginTop: 8, marginBottom: 8 }}>
              <li>Coolify → dein Projekt → <strong>Scheduled Tasks</strong></li>
              <li>+ Add new task</li>
              <li><strong>Name:</strong> Fidolin Memories</li>
              <li><strong>Schedule:</strong> <code style={codeStyle}>0 9 * * *</code> (täglich 09:00) oder <code style={codeStyle}>0 * * * *</code> (jede volle Stunde)</li>
              <li><strong>Command:</strong><br/><code style={{ ...codeStyle, display: "inline-block", marginTop: 4, padding: "4px 8px", whiteSpace: "pre-wrap", maxWidth: "100%" }}>curl -s -H "x-cron-secret: $CRON_SECRET" https://vibevibo.de/api/cron/fidolin-memories</code></li>
              <li>Speichern → „Run now"-Knopf zum Testen</li>
            </ol>
            <p style={{ margin: "8px 0 4px" }}>
              💡 Der Endpoint postet automatisch <strong>max. 1 Erinnerung pro Tag</strong> — häufiger ansteuern ist trotzdem ok (dedupliziert intern via <code style={codeStyle}>last_posted_at</code>).
            </p>
            <p style={{ margin: 0 }}>
              💡 Env-Var <code style={codeStyle}>CRON_SECRET</code> muss auf Coolify gesetzt sein. Sollte schon da sein (wird auch von <code style={codeStyle}>/api/cron/finalize-deletions</code> genutzt).
            </p>
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, textAlign: "center" }}>
        <Link href="/admin" style={{ color: "#475569", fontSize: 13, textDecoration: "none" }}>← Zurück zum Admin</Link>
      </div>
    </div>
  );
}

function MemoryRow({ memory, busy, onEdit, onToggle, onDelete, onPost }) {
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
        <button onClick={onPost} disabled={busy || !memory.active}
          title={memory.active ? "Jetzt manuell posten" : "Erst aktivieren"}
          style={{
            padding: "4px 10px", borderRadius: 8, fontSize: 11,
            background: memory.active ? "linear-gradient(135deg, #16a34a, #059669)" : "rgba(0,0,0,0.05)",
            color: memory.active ? "#fff" : "#94a3b8",
            border: memory.active ? "1.5px ridge #fff" : "1px solid #e5e5e7",
            cursor: memory.active ? (busy ? "wait" : "pointer") : "not-allowed",
            fontWeight: 800, fontFamily: "inherit",
          }}>{busy ? "⏳" : "🚀"}</button>
        <button onClick={onToggle} title={memory.active ? "Deaktivieren" : "Aktivieren"} style={{
          padding: "4px 10px", borderRadius: 8, fontSize: 11,
          background: memory.active ? "rgba(34,197,94,0.15)" : "rgba(148,163,184,0.15)",
          color: memory.active ? "#15803d" : "#64748b",
          border: "1px solid currentColor", cursor: "pointer", fontWeight: 700, fontFamily: "inherit",
        }}>{memory.active ? "✓" : "○"}</button>
        <button onClick={onEdit} title="Bearbeiten" style={{
          padding: "4px 10px", borderRadius: 8, fontSize: 11,
          background: "rgba(99,102,241,0.12)", color: "#3730a3",
          border: "1px solid rgba(99,102,241,0.3)", cursor: "pointer", fontWeight: 700, fontFamily: "inherit",
        }}>✎</button>
        <button onClick={onDelete} title="Löschen" style={{
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

        <Label>{'Inhalt (Pflicht — {years} wird durch die Jahre ab Jahrestag ersetzt)'}</Label>
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
              {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
              ))}
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
            border: "none", fontWeight: 900,
            cursor: busy ? "wait" : (form.content.trim() ? "pointer" : "not-allowed"),
            fontFamily: "inherit",
          }}>{busy ? "⏳…" : "Speichern"}</button>
        </div>
      </div>
    </div>
  );
}

const codeStyle = {
  background: "#f1f5f9", padding: "1px 6px", borderRadius: 4,
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 11,
  color: "#334155",
};

const inputStyle = {
  width: "100%", padding: 10, borderRadius: 8,
  border: "1.5px solid #cbd5e1", fontSize: 13, fontFamily: "inherit",
  boxSizing: "border-box",
};

function Label({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: "#475569", letterSpacing: 0.3, marginBottom: 3, textTransform: "uppercase" }}>{children}</div>;
}
