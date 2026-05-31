"use client";

// Friedhof: verstorbene VIBOs als Erinnerungs-Karten. Optional mit Epitaph.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const SPECIES_EMOJI = {
  sprout: "🌱", kitsune: "🦊", drago: "🐉", knuddi: "🫧", stella: "⭐",
};

export default function ViboCemetery({ onBack }) {
  const [graves, setGraves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // id
  const [draft, setDraft] = useState("");

  const load = useCallback(async () => {
    try { const r = await api.viboCemetery(); setGraves(r.graves || []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function saveEpitaph(id) {
    try {
      await api.viboEpitaph(id, draft);
      setEditing(null); setDraft("");
      await load();
    } catch (e) { alert(e.message); }
  }

  if (loading) return <div style={{ textAlign: "center", padding: 20 }}>Lade Friedhof…</div>;

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        {onBack && (
          <button type="button" onClick={onBack}
            style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", color: "var(--vv-accent, #007aff)" }}>
            ← Zurück
          </button>
        )}
        <div style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: 700 }}>🏆 VIBO-Friedhof</div>
        <div style={{ width: 50 }} />
      </div>

      {graves.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--vv-muted, #666)", padding: 40 }}>
          <div style={{ fontSize: 50 }}>🌷</div>
          Noch keine verstorbenen VIBOs.<br />
          <span style={{ fontSize: 12, fontStyle: "italic" }}>Pflege sie gut, dann bleibt der Friedhof leer.</span>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {graves.map((g) => (
            <div key={g.id} style={{
              background: "linear-gradient(180deg, #f5f5f7 0%, #e5e5ea 100%)",
              borderRadius: 14, padding: 14,
              border: "1px solid #d1d5db",
              fontFamily: "-apple-system, system-ui, sans-serif",
              color: "#1c1c1e",
              textAlign: "center",
            }}>
              {/* Pixel-Grabstein-Look */}
              <div style={{ fontSize: 40, lineHeight: 1 }}>🪦</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                {SPECIES_EMOJI[g.species] || "💫"} {g.name}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                geboren {new Date(g.hatchedAt).toLocaleDateString("de-DE")}<br />
                heimgegangen {new Date(g.diedAt).toLocaleDateString("de-DE")} · {g.ageDays} Tag{g.ageDays === 1 ? "" : "e"} alt
              </div>
              {g.deathReason && (
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, fontStyle: "italic" }}>
                  ✝ {g.deathReason}
                </div>
              )}

              {editing === g.id ? (
                <div style={{ marginTop: 8 }}>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, 140))}
                    placeholder="Grabinschrift (max 140 Zeichen)…"
                    rows={2}
                    style={{ width: "100%", padding: 6, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, resize: "none" }}
                  />
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
                    <button type="button" onClick={() => setEditing(null)} className="vv-btn-big vv-btn-big-ghost" style={{ padding: "8px 14px", fontSize: 12 }}>Abbrechen</button>
                    <button type="button" onClick={() => saveEpitaph(g.id)} className="vv-btn-big vv-btn-big-pink" style={{ padding: "8px 14px", fontSize: 12 }}>Speichern</button>
                  </div>
                </div>
              ) : (
                <>
                  {g.epitaph && (
                    <div style={{
                      marginTop: 8, fontSize: 13, fontStyle: "italic",
                      color: "#4b5563", padding: "6px 12px",
                      background: "rgba(255,255,255,0.6)", borderRadius: 8,
                    }}>"{g.epitaph}"</div>
                  )}
                  <button type="button" onClick={() => { setEditing(g.id); setDraft(g.epitaph || ""); }}
                    style={{ background: "none", border: "none", color: "#6b7280", fontSize: 11, cursor: "pointer", marginTop: 6 }}>
                    {g.epitaph ? "✎ Inschrift bearbeiten" : "+ Inschrift hinzufügen"}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
