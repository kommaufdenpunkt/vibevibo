"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { relTime } from "@/lib/format";
import PremiumHero from "@/components/PremiumHero";

export default function GruppenPage() {
  const { me } = useMe();
  const [groups, setGroups] = useState([]);
  const [mine, setMine] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", emoji: "👥" });
  const [createCost, setCreateCost] = useState(500);
  const [balance, setBalance] = useState(null);
  const [category, setCategory] = useState(null); // null = alle
  const [sort, setSort] = useState("new"); // new|trending|active|members
  const [categories, setCategories] = useState([]);

  async function reload() {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);
    const r = await fetch(`/api/groups${params.toString() ? "?" + params.toString() : ""}`, { credentials: "include" });
    const d = await r.json();
    setGroups(d.groups || []);
    setMine(d.mine || []);
    setCategories(d.categories || []);
    if (typeof d.createCost === "number") setCreateCost(d.createCost);
  }

  async function reloadBalance() {
    if (!me) return setBalance(null);
    try {
      const r = await fetch("/api/credits", { credentials: "include" });
      if (r.ok) {
        const d = await r.json();
        setBalance(d.balance ?? null);
      }
    } catch {}
  }

  useEffect(() => { reload(); }, [category, sort]); // eslint-disable-line
  useEffect(() => { reloadBalance(); }, [me]);

  async function create(e) {
    e.preventDefault();
    try {
      await api.createGroup(form);
      setForm({ name: "", slug: "", description: "", emoji: "👥" });
      setCreating(false);
      reload();
      reloadBalance();
    } catch (e) { alert(e.message); }
  }

  const canAfford = balance == null || balance >= createCost;

  return (
    <>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "12px 12px 0" }}>
        <PremiumHero
          eyebrow="👥 Coms"
          title="Triff Gleichgesinnte"
          subtitle="Fan-Clubs, Stammtische, Themen-Foren — wie früher bei SchülerVZ und Lokalisten. Mit Events, News, Forum-Themen und Chat."
          gradient="rose"
          sparkles={["♡", "✨", "★"]}
          stats={[
            { label: "🌐", value: `${groups.length} Coms` },
            ...(mine.length > 0 ? [{ label: "👤", value: `${mine.length} eigene` }] : []),
          ]}
        />
      </div>
      {me && (
      <div className="vv-card">
        <div className="vv-row" style={{ alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Eine Com gründen kostet <b style={{ color: "#ec4899" }}>{createCost} ✨</b>
            {balance != null && (
              <> · Dein Kontostand: <b>{balance} ✨</b></>
            )}
          </div>
          <div className="vv-spacer" />
          <button
            className="vv-btn vv-btn-pink"
            onClick={() => setCreating((c) => !c)}
            disabled={!canAfford && !creating}
            style={!canAfford && !creating ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            title={!canAfford ? `Dir fehlen noch ${createCost - balance} ✨` : ""}
          >
            {creating ? "− Abbrechen" : `+ Neue Com gründen (${createCost} ✨)`}
          </button>
        </div>
        {creating && (
          <form onSubmit={create} className="vv-card vv-mt-12" style={{ background: "#fff7d6" }}>
            <label><strong>Name</strong></label>
            <input className="vv-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <label><strong>URL-Kürzel (Slug)</strong> <span className="vv-muted">(z.B. tokio-hotel-fans)</span></label>
            <input className="vv-input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
            <label><strong>Beschreibung</strong></label>
            <textarea className="vv-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <label><strong>Emoji</strong></label>
            <input className="vv-input" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} maxLength={4} />
            <button type="submit" className="vv-btn vv-btn-pink vv-mt-12" disabled={!canAfford}>
              ✿ Gründen ({createCost} ✨)
            </button>
            {!canAfford && (
              <div className="vv-muted vv-mt-8" style={{ fontSize: 12 }}>
                Dir fehlen noch {createCost - balance} ✨ — verdien sie unter <Link href="/vibes-verdienen">Vibes verdienen</Link>.
              </div>
            )}
          </form>
        )}
      </div>
      )}

      {/* Filter-Bar */}
      <div className="vv-card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>
          Sortierung
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {[
            { id: "new",      label: "🆕 Neu" },
            { id: "trending", label: "🔥 Trending" },
            { id: "active",   label: "💬 Aktiv (24h)" },
            { id: "members",  label: "👥 Größte" },
          ].map((s) => (
            <button key={s.id} onClick={() => setSort(s.id)} style={chipStyle(sort === s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>
          Kategorie
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setCategory(null)} style={chipStyle(category === null)}>
            🌐 Alle
          </button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)} style={chipStyle(category === c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="vv-grid-2">
        <div>
          <div className="vv-card">
            <h3>🌐 {category ? categories.find((c) => c.id === category)?.label : "Alle Coms"}</h3>
            {groups.length === 0 && <div className="vv-muted">Keine Coms hier.</div>}
            {groups.map((g) => {
              const boosted = g.boostUntil && g.boostUntil > Date.now();
              return (
              <Link key={g.slug} href={`/coms/${g.slug}`} className="vv-conv-entry" style={boosted ? {
                background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(236,72,153,0.1))",
                border: "1px solid rgba(251,191,36,0.5)",
                borderRadius: 12,
                boxShadow: "0 0 12px rgba(251,191,36,0.25)",
              } : {}}>
                <div className="vv-avatar vv-avatar-sm" style={{ fontSize: 26 }}>{g.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div className="vv-conv-name">
                    {boosted && <span title="Geboostet" style={{ marginRight: 4 }}>🔥</span>}
                    {g.name}
                  </div>
                  <div className="vv-conv-preview">{g.description}</div>
                  <div className="vv-muted" style={{ fontSize: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {g.category && g.category !== "sonstiges" && (
                      <>
                        <span>{categories.find((c) => c.id === g.category)?.label || g.category}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>👥 {g.member_count} Mitglieder</span>
                    <span>·</span>
                    <span>👑 {g.owner_username
                      ? `${g.owner_emoji || ""} @${g.owner_username}`
                      : <b style={{ color: "#dc2626" }}>N/A (besitzerlos)</b>}</span>
                    {g.post_count_24h > 0 && (
                      <>
                        <span>·</span>
                        <span>💬 {g.post_count_24h} heute</span>
                      </>
                    )}
                    <span>·</span>
                    <span>seit {relTime(g.at)}</span>
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        </div>
        <div>
          <div className="vv-card">
            <h3>👤 Meine Coms</h3>
            {!me && <div className="vv-muted">Logge dich ein, um Coms beizutreten.</div>}
            {me && mine.length === 0 && <div className="vv-muted">Noch keiner Com beigetreten.</div>}
            {mine.map((g) => (
              <Link key={g.slug} href={`/coms/${g.slug}`} className="vv-conv-entry">
                <div className="vv-avatar vv-avatar-sm" style={{ fontSize: 24 }}>{g.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div className="vv-conv-name">{g.name}</div>
                  <div className="vv-conv-preview">Rolle: {g.role}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function chipStyle(active) {
  return {
    background: active ? "linear-gradient(135deg, #ec4899, #8b5cf6)" : "rgba(255,255,255,0.85)",
    color: active ? "#fff" : "#475569",
    border: active ? "none" : "1px solid rgba(0,0,0,0.08)",
    padding: "5px 12px",
    borderRadius: 999,
    fontSize: 11.5,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: active ? "0 2px 8px rgba(139,92,246,0.3)" : "none",
  };
}
