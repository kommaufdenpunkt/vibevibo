"use client";

// 💡 Wunschseite — User reichen Ideen ein, voten, sehen Owner-Status.

import { useState, useEffect } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";

const CATEGORIES = {
  feature: { label: "✨ Feature", color: "#a855f7" },
  bug:     { label: "🐛 Bug",     color: "#ef4444" },
  idea:    { label: "💡 Idee",    color: "#06b6d4" },
  other:   { label: "💬 Anderes", color: "#64748b" },
};

const STATUSES = {
  open:        { label: "🆕 Offen",       bg: "rgba(168,85,247,0.15)", color: "#a855f7" },
  planned:     { label: "📌 Geplant",     bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
  in_progress: { label: "🔨 In Arbeit",   bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
  done:        { label: "✅ Fertig",      bg: "rgba(16,185,129,0.15)", color: "#10b981" },
  declined:    { label: "❌ Abgelehnt",   bg: "rgba(148,163,184,0.15)", color: "#64748b" },
};

export default function WunschPage() {
  const { me, loading } = useMe();
  const [wishes, setWishes] = useState([]);
  const [counts, setCounts] = useState({});
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("top");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  function refresh() {
    const url = `/api/wishes?${statusFilter ? `status=${statusFilter}&` : ""}sort=${sort}${search ? `&q=${encodeURIComponent(search)}` : ""}`;
    fetch(url).then((r) => r.json()).then((d) => {
      setWishes(d.wishes || []);
      setCounts(d.counts || {});
    }).catch(() => {});
  }

  useEffect(() => { refresh(); }, [statusFilter, sort, search]);

  async function vote(id) {
    if (!me) return alert("Bitte einloggen um zu voten.");
    const r = await fetch(`/api/wishes/${id}/vote`, { method: "POST" });
    if (r.ok) refresh();
  }

  if (loading) return null;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "#1c1c1e", textShadow: "0 1px 2px rgba(255,255,255,0.5)" }}>
        💡 Wunschseite
      </h1>
      <p style={{ fontSize: 13.5, color: "#334155", marginTop: 4, lineHeight: 1.5, fontWeight: 500 }}>
        Was wünschst du dir bei VibeVibo? Bug gefunden? Idee fürs nächste Feature? Hier raus damit. Vote für Wünsche anderer — wir bauen die mit den meisten Stimmen zuerst.
      </p>

      {/* Submit-Button */}
      <div style={{ marginTop: 16, marginBottom: 16 }}>
        {me ? (
          <button onClick={() => setShowForm(true)} style={btnPrimary({ width: "100%" })}>
            💡 Eigenen Wunsch einreichen
          </button>
        ) : (
          <Link href="/login?next=/wuensche" style={{ ...btnPrimary({ width: "100%", display: "block", textAlign: "center", textDecoration: "none" }) }}>
            🔓 Einloggen um eigene Wünsche einzureichen
          </Link>
        )}
      </div>

      {/* Status-Filter Pills */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 10, paddingBottom: 4 }}>
        <FilterPill active={!statusFilter} onClick={() => setStatusFilter("")}
          label={`Alle ${counts.all || 0}`} />
        {Object.entries(STATUSES).map(([key, s]) => (
          <FilterPill key={key} active={statusFilter === key}
            onClick={() => setStatusFilter(key)}
            label={`${s.label} ${counts[key] || 0}`}
            bg={s.bg} color={s.color} />
        ))}
      </div>

      {/* Sort */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#475569", fontWeight: 700, marginRight: 6 }}>Sortierung:</span>
        {[
          { id: "top",   label: "🏆 Top" },
          { id: "trend", label: "📈 Trend" },
          { id: "new",   label: "🆕 Neu" },
        ].map((s) => (
          <button key={s.id} onClick={() => setSort(s.id)} style={{
            padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
            background: sort === s.id ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.85)",
            color: sort === s.id ? "#831843" : "#475569",
            border: sort === s.id ? "1px solid rgba(236,72,153,0.4)" : "1px solid rgba(0,0,0,0.08)",
            cursor: "pointer", fontFamily: "inherit",
          }}>{s.label}</button>
        ))}
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 suchen…"
          style={{
            marginLeft: "auto", padding: "5px 10px", borderRadius: 999,
            background: "rgba(255,255,255,0.95)", border: "none",
            fontSize: 12, fontFamily: "inherit", outline: "none",
            width: 130,
          }}
        />
      </div>

      {/* Liste */}
      {wishes.length === 0 ? (
        <div style={{
          padding: 40, textAlign: "center", color: "#475569",
          background: "rgba(255,255,255,0.7)", borderRadius: 14,
          border: "1px dashed rgba(0,0,0,0.08)",
        }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>💭</div>
          <b style={{ color: "#1c1c1e" }}>Noch keine Wünsche hier</b><br/>
          <span style={{ fontSize: 12 }}>Sei der erste!</span>
        </div>
      ) : wishes.map((w) => <WishCard key={w.id} wish={w} onVote={vote} canVote={!!me} />)}

      {/* Submit-Modal */}
      {showForm && <SubmitModal onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); refresh(); }} />}
    </div>
  );
}

