"use client";

// 🎁 Jappy-Style Geschenke-Vitrine.
// Bleiben dauerhaft auf dem Profil (anders als Live-Emotes).
// Owner kann bis zu 6 Lieblings-Geschenke pinnen (oben in der Reihe).
// Klick auf ein Geschenk öffnet Spruchkarte mit Absender.

import { useMemo, useState } from "react";
import Link from "next/link";
import { GIFTS, GIFT_CATEGORIES, GIFT_NOTE_MAX, WRAPPINGS, WRAPPING_MAP, findGift } from "@/lib/gifts";
import { relTime } from "@/lib/format";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { ColoredName } from "./GenderAge";
import OnlineName from "./OnlineName";

function ageFromBirthdate(bd) {
  if (!bd) return null;
  const d = new Date(bd);
  if (isNaN(d.getTime())) return null;
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  const m = n.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--;
  return a >= 0 && a < 130 ? a : null;
}

export default function GiftShelf({ profile, gifts, onChange }) {
  const { me } = useMe();
  const isOwner = me?.username === profile.username;
  const [picker, setPicker] = useState(false);
  const [view, setView] = useState(null);     // angeklicktes Geschenk
  const [flash, setFlash] = useState("");

  const pinnedCount = gifts.filter((g) => g.pinned).length;

  async function pickGift(opts) {
    if (!me) { setFlash("⚠ Login nötig."); return; }
    if (isOwner) { setFlash("⚠ Dir selbst kannst du nichts schenken."); return; }
    try {
      await api.sendGift(profile.username, opts.giftId, opts.note, opts.visibility, opts.wrap);
      const g = findGift(opts.giftId);
      setFlash(`${g.icon} ${g.name} an ${profile.displayName} verschickt!`);
      setTimeout(() => setFlash(""), 2800);
      setPicker(false);
      onChange?.();
    } catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 3500); }
  }

  async function togglePin(g) {
    try {
      if (g.pinned) await api.unpinGift(g.id);
      else await api.pinGift(g.id);
      onChange?.();
    } catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 3000); }
  }

  return (
    <div className="vv-card">
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>🎁 Geschenke {gifts.length > 0 && <span style={{ color: "var(--vv-muted,#888)", fontSize: 13, fontWeight: 400 }}>({gifts.length})</span>}</h3>
        {!isOwner && (
          <button type="button" onClick={() => setPicker(true)}
            className="vv-btn vv-btn-pink"
            style={{ marginLeft: "auto", fontSize: 13, padding: "5px 10px" }}>
            🎀 Schenken
          </button>
        )}
      </div>
      {isOwner && pinnedCount > 0 && (
        <div className="vv-muted" style={{ fontSize: 11, marginBottom: 6 }}>
          ★ {pinnedCount}/6 gepinnt — diese werden oben angezeigt.
        </div>
      )}

      {flash && (
        <div style={{
          background: flash.startsWith("⚠") ? "#fef3c7" : "#dcfce7",
          color: flash.startsWith("⚠") ? "#92400e" : "#166534",
          padding: 8, borderRadius: 8, marginBottom: 8, fontWeight: 700, fontSize: 12, textAlign: "center",
        }}>{flash}</div>
      )}

      {gifts.length === 0 ? (
        <div className="vv-muted vv-center" style={{ padding: "14px 0", fontSize: 13 }}>
          {isOwner ? "Noch keine Geschenke — vielleicht bekommst du bald welche! 🎀"
            : "Noch keine Geschenke — sei der/die Erste! 🎀"}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))", gap: 6 }}>
          {gifts.map((g) => {
            const def = findGift(g.gift_id);
            if (!def) return null;
            const wrap = g.wrap ? WRAPPING_MAP[g.wrap] : null;
            return (
              <button key={g.id} type="button" onClick={() => setView(g)}
                title={`${def.name} von ${g.from_display_name}${g.note ? ": " + g.note : ""}`}
                style={{
                  position: "relative",
                  aspectRatio: "1", border: g.pinned ? "2px solid #fbbf24" : "1px solid var(--vv-border,#e5e7eb)",
                  borderRadius: 10,
                  background: wrap?.bg || (g.pinned
                    ? "linear-gradient(135deg,#fef3c7,#fde68a)" : "var(--vv-card,#fff)"),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 26,
                }}>
                {def.icon}
                {wrap?.emoji && <span style={{ position: "absolute", bottom: 2, right: 2, fontSize: 10 }}>{wrap.emoji}</span>}
                {g.pinned && <span style={{ position: "absolute", top: -4, right: -4, fontSize: 12 }}>⭐</span>}
                {g.visibility === "private" && <span style={{ position: "absolute", top: 2, left: 2, fontSize: 9 }}>🔒</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Detail-Modal mit Spruchkarte */}
      {view && (() => {
        const def = findGift(view.gift_id);
        const senderAge = ageFromBirthdate(view.from_birthdate);
        return (
          <div onClick={() => setView(null)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
              zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
            }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              width: "100%", maxWidth: 360, background: "var(--vv-card,#fff)",
              color: "var(--vv-text,#1c1c1e)", borderRadius: 16, padding: 16,
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)", textAlign: "center",
            }}>
              <div style={{ fontSize: 72, marginBottom: 4 }}>{def?.icon || "🎁"}</div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{def?.name || "Geschenk"}</div>
              <div style={{ fontSize: 12, color: "var(--vv-muted,#666)", marginBottom: 10 }}>
                von{" "}
                <Link href={`/u/${view.from_username}`} style={{ textDecoration: "none" }}>
                  <OnlineName lastSeen={view.from_last_seen}>
                    <ColoredName gender={view.from_gender} age={senderAge} name={view.from_display_name} />
                  </OnlineName>
                </Link>
                {" · "}{relTime(view.at)}
              </div>
              {view.note && (
                <div style={{
                  background: "linear-gradient(135deg,#fce7f3,#fbcfe8)",
                  border: "1px solid #ec4899", color: "#831843",
                  padding: 12, borderRadius: 10, fontSize: 13, fontStyle: "italic",
                  margin: "8px 0", lineHeight: 1.4,
                }}>
                  „{view.note}"
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {isOwner && (
                  <button type="button" onClick={() => togglePin(view)}
                    className="vv-btn" style={{ flex: 1, fontSize: 13 }}>
                    {view.pinned ? "★ Entpinnen" : "☆ Pinnen"}
                  </button>
                )}
                <button type="button" onClick={() => setView(null)}
                  className="vv-btn vv-btn-pink" style={{ flex: 1, fontSize: 13 }}>Schließen</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Geschenke-Picker mit Kategorien + Spruchkarte */}
      {picker && (
        <GiftPicker onClose={() => setPicker(false)}
          onSend={pickGift} balance={me?.credits ?? null} />
      )}
    </div>
  );
}

function GiftPicker({ onClose, onSend, balance }) {
  const [cat, setCat] = useState("love");
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [wrapId, setWrapId] = useState("plain");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) return GIFTS.filter((g) => g.name.toLowerCase().includes(q));
    return GIFTS.filter((g) => g.cat === cat);
  }, [cat, search]);

  const wrap = WRAPPING_MAP[wrapId] || WRAPPINGS[0];
  const total = selected ? selected.price + (wrap?.surcharge || 0) : 0;

  async function send() {
    if (!selected) return;
    setBusy(true);
    try { await onSend({ giftId: selected.id, note: note.trim(), visibility, wrap: wrapId === "plain" ? "" : wrapId }); }
    finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      zIndex: 3000, display: "flex", alignItems: "flex-end",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column",
        background: "var(--vv-card,#fff)", color: "var(--vv-text,#1c1c1e)",
        borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 14,
      }}>
        <div style={{ width: 44, height: 4, background: "#d4d4d8", borderRadius: 2, margin: "0 auto 10px" }} />
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>🎀 Geschenk schicken</h3>
          {balance != null && <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--vv-muted,#666)" }}>
            Guthaben: <b>{balance} ✨</b>
          </span>}
        </div>

        {/* Suche */}
        <input className="vv-input" placeholder="🔍 Geschenk suchen…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", marginBottom: 8, fontSize: 13 }} />

        {/* Kategorie-Tabs (horizontal scroll) — nur wenn nicht gesucht */}
        {!search.trim() && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 8 }}>
            {GIFT_CATEGORIES.map((c) => {
              const active = cat === c.id;
              return (
                <button key={c.id} type="button" onClick={() => { setCat(c.id); setSelected(null); }}
                  style={{
                    padding: "5px 10px", borderRadius: 999, whiteSpace: "nowrap",
                    border: active ? "1px solid #ec4899" : "1px solid var(--vv-border,#ddd)",
                    background: active ? "linear-gradient(135deg,#fdf2f8,#fce7f3)" : "var(--vv-card,#fff)",
                    color: "var(--vv-text,#1c1c1e)", fontWeight: active ? 700 : 500,
                    fontFamily: "inherit", fontSize: 12, cursor: "pointer",
                  }}>{c.label}</button>
              );
            })}
          </div>
        )}

        {/* Grid */}
        <div style={{ overflowY: "auto", flex: 1, marginBottom: 8 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 6,
          }}>
            {filtered.map((g) => {
              const active = selected?.id === g.id;
              return (
                <button key={g.id} type="button" onClick={() => setSelected(g)}
                  style={{
                    padding: "10px 4px", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${active ? "#ec4899" : "var(--vv-border,#e5e7eb)"}`,
                    background: active ? "linear-gradient(135deg,#fdf2f8,#fce7f3)" : "var(--vv-surface,#f5f5f7)",
                    color: "var(--vv-text,#1c1c1e)",
                    fontFamily: "inherit", textAlign: "center",
                  }}>
                  <div style={{ fontSize: 28 }}>{g.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>{g.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#ec4899" }}>{g.price} ✨</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Verpackungs-Wahl */}
        <label style={{ fontSize: 11, color: "var(--vv-muted,#666)", marginBottom: 4 }}>
          🎀 Verpackung
        </label>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 8 }}>
          {WRAPPINGS.map((w) => {
            const active = wrapId === w.id;
            return (
              <button key={w.id} type="button" onClick={() => setWrapId(w.id)}
                style={{
                  padding: "5px 8px", borderRadius: 8, whiteSpace: "nowrap", flexShrink: 0,
                  border: active ? "2px solid #ec4899" : "1px solid var(--vv-border,#ddd)",
                  background: w.bg || "var(--vv-card,#fff)",
                  color: w.id === "noir" ? "#fff" : "var(--vv-text,#1c1c1e)",
                  fontFamily: "inherit", fontSize: 11, cursor: "pointer", fontWeight: active ? 700 : 500,
                }}>
                {w.emoji} {w.label}{w.surcharge > 0 ? ` +${w.surcharge}✨` : ""}
              </button>
            );
          })}
        </div>

        {/* Sichtbarkeit */}
        <label style={{ fontSize: 11, color: "var(--vv-muted,#666)", marginBottom: 4 }}>
          👁 Sichtbarkeit
        </label>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {[
            { v: "public",  label: "🌍 Öffentlich", desc: "Alle sehen das Geschenk" },
            { v: "private", label: "🔒 Privat",     desc: "Nur ihr beide" },
          ].map((o) => (
            <button key={o.v} type="button" onClick={() => setVisibility(o.v)}
              style={{
                flex: 1, padding: "6px 8px", borderRadius: 8, textAlign: "left",
                border: `2px solid ${visibility === o.v ? "#ec4899" : "var(--vv-border,#ddd)"}`,
                background: visibility === o.v ? "#fdf2f8" : "var(--vv-card,#fff)",
                color: "var(--vv-text,#1c1c1e)", fontFamily: "inherit", cursor: "pointer",
              }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{o.label}</div>
              <div style={{ fontSize: 10, color: "var(--vv-muted,#666)" }}>{o.desc}</div>
            </button>
          ))}
        </div>

        {/* Spruchkarte */}
        <label style={{ fontSize: 11, color: "var(--vv-muted,#666)", marginBottom: 4 }}>
          ✉ Spruchkarte (optional, {GIFT_NOTE_MAX} Zeichen — nur ihr beide sehen sie)
        </label>
        <textarea className="vv-textarea" rows={2}
          placeholder="z.B. „Für die beste Freundin der Welt 💕"
          maxLength={GIFT_NOTE_MAX} value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onClose} className="vv-btn" style={{ flex: 1 }}>Abbrechen</button>
          <button type="button" onClick={send} disabled={!selected || busy}
            className="vv-btn-big vv-btn-big-pink" style={{ flex: 2, padding: 10, fontSize: 14 }}>
            {busy ? "Sende…" : selected ? `${wrap?.emoji || ""}${selected.icon} ${selected.name} (-${total} ✨)` : "Wähle ein Geschenk"}
          </button>
        </div>
      </div>
    </div>
  );
}
