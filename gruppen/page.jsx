"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { relTime } from "@/lib/format";

export default function GruppenPage() {
  const { me } = useMe();
  const [groups, setGroups] = useState([]);
  const [mine, setMine] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", emoji: "👥" });

  async function reload() {
    const d = await api.listGroups();
    setGroups(d.groups);
    setMine(d.mine);
  }

  useEffect(() => { reload(); }, []);

  async function create(e) {
    e.preventDefault();
    try {
      await api.createGroup(form);
      setForm({ name: "", slug: "", description: "", emoji: "👥" });
      setCreating(false);
      reload();
    } catch (e) { alert(e.message); }
  }

  return (
    <>
      <div className="vv-card">
        <h2>🏘️ Gruppen & Communities</h2>
        <p className="vv-muted">
          Triff Gleichgesinnte - Fan-Clubs, Stammtische, Themen-Foren. Wie früher
          bei SchülerVZ und Lokalisten.
        </p>
        {me && (
          <div className="vv-row vv-mt-8">
            <div className="vv-spacer" />
            <button className="vv-btn vv-btn-pink" onClick={() => setCreating((c) => !c)}>
              {creating ? "− Abbrechen" : "+ Neue Gruppe gründen"}
            </button>
          </div>
        )}
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
            <button type="submit" className="vv-btn vv-btn-pink vv-mt-12">✿ Gründen</button>
          </form>
        )}
      </div>

      <div className="vv-grid-2">
        <div>
          <div className="vv-card">
            <h3>🌐 Alle Gruppen</h3>
            {groups.length === 0 && <div className="vv-muted">Noch keine Gruppen.</div>}
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
            <h3>👤 Meine Gruppen</h3>
            {!me && <div className="vv-muted">Logge dich ein, um Gruppen beizutreten.</div>}
            {me && mine.length === 0 && <div className="vv-muted">Noch keinen Gruppen beigetreten.</div>}
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