function WishCard({ wish, onVote, canVote }) {
  const cat = CATEGORIES[wish.category] || CATEGORIES.other;
  const st  = STATUSES[wish.status] || STATUSES.open;
  return (
    <div style={{
      background: "rgba(255,255,255,0.95)", borderRadius: 14, padding: 14, marginBottom: 10,
      borderLeft: `4px solid ${st.color}`,
      position: "relative",
    }}>
      {wish.pinned > 0 && (
        <div style={{ position: "absolute", top: 8, right: 8, fontSize: 14 }}>📌</div>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Vote-Button */}
        <button onClick={() => onVote(wish.id)} disabled={!canVote}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            background: wish.hasVoted ? "linear-gradient(135deg, #ec4899, #a855f7)" : "#f5f5f7",
            color: wish.hasVoted ? "#fff" : "#1c1c1e",
            border: "none", borderRadius: 10, padding: "8px 12px",
            fontWeight: 800, cursor: canVote ? "pointer" : "default",
            fontFamily: "inherit",
            minWidth: 50, flexShrink: 0,
          }}>
          <span style={{ fontSize: 16 }}>{wish.hasVoted ? "💜" : "👍"}</span>
          <span style={{ fontSize: 13, marginTop: 2 }}>{wish.upvotes}</span>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ ...badge(cat.color), background: `${cat.color}15`, color: cat.color }}>{cat.label}</span>
            <span style={{ ...badge(st.color), background: st.bg, color: st.color }}>{st.label}</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#1c1c1e", lineHeight: 1.3 }}>{wish.title}</div>
          {wish.body && (
            <div style={{ fontSize: 13, color: "#475569", marginTop: 6, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
              {wish.body}
            </div>
          )}
          {wish.adminReply && (
            <div style={{
              marginTop: 10, padding: 10, borderRadius: 10,
              background: "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(236,72,153,0.05))",
              border: "1px solid rgba(168,85,247,0.2)",
              fontSize: 12.5, lineHeight: 1.5, color: "#475569", whiteSpace: "pre-wrap",
            }}>
              <b style={{ color: "#a855f7" }}>👑 Owner-Antwort:</b> {wish.adminReply}
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                {wish.adminReplyAt && new Date(wish.adminReplyAt).toLocaleDateString("de-DE")}
              </div>
            </div>
          )}
          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 8 }}>
            von <Link href={`/u/${wish.username}`} style={{ color: "#94a3b8" }}>@{wish.username}</Link>
            {" · "}{new Date(wish.createdAt).toLocaleDateString("de-DE")}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmitModal({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [body, setBody]   = useState("");
  const [category, setCategory] = useState("feature");
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/wishes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      onCreated();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", padding: 22, borderRadius: 18, maxWidth: 500, width: "100%",
      }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 900 }}>💡 Neuer Wunsch</h3>
        {err && <div style={{ color: "#991b1b", marginBottom: 10, fontSize: 12, fontWeight: 700 }}>⚠ {err}</div>}

        <label style={lbl()}>Kategorie</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 6, marginBottom: 12 }}>
          {Object.entries(CATEGORIES).map(([key, c]) => (
            <button key={key} type="button" onClick={() => setCategory(key)} style={{
              padding: "8px 6px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: category === key ? `${c.color}20` : "#f5f5f7",
              color: category === key ? c.color : "#475569",
              border: `2px solid ${category === key ? c.color : "transparent"}`,
              cursor: "pointer", fontFamily: "inherit",
            }}>{c.label}</button>
          ))}
        </div>

        <label style={lbl()}>Titel (kurz + knackig)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160}
          placeholder='z.B. "Dark-Mode-Schalter im Profil"'
          style={inp()} autoFocus />

        <label style={{ ...lbl(), marginTop: 10 }}>Details (optional)</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000}
          rows={5}
          placeholder="Beschreib deinen Wunsch genauer — wie soll es aussehen, was soll's tun?"
          style={{ ...inp(), resize: "vertical" }} />

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button type="button" onClick={onClose} style={btnGhost({ flex: 1 })}>Abbrechen</button>
          <button type="submit" disabled={busy || !title.trim()} style={btnPrimary({ flex: 2 })}>
            {busy ? "⏳…" : "💡 Wunsch einreichen"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FilterPill({ active, onClick, label, bg, color }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
      background: active ? (bg || "rgba(236,72,153,0.2)") : "rgba(255,255,255,0.95)",
      color: active ? (color || "#ec4899") : "#475569",
      border: active ? `1px solid ${color || "#ec4899"}` : "1px solid transparent",
      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
    }}>{label}</button>
  );
}

function badge(color) { return { display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.3 }; }
function lbl() { return { display: "block", fontSize: 11, color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }; }
function inp() { return { width: "100%", padding: 11, borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }; }
function btnPrimary(x = {}) { return { padding: 12, borderRadius: 10, background: "linear-gradient(135deg,#ec4899,#a855f7)", color: "#fff", border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", ...x }; }
function btnGhost(x = {}) { return { padding: 12, borderRadius: 10, background: "#f5f5f7", color: "#475569", border: "1px solid #e5e5e7", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer", ...x }; }
