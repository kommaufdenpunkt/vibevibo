"use client";

// 🎁 Geschenke-Manager — Owner-UI für Custom-Gifts.
// Features:
//   • Tabs: Alle / Limitierte / Saison / Kategorien
//   • Upload: PNG/WebP → base64 → POST
//   • Toggle active, Edit, Delete
//   • Kategorie-CRUD

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TABS = [
  { id: "all",        label: "🎁 Alle",         badgeKey: "all"      },
  { id: "limited",    label: "✨ Limitierte",   badgeKey: "limited"  },
  { id: "seasonal",   label: "🎄 Saison",       badgeKey: "seasonal" },
  { id: "categories", label: "🏷 Kategorien",   badgeKey: null       },
];

export default function GeschenkeManager({ pw, tab: initialTab, search: initialSearch, counts, gifts, categories }) {
  const [tab, setTab] = useState(initialTab || "all");
  const [search, setSearch] = useState(initialSearch || "");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingGift, setEditingGift] = useState(null);
  const router = useRouter();
  const pwQ = `pw=${encodeURIComponent(pw)}`;

  function refresh() { router.refresh(); }

  function gotoTab(id) {
    setTab(id);
    setShowUploadForm(false);
    setEditingGift(null);
    router.push(`/admin/geschenke?${pwQ}&tab=${id}${search ? `&q=${encodeURIComponent(search)}` : ""}`);
  }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid #e5e5e7", marginBottom: 18, overflowX: "auto" }}>
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => gotoTab(t.id)}
              style={{
                padding: "10px 18px", borderRadius: "12px 12px 0 0",
                background: active ? "linear-gradient(135deg, #ec4899, #a855f7)" : "transparent",
                color: active ? "#fff" : "rgba(255,255,255,0.6)",
                fontSize: 13, fontWeight: 800, whiteSpace: "nowrap",
                border: "none", cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {t.label}
              {t.badgeKey && (
                <span style={{
                  background: active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)",
                  color: active ? "#fff" : "rgba(255,255,255,0.85)",
                  padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800,
                }}>{counts[t.badgeKey] || 0}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "categories" ? (
        <KategorienView pw={pw} categories={categories} refresh={refresh} />
      ) : (
        <GeschenkeListe
          pw={pw} pwQ={pwQ} tab={tab} search={search} setSearch={setSearch}
          gifts={gifts} categories={categories}
          showUploadForm={showUploadForm} setShowUploadForm={setShowUploadForm}
          editingGift={editingGift} setEditingGift={setEditingGift}
          refresh={refresh}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Geschenke-Liste + Upload-Form
// ─────────────────────────────────────────────────────────────
function GeschenkeListe({ pw, pwQ, tab, search, setSearch, gifts, categories,
                          showUploadForm, setShowUploadForm,
                          editingGift, setEditingGift, refresh }) {
  return (
    <div>
      {/* Search + Neu-Button */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <form method="GET" action="/admin/geschenke" style={{ flex: 1, display: "flex", gap: 8, minWidth: 260 }}>
          <input type="hidden" name="pw" value={pw} />
          <input type="hidden" name="tab" value={tab} />
          <input
            name="q" defaultValue={search}
            placeholder="🔍 Geschenk suchen (Name oder Code)…"
            style={{
              flex: 1, padding: "11px 14px", borderRadius: 10,
              border: "1px solid #cbd5e1", fontSize: 14, outline: "none", fontFamily: "inherit",
            }}
          />
          <button type="submit" style={btnSecondary()}>Suchen</button>
        </form>
        <button
          type="button"
          onClick={() => { setShowUploadForm(true); setEditingGift(null); }}
          style={btnPrimary()}
        >
          ＋ Neues Geschenk
        </button>
      </div>

      {/* Upload-/Edit-Form */}
      {(showUploadForm || editingGift) && (
        <GiftForm
          pw={pw}
          categories={categories}
          gift={editingGift}
          onClose={() => { setShowUploadForm(false); setEditingGift(null); }}
          onSaved={() => { setShowUploadForm(false); setEditingGift(null); refresh(); }}
        />
      )}

      {/* Grid */}
      {gifts.length === 0 ? (
        <div style={emptyBox()}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🎁</div>
          <b>Noch keine Geschenke in dieser Ansicht</b><br/>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            Klick auf „Neues Geschenk" um eins anzulegen.
          </span>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 14,
        }}>
          {gifts.map((g) => (
            <GiftCard key={g.id} g={g} pw={pw} categories={categories}
              onEdit={() => setEditingGift(g)} onChange={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Gift-Card (mit Action-Buttons)
// ─────────────────────────────────────────────────────────────
function GiftCard({ g, pw, categories, onEdit, onChange }) {
  const [busy, setBusy] = useState(false);
  const cat = categories.find((c) => c.code === g.categoryCode);

  async function toggleActive() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/gifts/${g.id}?pw=${encodeURIComponent(pw)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleActive: !g.active }),
      });
      onChange();
    } finally { setBusy(false); }
  }

  async function del() {
    if (!confirm(`Geschenk "${g.name}" wirklich löschen?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/gifts/${g.id}?pw=${encodeURIComponent(pw)}`, { method: "DELETE" });
      onChange();
    } finally { setBusy(false); }
  }

  const limitedLow = g.isLimited && g.limitQty > 0 && g.limitSold >= g.limitQty;
  const inactiveSeason = g.isSeasonal && (
    (g.seasonStart && Date.now() < g.seasonStart) ||
    (g.seasonEnd && Date.now() > g.seasonEnd)
  );

  return (
    <div style={{
      background: g.active ? "#fff" : "#f5f5f7",
      borderRadius: 14, padding: 14,
      border: "1px solid #e5e5e7",
      opacity: g.active ? 1 : 0.6,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        width: "100%", aspectRatio: "1 / 1", borderRadius: 10,
        background: g.imageUrl ? `url(${g.imageUrl}) center/contain no-repeat #fafafa` : "#fafafa",
        marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36, color: "#cbd5e1",
        position: "relative",
      }}>
        {!g.imageUrl && "🎁"}
        <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
          {g.isLimited && (
            <span style={badgePill("rgba(245,158,11,0.95)", "#fff")}>
              ✨ {g.limitSold}/{g.limitQty || "∞"}
            </span>
          )}
          {g.isSeasonal && <span style={badgePill("rgba(168,85,247,0.95)", "#fff")}>🎄</span>}
        </div>
      </div>
      <div style={{ fontWeight: 800, fontSize: 13, color: "#1c1c1e", lineHeight: 1.3 }}>{g.name}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontFamily: "monospace" }}>
        {g.code}
      </div>
      {cat && (
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
          {cat.emoji} {cat.label}
        </div>
      )}
      <div style={{ marginTop: 6, fontSize: 13, fontWeight: 800, color: "#ec4899" }}>
        {g.price} Vibes
      </div>
      {(limitedLow || inactiveSeason || !g.active) && (
        <div style={{ marginTop: 6, fontSize: 10.5, color: "#92400e" }}>
          ⚠ {!g.active ? "DEAKTIVIERT" : limitedLow ? "AUSVERKAUFT" : "AUSSERHALB SAISON"}
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
        <button type="button" onClick={onEdit} style={cardBtn("#3b82f6")}>✏</button>
        <button type="button" onClick={toggleActive} disabled={busy} style={cardBtn(g.active ? "#94a3b8" : "#10b981")}>
          {g.active ? "👁‍🗨" : "👁"}
        </button>
        <button type="button" onClick={del} disabled={busy} style={cardBtn("#ef4444")}>🗑</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Upload-/Edit-Form (mit File-Reader → base64)
// ─────────────────────────────────────────────────────────────
function GiftForm({ pw, categories, gift, onClose, onSaved }) {
  const isEdit = !!gift;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileInput = useRef(null);

  const [code, setCode]                  = useState(gift?.code || "");
  const [name, setName]                  = useState(gift?.name || "");
  const [description, setDescription]    = useState(gift?.description || "");
  const [categoryCode, setCategoryCode]  = useState(gift?.categoryCode || "");
  const [price, setPrice]                = useState(gift?.price ?? 5);
  const [imageDataUrl, setImageDataUrl]  = useState(gift?.imageUrl || "");
  const [isLimited, setIsLimited]        = useState(!!gift?.isLimited);
  const [limitQty, setLimitQty]          = useState(gift?.limitQty || 0);
  const [isSeasonal, setIsSeasonal]      = useState(!!gift?.isSeasonal);
  const [seasonStart, setSeasonStart]    = useState(gift?.seasonStart ? new Date(gift.seasonStart).toISOString().slice(0, 16) : "");
  const [seasonEnd, setSeasonEnd]        = useState(gift?.seasonEnd ? new Date(gift.seasonEnd).toISOString().slice(0, 16) : "");

  async function onFileSelect(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|webp|jpeg)$/.test(f.type)) {
      setErr("Nur PNG, WebP oder JPEG erlaubt.");
      return;
    }
    if (f.size > 600_000) {
      setErr(`Bild zu groß (${Math.round(f.size / 1024)} KB). Max ~600 KB. PNG mit Transparenz reduzieren oder WebP nutzen.`);
      return;
    }
    setErr("");
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result || ""));
    reader.readAsDataURL(f);
  }

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const body = {
        code: code.trim(), name: name.trim(), description: description.trim(),
        categoryCode, price: Number(price),
        imageDataUrl,
        isLimited, limitQty: Number(limitQty) || 0,
        isSeasonal,
        seasonStart: seasonStart ? new Date(seasonStart).getTime() : 0,
        seasonEnd: seasonEnd ? new Date(seasonEnd).getTime() : 0,
      };
      const url = isEdit
        ? `/api/admin/gifts/${gift.id}?pw=${encodeURIComponent(pw)}`
        : `/api/admin/gifts/upload?pw=${encodeURIComponent(pw)}`;
      const r = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? {
          name: body.name, description: body.description,
          categoryCode: body.categoryCode, price: body.price,
          imageUrl: body.imageDataUrl,
          isLimited: body.isLimited, limitQty: body.limitQty,
          isSeasonal: body.isSeasonal, seasonStart: body.seasonStart, seasonEnd: body.seasonEnd,
        } : body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  return (
    <div style={{
      background: "#fff", border: "2px solid #ec4899", borderRadius: 16, padding: 20,
      marginBottom: 18, boxShadow: "0 12px 40px rgba(236,72,153,0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>
          {isEdit ? `✏ Geschenk bearbeiten: ${gift.name}` : "✨ Neues Geschenk anlegen"}
        </h3>
        <button type="button" onClick={onClose} style={{
          background: "transparent", border: "none", fontSize: 22, cursor: "pointer", color: "#64748b",
        }}>✕</button>
      </div>

      {err && (
        <div style={{
          background: "rgba(239,68,68,0.1)", color: "#991b1b",
          padding: "10px 14px", borderRadius: 10, marginBottom: 12, fontSize: 13, fontWeight: 700,
        }}>⚠ {err}</div>
      )}

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <Field label="Code (intern, eindeutig)" required>
            <input value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="rote_karte" disabled={isEdit} required style={inp()} />
          </Field>
          <Field label="Name (sichtbar)" required>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Rote Karte!" required style={inp()} />
          </Field>
          <Field label="Preis (Vibes)">
            <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required style={inp()} />
          </Field>
          <Field label="Kategorie">
            <select value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} style={inp()}>
              <option value="">— keine —</option>
              {categories.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Beschreibung (optional)">
          <input value={description} onChange={(e) => setDescription(e.target.value)} style={inp()}
            placeholder="z. B. Auf das Deutschland nicht so viel Rote Karten bekommt 😂" />
        </Field>

        {/* Image-Upload */}
        <Field label="Grafik (PNG/WebP empfohlen, ~512×512, max 600 KB)">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{
              width: 96, height: 96, borderRadius: 12,
              background: imageDataUrl ? `url(${imageDataUrl}) center/contain no-repeat #fafafa` : "#f5f5f7",
              border: "1px dashed #cbd5e1",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, color: "#cbd5e1", flexShrink: 0,
            }}>
              {!imageDataUrl && "🎁"}
            </div>
            <div style={{ flex: 1 }}>
              <input
                ref={fileInput} type="file" accept="image/png,image/webp,image/jpeg"
                onChange={onFileSelect}
                style={{ fontSize: 13, fontFamily: "inherit" }}
              />
              {imageDataUrl && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>
                  ✓ ~{Math.round(imageDataUrl.length / 1024)} KB ·{" "}
                  <button type="button" onClick={() => setImageDataUrl("")} style={{
                    background: "transparent", border: "none", color: "#ec4899",
                    cursor: "pointer", fontWeight: 700, padding: 0,
                  }}>entfernen</button>
                </div>
              )}
            </div>
          </div>
        </Field>

        {/* Limitiert */}
        <div style={optionBox(isLimited)}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
            <input type="checkbox" checked={isLimited} onChange={(e) => setIsLimited(e.target.checked)} />
            ✨ Limitiertes Geschenk
          </label>
          {isLimited && (
            <div style={{ marginTop: 10 }}>
              <Field label="Maximale Stückzahl (0 = unbegrenzt)">
                <input type="number" min="0" value={limitQty} onChange={(e) => setLimitQty(e.target.value)} style={inp()} />
              </Field>
              {isEdit && gift?.limitSold > 0 && (
                <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>
                  Bereits {gift.limitSold} verkauft
                </div>
              )}
            </div>
          )}
        </div>

        {/* Saison */}
        <div style={optionBox(isSeasonal)}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
            <input type="checkbox" checked={isSeasonal} onChange={(e) => setIsSeasonal(e.target.checked)} />
            🎄 Saison-Geschenk (nur in Zeitraum verfügbar)
          </label>
          {isSeasonal && (
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Verfügbar ab">
                <input type="datetime-local" value={seasonStart} onChange={(e) => setSeasonStart(e.target.value)} style={inp()} />
              </Field>
              <Field label="Verfügbar bis">
                <input type="datetime-local" value={seasonEnd} onChange={(e) => setSeasonEnd(e.target.value)} style={inp()} />
              </Field>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button type="submit" disabled={busy} style={btnPrimary({ flex: 1 })}>
            {busy ? "⏳…" : isEdit ? "💾 Änderungen speichern" : "✨ Geschenk anlegen"}
          </button>
          <button type="button" onClick={onClose} style={btnSecondary()}>Abbrechen</button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Kategorien-View
// ─────────────────────────────────────────────────────────────
function KategorienView({ pw, categories, refresh }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("");

  async function addCat(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/admin/gift-categories?pw=${encodeURIComponent(pw)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", code, label, emoji }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setCode(""); setLabel(""); setEmoji("");
      refresh();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function delCat(id, name) {
    if (!confirm(`Kategorie "${name}" wirklich löschen?\nGeschenke in dieser Kategorie werden NICHT gelöscht — nur die Zuordnung wird entfernt.`)) return;
    await fetch(`/api/admin/gift-categories?pw=${encodeURIComponent(pw)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    refresh();
  }

  return (
    <div>
      {/* Neue Kategorie */}
      <div style={{
        background: "#fff", borderRadius: 14, padding: 18, marginBottom: 16,
        border: "1px solid #e5e5e7",
      }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 900 }}>＋ Neue Kategorie</h3>
        {err && <div style={{ color: "#991b1b", marginBottom: 10, fontSize: 12, fontWeight: 700 }}>⚠ {err}</div>}
        <form onSubmit={addCat} style={{ display: "grid", gridTemplateColumns: "120px 1fr 80px 100px", gap: 10, alignItems: "end" }}>
          <Field label="Code (a-z)">
            <input value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="weihnacht" required style={inp()} />
          </Field>
          <Field label="Label">
            <input value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="🎄 Weihnachten" required style={inp()} />
          </Field>
          <Field label="Emoji">
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)}
              placeholder="🎄" maxLength="4" style={inp()} />
          </Field>
          <button type="submit" disabled={busy} style={btnPrimary()}>Anlegen</button>
        </form>
      </div>

      {/* Liste */}
      <div style={{ display: "grid", gap: 8 }}>
        {categories.map((c) => (
          <div key={c.id} style={{
            background: "#fff", border: "1px solid #e5e5e7", borderRadius: 12,
            padding: "12px 16px", display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{ fontSize: 26 }}>{c.emoji || "🏷"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{c.label}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{c.code}</div>
            </div>
            <button type="button" onClick={() => delCat(c.id, c.label)} style={cardBtn("#ef4444")}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 10.5, letterSpacing: 1, color: "#64748b", fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </span>
      {children}
    </label>
  );
}
function inp() {
  return { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
}
function btnPrimary(extra = {}) {
  return {
    padding: "11px 22px", borderRadius: 10,
    background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
    border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
    ...extra,
  };
}
function btnSecondary() {
  return {
    padding: "11px 22px", borderRadius: 10,
    background: "#f5f5f7", color: "#1c1c1e",
    border: "1px solid #e5e5e7", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  };
}
function cardBtn(color) {
  return {
    flex: 1, padding: "8px 0", borderRadius: 8,
    background: color, color: "#fff", border: "none", fontSize: 14, cursor: "pointer", fontFamily: "inherit",
  };
}
function badgePill(bg, color) {
  return {
    background: bg, color, fontSize: 10, fontWeight: 800,
    padding: "2px 7px", borderRadius: 999, letterSpacing: 0.3,
  };
}
function optionBox(active) {
  return {
    padding: 14, borderRadius: 10,
    background: active ? "rgba(236,72,153,0.05)" : "#fafafa",
    border: `1px solid ${active ? "rgba(236,72,153,0.3)" : "#e5e5e7"}`,
  };
}
function emptyBox() {
  return {
    background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 14,
    padding: 40, textAlign: "center", color: "#64748b",
  };
}
