"use client";

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

  async function reload() {
    const d = await api.listGroups();
    setGroups(d.groups);
    setMine(d.mine);
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

  useEffect(() => { reload(); }, []);
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

      <div className="vv-grid-2">
        <div>
          <div className="vv-card">
            <h3>🌐 Alle Coms</h3>
            {groups.length === 0 && <div className="vv-muted">Noch keine Coms gegründet.</div>}
            {groups.map((g) => (
              <Link key={g.slug} href={`/gruppen/${g.slug}`} className="vv-conv-entry">
                <div className="vv-avatar vv-avatar-sm" style={{ fontSize: 26 }}>{g.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div className="vv-conv-name">{g.name}</div>
                  <div className="vv-conv-preview">{g.description}</div>
                  <div className="vv-muted" style={{ fontSize: 10 }}>
                    👥 {g.member_count} · 💬 {g.post_count} · seit {relTime(g.at)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="vv-card">
            <h3>👤 Meine Coms</h3>
            {!me && <div className="vv-muted">Logge dich ein, um Coms beizutreten.</div>}
            {me && mine.length === 0 && <div className="vv-muted">Noch keiner Com beigetreten.</div>}
            {mine.map((g) => (
              <Link key={g.slug} href={`/gruppen/${g.slug}`} className="vv-conv-entry">
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
