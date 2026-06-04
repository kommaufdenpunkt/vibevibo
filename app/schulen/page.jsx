"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";

export default function SchulenPage() {
  const { me } = useMe();
  const [schools, setSchools] = useState(null);
  const [cities, setCities] = useState([]);
  const [filter, setFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  useEffect(() => {
    fetch("/api/schools/list" + (cityFilter ? `?city=${encodeURIComponent(cityFilter)}` : ""))
      .then((r) => r.json()).then((d) => setSchools(d.schools || []));
    fetch("/api/cities").then((r) => r.json()).then((d) => setCities(d.cities || []));
  }, [cityFilter]);

  const filtered = (schools || []).filter((s) =>
    !filter || s.school.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="vv-card">
      <h2 style={{ margin: "0 0 4px" }}>🏫 Schulen & Unis</h2>
      <div className="vv-muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Wer war mit dir in der Klasse? Trag deine Schule im{" "}
        {me ? <Link href="/profile/edit">Profil</Link> : "Profil"} ein und finde alte Bekannte.
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          className="vv-input"
          placeholder="🔍 Schule suchen…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select className="vv-input" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} style={{ minWidth: 150 }}>
          <option value="">Alle Städte</option>
          {cities.map((c) => (
            <option key={c.city} value={c.city}>{c.city} ({c.n})</option>
          ))}
        </select>
      </div>

      {schools === null && <div className="vv-muted">Lade Schulen…</div>}
      {schools !== null && filtered.length === 0 && (
        <div className="vv-muted" style={{ padding: 20, textAlign: "center" }}>
          {schools.length === 0
            ? "Noch keine Schulen — du wirst der erste sein!"
            : "Keine Schule gefunden mit diesem Filter."}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
        {filtered.map((s) => (
          <Link key={`${s.school}|${s.city}`} href={`/schulen/${encodeURIComponent(s.school)}`}
            style={{
              display: "block", padding: 12, borderRadius: 10,
              background: "linear-gradient(135deg, #fef3c7, #fde68a)",
              border: "1px solid #f59e0b", color: "#7c2d12", textDecoration: "none",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}>
            <div style={{ fontSize: 22, marginBottom: 2 }}>🏫</div>
            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{s.school}</div>
            {s.city && <div style={{ fontSize: 11, color: "#92400e", marginTop: 2 }}>📍 {s.city}</div>}
            <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600 }}>
              {s.n} {s.n === 1 ? "Mitglied" : "Mitglieder"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
