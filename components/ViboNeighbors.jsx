"use client";

// Nachbarn-Modus: Liste anderer User mit VIBO, kann besucht und geknuddelt werden.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import ViboSprite from "./ViboSprite";

const SPECIES_NAMES = {
  sprout: "Sprössling", kitsune: "Kitsune", drago: "Drago", knuddi: "Knuddi", stella: "Stella",
};

export default function ViboNeighbors({ onBack }) {
  const [users, setUsers] = useState([]);
  const [neighbors, setNeighbors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKnuddel, setBusyKnuddel] = useState("");
  const [flash, setFlash] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const u = await api.listUsers();
      const list = (u.users || []).filter((x) => x.username);
      setUsers(list);
      // Vibos der Nachbarn laden (parallel, ignoriert Fehler/leer)
      const results = await Promise.all(list.slice(0, 30).map(async (user) => {
        try {
          const r = await api.viboOf(user.username);
          if (r?.vibo) return { user, vibo: r.vibo };
        } catch {}
        return null;
      }));
      setNeighbors(results.filter(Boolean));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function knuddel(username) {
    setBusyKnuddel(username);
    try {
      await api.viboKnuddel(username);
      setFlash(`Du hast ${username}s VIBO geknuddelt 🫶 (+1 ✨)`);
      setTimeout(() => setFlash(""), 3500);
      await load();
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 3500);
    } finally { setBusyKnuddel(""); }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        {onBack && (
          <button type="button" onClick={onBack}
            style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", color: "var(--vv-accent,#007aff)" }}>← Zurück</button>
        )}
        <div style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: 700 }}>🏠 VIBO-Nachbarn</div>
        <div style={{ width: 50 }} />
      </div>

      {flash && (
        <div style={{
          background: flash.startsWith("⚠") ? "#fef3c7" : "#dcfce7",
          color: flash.startsWith("⚠") ? "#92400e" : "#166534",
          padding: 10, borderRadius: 10, textAlign: "center", marginBottom: 10, fontSize: 13, fontWeight: 600,
        }}>{flash}</div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 30 }}>Lade Nachbarn…</div>
      ) : neighbors.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--vv-muted,#666)", padding: 40 }}>
          <div style={{ fontSize: 50 }}>🏘️</div>
          Noch niemand hier hat ein VIBO.<br />
          <span style={{ fontSize: 12, fontStyle: "italic" }}>Erzähl deinen Freunden davon!</span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {neighbors.map(({ user, vibo }) => (
            <div key={user.username} style={{
              background: "var(--vv-card,#fff)", borderRadius: 14, padding: 12,
              border: "1px solid var(--vv-border,#eee)", textAlign: "center",
            }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                <ViboSprite stage={vibo.stage} species={vibo.species} mood={vibo.mood} size={72} sleeping={vibo.sleeping} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{vibo.name}</div>
              <div style={{ fontSize: 11, color: "var(--vv-muted,#666)" }}>
                bei @{user.username}
              </div>
              <div style={{ fontSize: 10, color: "var(--vv-muted,#888)", marginTop: 2 }}>
                {SPECIES_NAMES[vibo.species]} · {vibo.ageDays}d · {vibo.mood}
                {vibo.sleeping && " · 💤"}
              </div>
              <button type="button" disabled={busyKnuddel === user.username || vibo.stage === "dead"}
                onClick={() => knuddel(user.username)}
                className={`vv-btn-big ${vibo.stage === "dead" ? "vv-btn-big-ghost" : "vv-btn-big-pink"}`}
                style={{ marginTop: 8, width: "100%", padding: "10px 6px", fontSize: 13 }}>
                🫶 Knuddeln
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: "var(--vv-muted,#888)", marginTop: 12, textAlign: "center", fontStyle: "italic" }}>
        1× pro Nachbar/Tag · +5 Affection bei deren VIBO · +1 ✨ für dich
      </div>
    </div>
  );
}
