"use client";

// 🎁 Geschenke-Sammlungen Admin-UI
//
// Listet alle Collections, erlaubt Anlegen/Bearbeiten/Soft-Delete + Item-Picker
// aus den verfügbaren Custom-Gifts. Lädt selbst über /api/admin/gift-collections?pw=...

import { useEffect, useState } from "react";

const EMPTY_FORM = {
  id: null, code: "", name: "", description: "",
  edition: "", season: "", icon: "🎁",
  premiumOnly: 0, sortOrder: 0, active: 1,
  items: [],
};

export default function GiftCollectionsManager({ pw }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [collections, setCollections] = useState([]);
  const [availableGifts, setAvailableGifts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true); setErr("");
    try {
      const r = await fetch(`/api/admin/gift-collections?pw=${encodeURIComponent(pw)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Laden fehlgeschlagen");
      setCollections(j.collections || []);
      setAvailableGifts(j.availableGifts || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    if (!editing.code || !editing.name) {
      setErr("Code und Name sind Pflicht."); return;
    }
    setBusy(true); setErr("");
    try {
      const payload = {
        id: editing.id || undefined,
        code: editing.code.trim(),
        name: editing.name.trim(),
        description: editing.description?.trim() || "",
        edition: editing.edition?.trim() || "",
        season: editing.season?.trim() || "",
        icon: editing.icon?.trim() || "🎁",
        premiumOnly: editing.premiumOnly ? 1 : 0,
        sortOrder: Number(editing.sortOrder) || 0,
        active: editing.active ? true : false,
        items: editing.items || [],
      };
      const r = await fetch(`/api/admin/gift-collections?pw=${encodeURIComponent(pw)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Speichern fehlgeschlagen");
      setCollections(j.collections || []);
      setEditing(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function softDelete(id) {
    if (!confirm("Diese Sammlung deaktivieren? Items bleiben erhalten.")) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/admin/gift-collections?id=${id}&pw=${encodeURIComponent(pw)}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Löschen fehlgeschlagen");
      setCollections(j.collections || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c) {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/admin/gift-collections?pw=${encodeURIComponent(pw)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: c.id, code: c.code, name: c.name,
          description: c.description || "", edition: c.edition || "",
          season: c.season || "", icon: c.icon || "🎁",
          premiumOnly: c.premiumOnly ? 1 : 0,
          sortOrder: c.sortOrder || 0,
          active: !c.active,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Toggle fehlgeschlagen");
      setCollections(j.collections || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const filtered = collections.filter((c) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (c.name || "").toLowerCase().includes(q)
      || (c.code || "").toLowerCase().includes(q)
      || (c.edition || "").toLowerCase().includes(q)
      || (c.season || "").toLowerCase().includes(q);
  });

  if (loading) return <div style={{ padding: 30, color: "#fff", textAlign: "center" }}>Lade Sammlungen…</div>;

  return (
    <div>
      {/* Action-Bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => setEditing({ ...EMPTY_FORM })} style={primaryBtn}>
          ✨ Neue Sammlung
        </button>
        <input
          type="text" placeholder="🔍 suchen…" value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={searchInput}
        />
        <button onClick={load} disabled={busy} style={ghostBtn}>↻ Neu laden</button>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginLeft: "auto" }}>
          {filtered.length} / {collections.length} Sammlungen
        </span>
      </div>

      {err && (
        <div style={{
          background: "rgba(220,38,38,0.15)", border: "1px solid #dc2626",
          color: "#fecaca", padding: 10, borderRadius: 8, marginBottom: 12,
          fontSize: 13,
        }}>⚠ {err}</div>
      )}

      {/* Grid */}
      <div style={{
        display: "grid", gap: 12,
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      }}>
        {filtered.map((c) => (
          <div key={c.id} style={{
            ...card,
            opacity: c.active ? 1 : 0.55,
            borderColor: c.active ? "rgba(200,162,92,0.6)" : "rgba(255,255,255,0.15)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{
                fontSize: 30, width: 44, height: 44, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.3)", borderRadius: 10,
                border: "1px solid rgba(200,162,92,0.4)",
              }}>{c.icon || "🎁"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: "#fff", fontSize: 15, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.name}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2, fontFamily: "monospace" }}>
                  {c.code}
                </div>
              </div>
              {c.premiumOnly === 1 && (
                <span style={badge("#f97316")}>👑 Premium</span>
              )}
            </div>

            {(c.edition || c.season) && (
              <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                {c.edition && <span style={badge("#3b82f6")}>{c.edition}</span>}
                {c.season && <span style={badge("#1e40af")}>{c.season}</span>}
              </div>
            )}

            {c.description && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 8, lineHeight: 1.4 }}>
                {c.description}
              </div>
            )}

            {/* Items-Preview */}
            <div style={{
              display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10,
              padding: 6, background: "rgba(0,0,0,0.2)", borderRadius: 8,
              minHeight: 38,
            }}>
              {(c.items || []).length === 0 ? (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontStyle: "italic", padding: 4 }}>
                  keine Items
                </span>
              ) : (
                (c.items || []).map((it) => (
                  <div key={it.giftCode} title={`${it.name || it.giftCode} (${it.price || 0} ✨)`} style={{
                    width: 28, height: 28, borderRadius: 4,
                    background: "rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden", fontSize: 16,
                  }}>
                    {it.imageUrl
                      ? <img src={it.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : "🎁"}
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>
              <span>{(c.items || []).length} Items</span>
              <span>·</span>
              <span>Pos {c.sortOrder || 0}</span>
              <span>·</span>
              <span style={{ color: c.active ? "#86efac" : "#fca5a5" }}>
                {c.active ? "aktiv" : "inaktiv"}
              </span>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setEditing({
                ...EMPTY_FORM, ...c,
                items: (c.items || []).map((i) => i.giftCode),
              })} style={smallBtn}>✏ Bearbeiten</button>
              <button onClick={() => toggleActive(c)} disabled={busy} style={smallBtn}>
                {c.active ? "⊘ Pausieren" : "▶ Aktivieren"}
              </button>
              <button onClick={() => softDelete(c.id)} disabled={busy} style={{ ...smallBtn, color: "#fca5a5" }}>🗑</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: 30, textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
            Noch keine Sammlung — leg eine an.
          </div>
        )}
      </div>

      {editing && (
        <EditModal
          form={editing} setForm={setEditing}
          availableGifts={availableGifts}
          onSave={save} onCancel={() => setEditing(null)}
          busy={busy} err={err}
        />
      )}
    </div>
  );
}

function EditModal({ form, setForm, availableGifts, onSave, onCancel, busy, err }) {
  const set = (k, v) => setForm({ ...form, [k]: v });
  const toggleItem = (code) => {
    const items = form.items || [];
    setForm({
      ...form,
      items: items.includes(code) ? items.filter((c) => c !== code) : [...items, code],
    });
  };

  return (
    <div style={modalBg} onClick={onCancel}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={modalHead}>
          <span>{form.id ? "✏ Sammlung bearbeiten" : "✨ Neue Sammlung"}</span>
          <button onClick={onCancel} style={closeBtn}>×</button>
        </div>
        <div style={modalBody}>
          <Row label="Code (Slug, eindeutig) *">
            <input value={form.code} onChange={(e) => set("code", e.target.value)}
              placeholder="z.B. fruehling_2026" style={input} disabled={!!form.id} />
          </Row>
          <Row label="Name *">
            <input value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="z.B. Frühlings-Edition 2026" style={input} />
          </Row>
          <Row label="Beschreibung">
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              rows={2} style={{ ...input, fontFamily: "inherit", resize: "vertical" }} />
          </Row>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 10 }}>
            <Row label="Edition">
              <input value={form.edition} onChange={(e) => set("edition", e.target.value)}
                placeholder="2026" style={input} />
            </Row>
            <Row label="Saison">
              <input value={form.season} onChange={(e) => set("season", e.target.value)}
                placeholder="Frühling" style={input} />
            </Row>
            <Row label="Icon">
              <input value={form.icon} onChange={(e) => set("icon", e.target.value)}
                placeholder="🎁" style={{ ...input, textAlign: "center", fontSize: 22 }} />
            </Row>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <Row label="Sort-Order">
              <input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)}
                style={input} />
            </Row>
            <Row label="Premium-only">
              <label style={checkLabel}>
                <input type="checkbox" checked={!!form.premiumOnly}
                  onChange={(e) => set("premiumOnly", e.target.checked ? 1 : 0)} />
                <span>nur Premium</span>
              </label>
            </Row>
            <Row label="Aktiv">
              <label style={checkLabel}>
                <input type="checkbox" checked={!!form.active}
                  onChange={(e) => set("active", e.target.checked ? 1 : 0)} />
                <span>sichtbar</span>
              </label>
            </Row>
          </div>

          <Row label={`Items (${form.items?.length || 0} ausgewählt)`}>
            <div style={{
              maxHeight: 260, overflowY: "auto",
              border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: 8,
              background: "rgba(0,0,0,0.25)",
              display: "grid", gap: 6,
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            }}>
              {availableGifts.length === 0 && (
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, padding: 6 }}>
                  Keine Custom-Gifts vorhanden — leg erst welche im Tab „Alle" an.
                </div>
              )}
              {availableGifts.map((g) => {
                const on = form.items?.includes(g.code);
                return (
                  <button
                    key={g.code} type="button" onClick={() => toggleItem(g.code)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: 6, borderRadius: 6,
                      background: on ? "linear-gradient(135deg, #f97316, #3b82f6)" : "rgba(255,255,255,0.05)",
                      border: on ? "2px solid #f97316" : "1px solid rgba(255,255,255,0.1)",
                      color: "#fff", fontFamily: "inherit",
                      cursor: "pointer", fontSize: 11, textAlign: "left",
                    }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: 4, flexShrink: 0,
                      background: "rgba(0,0,0,0.4)", overflow: "hidden",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {g.image_url
                        ? <img src={g.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : "🎁"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {g.name}
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>{g.price || 0} ✨</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Row>

          {err && (
            <div style={{
              background: "rgba(220,38,38,0.2)", border: "1px solid #dc2626",
              color: "#fecaca", padding: 9, borderRadius: 6, fontSize: 12,
            }}>⚠ {err}</div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
            <button onClick={onCancel} disabled={busy} style={ghostBtn}>Abbrechen</button>
            <button onClick={onSave} disabled={busy} style={primaryBtn}>
              {busy ? "…" : (form.id ? "💾 Speichern" : "✨ Anlegen")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const card = {
  background: "linear-gradient(180deg, rgba(60,40,20,0.6), rgba(40,25,12,0.7))",
  border: "1px solid rgba(200,162,92,0.4)",
  borderRadius: 10,
  padding: 12,
  color: "#ffffff",
};
const input = {
  width: "100%", padding: "8px 10px",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6, color: "#fff", fontSize: 13, fontFamily: "inherit",
  outline: "none",
};
const searchInput = {
  ...input, width: 200,
};
const primaryBtn = {
  padding: "9px 16px", borderRadius: 8,
  background: "linear-gradient(135deg, #f97316, #3b82f6)",
  color: "#fff", border: "1px solid #f97316",
  fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
};
const ghostBtn = {
  padding: "9px 14px", borderRadius: 8,
  background: "rgba(255,255,255,0.06)",
  color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
  fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
};
const smallBtn = {
  flex: 1, padding: "6px 8px", borderRadius: 6,
  background: "rgba(255,255,255,0.08)",
  color: "#fff", border: "1px solid rgba(255,255,255,0.18)",
  fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};
const badge = (color) => ({
  background: `${color}33`, color: "#fff", border: `1px solid ${color}`,
  padding: "2px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: 0.5,
});
const checkLabel = {
  display: "flex", alignItems: "center", gap: 6, padding: "9px 10px",
  background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6, color: "#fff", fontSize: 12, cursor: "pointer",
};
const modalBg = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000, padding: 16,
};
const modalBox = {
  background: "linear-gradient(180deg, #2a1a0e, #1c1006)",
  border: "2px solid #f97316", borderRadius: 12,
  width: "100%", maxWidth: 720, maxHeight: "90vh", overflow: "hidden",
  display: "flex", flexDirection: "column",
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};
const modalHead = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "14px 18px", background: "linear-gradient(180deg, #3b82f6, #1e293b)",
  color: "#ffffff", fontWeight: 800, fontSize: 15, letterSpacing: 1,
  borderBottom: "2px ridge #f97316",
};
const modalBody = {
  padding: 18, display: "flex", flexDirection: "column", gap: 12,
  overflowY: "auto",
};
const closeBtn = {
  width: 28, height: 28, borderRadius: 6,
  background: "rgba(0,0,0,0.3)", border: "none", color: "#fff",
  fontSize: 18, fontWeight: 700, cursor: "pointer",
};
