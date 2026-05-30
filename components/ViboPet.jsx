"use client";

// Das Tamagotchi-Ei-Gehäuse mit VIBO drin: blauer Glitzer-Ei-Look,
// goldener Achteck-Rahmen ums Display, 8 Status-Icons rum, 3 Knöpfe.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ViboSprite from "./ViboSprite";
import ViboCemetery from "./ViboCemetery";
import { ACTIONS, SPECIES, stageInfo } from "@/lib/vibo";

function Stat({ label, value, color }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 70 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--vv-muted,#666)" }}>
        <span>{label}</span><span>{value}</span>
      </div>
      <div style={{ height: 6, background: "rgba(120,120,128,0.2)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function Egg({ children }) {
  return (
    <div style={{
      position: "relative",
      width: "min(340px, 92vw)",
      aspectRatio: "0.78",
      background: "radial-gradient(circle at 35% 22%, #6aa3ff 0%, #1f5fa8 40%, #0a1b3f 100%)",
      borderRadius: "50% / 45% 45% 55% 55%",
      boxShadow: "0 18px 50px rgba(0,0,0,0.45), inset 0 0 80px rgba(255,255,255,0.06), inset 0 -20px 40px rgba(0,0,0,0.4)",
      padding: 18,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      overflow: "hidden",
    }}>
      {/* Sterne/Glitzer */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background:
          "radial-gradient(circle at 18% 10%, #fff 0px, transparent 1.5px), " +
          "radial-gradient(circle at 80% 18%, #fde68a 0px, transparent 1.5px), " +
          "radial-gradient(circle at 75% 65%, #fff 0px, transparent 1.5px), " +
          "radial-gradient(circle at 30% 80%, #c7d2fe 0px, transparent 1.5px), " +
          "radial-gradient(circle at 50% 40%, #fff 0px, transparent 1.5px)",
        opacity: 0.7,
      }} />
      {/* Logo oben */}
      <div style={{
        marginTop: 8, marginBottom: 10, color: "#fde68a",
        fontWeight: 900, fontSize: 22, letterSpacing: 1.5,
        textShadow: "0 2px 4px rgba(0,0,0,0.6)",
        fontFamily: "-apple-system, system-ui, sans-serif",
      }}>VIBO</div>
      {children}
    </div>
  );
}

function Display({ vibo, error }) {
  // Achteck im Gold-Look
  return (
    <div style={{
      width: "78%", aspectRatio: "1",
      background: "linear-gradient(135deg, #fde68a 0%, #f59e0b 50%, #b45309 100%)",
      clipPath: "polygon(20% 0, 80% 0, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0 80%, 0 20%)",
      padding: 12,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
    }}>
      <div style={{
        width: "100%", height: "100%",
        background: "linear-gradient(180deg, #d6e4dd 0%, #b8d4c8 50%, #8eb6a4 100%)",
        borderRadius: 6,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "inset 0 4px 8px rgba(0,0,0,0.2)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Status-Icons-Rand */}
        <div style={{ position: "absolute", top: 4, left: 4, right: 4, display: "flex", justifyContent: "space-between", fontSize: 10, color: "#1c1c1e" }}>
          <span>🍴</span><span>💡</span><span>🎮</span><span>🚿</span>
        </div>
        <div style={{ position: "absolute", bottom: 4, left: 4, right: 4, display: "flex", justifyContent: "space-between", fontSize: 10, color: "#1c1c1e" }}>
          <span>💗</span><span>💊</span><span>🌙</span><span>📞</span>
        </div>
        {/* Pet oder Fehler */}
        {error ? (
          <div style={{ textAlign: "center", color: "#7c2d12", fontSize: 11, padding: 14 }}>{error}</div>
        ) : vibo ? (
          <ViboSprite stage={vibo.stage} species={vibo.species} mood={vibo.mood} size={120} />
        ) : (
          <div style={{ fontSize: 12, color: "#1c1c1e" }}>Lädt…</div>
        )}
      </div>
    </div>
  );
}

function Hatchery({ onHatched }) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("sprout");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function hatch(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const r = await api.viboHatch(name, species);
      onHatched(r.vibo);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={hatch} style={{ width: "100%", maxWidth: 400, margin: "0 auto", padding: 14 }}>
      <h2 style={{ textAlign: "center", margin: "0 0 6px" }}>🥚 VIBO schlüpfen lassen</h2>
      <p style={{ textAlign: "center", color: "var(--vv-muted,#666)", fontSize: 13, marginTop: 0 }}>
        Dein persönliches Pixel-Pet. Pflege es, sonst stirbt es. Mit Liebe lebt es 100+ Tage.
      </p>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginTop: 12 }}>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24}
        placeholder="z.B. Blümli" className="vv-input" style={{ width: "100%" }} required />
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginTop: 12 }}>Spezies</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 }}>
        {SPECIES.map((s) => (
          <button type="button" key={s.id}
            onClick={() => setSpecies(s.id)}
            style={{
              padding: "10px 6px", borderRadius: 12,
              border: `2px solid ${species === s.id ? s.primary : "rgba(120,120,128,0.2)"}`,
              background: species === s.id ? `${s.primary}20` : "transparent",
              cursor: "pointer", textAlign: "center", font: "inherit",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
            <span style={{ fontSize: 28 }}>{s.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{s.name}</span>
          </button>
        ))}
      </div>
      {error && <div style={{ color: "#c2185b", fontSize: 13, marginTop: 10 }}>⚠ {error}</div>}
      <button type="submit" disabled={busy || !name.trim()}
        className="vv-btn vv-btn-pink"
        style={{ marginTop: 16, width: "100%", padding: "12px", fontSize: 16 }}>
        {busy ? "Schlüpft…" : "🥚 Schlüpfen lassen"}
      </button>
    </form>
  );
}

export default function ViboPet() {
  const [vibo, setVibo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState("");
  const [showCemetery, setShowCemetery] = useState(false);

  async function load() {
    try {
      const r = await api.viboGet();
      setVibo(r.vibo);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!vibo || vibo.diedAt) return;
    const t = setInterval(load, 60_000); // jede Minute neu pollen
    return () => clearInterval(t);
  }, [vibo?.diedAt]);

  async function doAction(action) {
    setError(""); setActionBusy(action);
    try {
      const r = await api.viboAction(action);
      setVibo(r.vibo);
    } catch (e) {
      setError(e.message);
      setTimeout(() => setError(""), 3000);
    } finally { setActionBusy(""); }
  }

  if (showCemetery) return <ViboCemetery onBack={() => setShowCemetery(false)} />;

  if (loading) return <div style={{ textAlign: "center", padding: 30 }}>Lade dein VIBO…</div>;

  // Noch keins → Hatchery
  if (!vibo) {
    return (
      <>
        <Hatchery onHatched={(v) => setVibo(v)} />
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button type="button" onClick={() => setShowCemetery(true)}
            style={{ background: "none", border: "none", color: "var(--vv-accent, #007aff)", fontSize: 13, cursor: "pointer" }}>
            🏆 Friedhof besuchen
          </button>
        </div>
      </>
    );
  }

  const isDead = vibo.stage === "dead";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: 14 }}>
      <Egg>
        <Display vibo={vibo} error={error || (isDead ? `${vibo.name} ist verstorben (${vibo.deathReason || "Vernachlässigung"})` : "")} />
        {/* 3 Tamagotchi-Knöpfe */}
        <div style={{ marginTop: "auto", display: "flex", gap: 28, paddingBottom: 8 }}>
          <button aria-label="A" style={pillBtn} />
          <button aria-label="B" style={pillBtn} />
          <button aria-label="C" style={pillBtn} />
        </div>
      </Egg>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{vibo.name}</div>
        <div style={{ fontSize: 12, color: "var(--vv-muted,#666)" }}>
          {stageInfo(vibo.stage).label} · {vibo.ageDays} Tag{vibo.ageDays === 1 ? "" : "e"} · {vibo.mood}
        </div>
      </div>

      {!isDead && (
        <>
          <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 360, padding: "0 4px" }}>
            <Stat label="🍔 Hunger"    value={vibo.hunger}    color="#f59e0b" />
            <Stat label="🎮 Spaß"      value={vibo.fun}       color="#3b82f6" />
          </div>
          <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 360, padding: "0 4px" }}>
            <Stat label="🧼 Sauber"    value={vibo.hygiene}   color="#06b6d4" />
            <Stat label="🫶 Bindung"   value={vibo.affection} color="#ec4899" />
          </div>
          <div style={{ width: "100%", maxWidth: 360, padding: "0 4px" }}>
            <Stat label="❤️ Gesundheit" value={vibo.health} color={vibo.health > 60 ? "#10b981" : vibo.health > 30 ? "#f59e0b" : "#ef4444"} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: 8, width: "100%", maxWidth: 360 }}>
            {Object.entries(ACTIONS).map(([id, a]) => (
              <button key={id} type="button" disabled={actionBusy === id}
                onClick={() => doAction(id)}
                style={{
                  padding: "10px 6px", borderRadius: 12,
                  border: "1px solid rgba(120,120,128,0.2)",
                  background: "var(--vv-card,#fff)", color: "var(--vv-text,#1c1c1e)",
                  cursor: "pointer", font: "inherit", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 4, opacity: actionBusy === id ? 0.5 : 1,
                }}>
                <span style={{ fontSize: 22 }}>{a.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{a.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {isDead && (
        <button type="button" onClick={() => setVibo(null)}
          className="vv-btn vv-btn-pink"
          style={{ padding: "12px 24px", fontSize: 14 }}>
          🥚 Neues VIBO schlüpfen lassen
        </button>
      )}
    </div>
  );
}

const pillBtn = {
  width: 36, height: 36, borderRadius: "50%",
  background: "linear-gradient(180deg, #f3f4f6 0%, #d1d5db 100%)",
  border: "1px solid rgba(0,0,0,0.2)",
  boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.3)",
  cursor: "pointer",
};
