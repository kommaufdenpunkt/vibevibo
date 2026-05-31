"use client";

// Das Tamagotchi-Ei-Gehäuse mit VIBO drin: blauer Glitzer-Ei-Look,
// goldener Achteck-Rahmen ums Display, 8 Status-Icons rum, 3 Knöpfe.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ViboSprite from "./ViboSprite";
import ViboCemetery from "./ViboCemetery";
import ViboNeighbors from "./ViboNeighbors";
import ViboRoom from "./ViboRoom";
import ViboMinigame from "./ViboMinigame";
import HelpCard from "./HelpCard";
import { ACTIONS, SPECIES, stageInfo } from "@/lib/vibo";

function formatCooldown(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.ceil(seconds / 3600)}h`;
}

function actionBig(id) {
  switch (id) {
    case "feed":  return "vv-btn-big-orange";
    case "play":  return "vv-btn-big-cyan";
    case "clean": return "vv-btn-big-violet";
    case "pet":   return "vv-btn-big-pink";
    case "heal":  return "vv-btn-big-green";
    case "sleep": return "vv-btn-big-violet";
    default:      return "vv-btn-big-ghost";
  }
}

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
        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 60%, #e2e8f0 100%)",
        borderRadius: 6,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "inset 0 4px 10px rgba(0,0,0,0.18)",
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
          <div style={{ position: "relative" }}>
            <ViboSprite stage={vibo.stage} species={vibo.species} mood={vibo.mood} size={120} sleeping={vibo.sleeping} />
            {vibo.sleeping && (
              <div style={{ position: "absolute", top: -10, right: -14, fontSize: 24, animation: "vv-zzz 2s ease-in-out infinite" }}>💤</div>
            )}
            <style>{`
              @keyframes vv-zzz { 0%,100% { opacity: 0.4; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3px); } }
            `}</style>
          </div>
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
        className="vv-btn-big vv-btn-big-yellow"
        style={{ marginTop: 16, width: "100%", padding: "16px", fontSize: 16 }}>
        <span className="vv-btn-icon">🥚</span> {busy ? "Schlüpft…" : "Schlüpfen lassen"}
      </button>
    </form>
  );
}

// Was beim Action-Klick visuell passiert (fliegende Emojis)
const ACTION_FX = {
  feed:  { emojis: ["🍔", "🍟", "😋"],          color: "#f59e0b" },
  play:  { emojis: ["⚽", "🎮", "🎉"],          color: "#3b82f6" },
  clean: { emojis: ["🫧", "💧", "✨"],          color: "#06b6d4" },
  pet:   { emojis: ["💖", "💗", "💕", "💞"],   color: "#ec4899" },
  heal:  { emojis: ["💊", "✨", "❤️‍🩹"],       color: "#10b981" },
  sleep: { emojis: ["💤", "🌙", "z", "Z"],     color: "#6366f1" },
};

let fxIdCounter = 0;

export default function ViboPet() {
  const [vibo, setVibo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState("");
  const [showCemetery, setShowCemetery] = useState(false);
  const [showNeighbors, setShowNeighbors] = useState(false);
  const [showRoom, setShowRoom] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [floaters, setFloaters] = useState([]); // [{id, emoji, x, action}]

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
    const t = setInterval(load, 60_000); // jede Minute Stats neu pollen
    return () => clearInterval(t);
  }, [vibo?.diedAt]);
  // Cooldowns lokal jede Sekunde runterzählen (ohne Server-Roundtrip)
  useEffect(() => {
    if (!vibo || vibo.diedAt) return;
    const t = setInterval(() => {
      setVibo((prev) => {
        if (!prev || !prev.cooldowns) return prev;
        const next = { ...prev.cooldowns };
        let changed = false;
        for (const k of Object.keys(next)) {
          if (next[k] > 0) { next[k] = next[k] - 1; changed = true; }
        }
        return changed ? { ...prev, cooldowns: next } : prev;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [vibo?.diedAt]);

  function spawnFloater(action) {
    const fx = ACTION_FX[action];
    if (!fx) return;
    const count = 4 + Math.floor(Math.random() * 3);
    const newOnes = [];
    for (let i = 0; i < count; i++) {
      newOnes.push({
        id: ++fxIdCounter,
        emoji: fx.emojis[Math.floor(Math.random() * fx.emojis.length)],
        x: 30 + Math.random() * 40,            // % horizontal
        delay: i * 80,                          // ms staggered
      });
    }
    setFloaters((prev) => [...prev, ...newOnes]);
    setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => !newOnes.find((n) => n.id === f.id)));
    }, 2200);
  }

  async function doAction(action) {
    setError(""); setActionBusy(action);
    spawnFloater(action);  // sofort visuelles Feedback
    try {
      const r = await api.viboAction(action);
      setVibo(r.vibo);
    } catch (e) {
      setError(e.message);
      setTimeout(() => setError(""), 3000);
    } finally { setActionBusy(""); }
  }

  if (showCemetery) return <ViboCemetery onBack={() => setShowCemetery(false)} />;
  if (showNeighbors) return <ViboNeighbors onBack={() => setShowNeighbors(false)} />;
  if (showRoom) return <ViboRoom vibo={vibo} onClose={() => setShowRoom(false)} />;
  if (showGame) return <ViboMinigame vibo={vibo} onClose={() => { setShowGame(false); load(); }} />;

  if (loading) return <div style={{ textAlign: "center", padding: 30 }}>Lade dein VIBO…</div>;

  // Noch keins → Hatchery
  if (!vibo) {
    return (
      <>
        <div style={{ padding: "0 14px" }}>
          <HelpCard id="vibo-intro" title="Was ist ein VIBO?" emoji="🥚" color="#ec4899">
            Dein VIBO ist dein <b>virtuelles Haustier</b>. Du wählst eine
            Spezies und einen Namen, dann lebt es bei dir und du musst
            es pflegen — füttern, spielen, knuddeln, putzen. Wenn du es
            vernachlässigst, wird es krank und stirbt. Wenn du gut für
            es sorgst, wächst es vom Baby zum Erwachsenen und lebt
            100+ Tage.
            <br/><br/>
            <b>Was bringt's dir?</b> Du verdienst <b>Vibes ✨</b> (die
            Plattform-Währung) wenn du dich kümmerst. Mit Vibes kaufst
            du im Shop Essen, Spielzeug, Möbel für die VIBO-Wohnung.
            <br/><br/>
            <b>So fängst du an:</b> Name eintippen → Spezies auswählen →
            "Schlüpfen" klicken. Dein VIBO ist <b>sofort aktiv</b> (kein
            Warten mehr auf das Ei).
          </HelpCard>
        </div>
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
  const isEgg = vibo.stage === "egg";

  // Verbleibende Zeit bis Schlüpfen (ageDays < 0.25 = 6h)
  const hoursLeft = isEgg ? Math.max(0, 6 - (vibo.ageDays * 24)) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: 14 }}>
      {!isDead && (
        <div style={{ width: "100%", maxWidth: 420 }}>
          <HelpCard id="vibo-care" title="So pflegst du dein VIBO" emoji="🫶" color="#10b981">
            <b>5 Werte musst du im Auge behalten</b> (je näher 100, desto besser):<br/>
            • 🍔 <b>Hunger</b> — sinkt, wenn lange nicht gefüttert<br/>
            • 🎮 <b>Spaß</b> — sinkt, wenn lange nicht gespielt<br/>
            • 🧼 <b>Sauber</b> — sinkt mit der Zeit, Spielen + Essen machen schmutziger<br/>
            • 🫶 <b>Bindung</b> — wächst durch Knuddeln und Pflege<br/>
            • ❤️ <b>Gesundheit</b> — fällt wenn andere Werte zu lange niedrig sind. Bei 0 stirbt dein VIBO!
            <br/><br/>
            <b>6 Aktionen unten</b>: Füttern · Spielen · Putzen · Knuddeln · Heilen · Schlafen.
            Jede hat einen Cooldown (zeigt der Timer oben rechts).
            <br/><br/>
            <b>Wo bekomme ich Vibes ✨ her?</b> Tägliches Login, Quests erledigen,
            Knuddeln, Realitätskarte abklappern, Mini-Game spielen.
          </HelpCard>
        </div>
      )}
      <Egg>
        <Display vibo={vibo} error={error || (isDead ? `${vibo.name} ist verstorben (${vibo.deathReason || "Vernachlässigung"})` : "")} />

        {/* Floatende Action-Emojis */}
        {floaters.map((f) => (
          <div key={f.id} style={{
            position: "absolute", left: `${f.x}%`, bottom: "32%",
            fontSize: 26, pointerEvents: "none", zIndex: 50,
            animation: "vv-action-float 2.1s ease-out forwards",
            animationDelay: `${f.delay}ms`,
            opacity: 0,
            textShadow: "0 2px 4px rgba(0,0,0,0.4)",
          }}>{f.emoji}</div>
        ))}

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
          {vibo.sleeping && " · 💤 schläft"}
        </div>
      </div>

      {vibo.birthdayJustHappened && (
        <div style={{
          background: "linear-gradient(135deg, #fbbf24, #f97316)",
          color: "#fff", padding: "10px 16px", borderRadius: 12,
          textAlign: "center", fontWeight: 700,
          boxShadow: "0 4px 12px rgba(251,191,36,0.4)",
        }}>
          🎂 Geburtstag! +15 Vibes als Geschenk!
        </div>
      )}

      {isEgg && vibo.egg && (
        <div style={{
          background: "linear-gradient(135deg, #fef3c7, #fde68a)",
          border: "2px dashed #f59e0b", borderRadius: 14,
          padding: 16, width: "100%", maxWidth: 380,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e", marginBottom: 8, textAlign: "center" }}>
            🥚 Dein VIBO ist noch ein Ei
            {(vibo.egg.timePct > 90 || vibo.egg.distancePct > 90) && (
              <span style={{ marginLeft: 6, animation: "vv-egg-shake 0.6s ease-in-out infinite", display: "inline-block" }}>
                💥
              </span>
            )}
          </div>

          {/* Zeit-Balken */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#78350f", marginBottom: 3 }}>
              <span>⏱ Zeit</span>
              <span>{Math.ceil(vibo.egg.hoursLeft)}h verbleibend</span>
            </div>
            <div style={{ height: 8, background: "rgba(146,64,14,0.18)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${vibo.egg.timePct}%`, background: "linear-gradient(90deg, #fbbf24, #f97316)", transition: "width 0.6s ease" }} />
            </div>
          </div>

          {/* Distanz-Balken (Pokémon-Go-Style!) */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#78350f", marginBottom: 3 }}>
              <span>🚶 Laufdistanz</span>
              <span>{((vibo.distanceWalkedM || 0) / 1000).toFixed(2)} / {(vibo.egg.hatchDistanceM / 1000).toFixed(1)} km</span>
            </div>
            <div style={{ height: 8, background: "rgba(146,64,14,0.18)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${vibo.egg.distancePct}%`, background: "linear-gradient(90deg, #3b82f6, #06b6d4)", transition: "width 0.6s ease" }} />
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#78350f", textAlign: "center", marginTop: 6, fontStyle: "italic" }}>
            Schlüpft wenn <b>Zeit</b> oder <b>Distanz</b> voll ist — was schneller geht.<br/>
            Geh raus & öffne die Realitätskarte, damit's mitzählt!
          </div>
        </div>
      )}

      {!isDead && !isEgg && (
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10, width: "100%", maxWidth: 380 }}>
            {Object.entries(ACTIONS).map(([id, a]) => {
              const cd = (vibo.cooldowns && vibo.cooldowns[id]) || 0;
              const onCooldown = cd > 0;
              return (
                <button key={id} type="button" disabled={actionBusy === id || onCooldown}
                  onClick={() => doAction(id)}
                  className={`vv-btn-big ${actionBig(id)}`}
                  style={{ flexDirection: "column", padding: "12px 8px", fontSize: 13, position: "relative", opacity: onCooldown ? 0.55 : 1 }}
                >
                  <span className="vv-btn-icon" style={{ fontSize: 28 }}>{a.emoji}</span>
                  <span>{a.label}</span>
                  {onCooldown && (
                    <span style={{
                      position: "absolute", top: 4, right: 6,
                      background: "rgba(0,0,0,0.55)", color: "#fff",
                      fontSize: 10, fontWeight: 700,
                      padding: "1px 5px", borderRadius: 999,
                    }}>{formatCooldown(cd)}</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {isDead && (
        <button type="button" onClick={() => setVibo(null)}
          className="vv-btn-big vv-btn-big-pink"
          style={{ padding: "14px 24px", fontSize: 15 }}>
          🥚 Neues VIBO schlüpfen lassen
        </button>
      )}

      {/* Footer-Zeile 1: Zimmer + Mini-Game (nicht im Ei-Stadium) */}
      {!isDead && !isEgg && (
        <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 380 }}>
          <button type="button" onClick={() => setShowRoom(true)}
            className="vv-btn-big vv-btn-big-yellow"
            style={{ flex: 1, padding: "14px 12px" }}>
            <span className="vv-btn-icon" style={{ fontSize: 20 }}>🏠</span>
            Zuhause
          </button>
          <button type="button" onClick={() => setShowGame(true)}
            className="vv-btn-big vv-btn-big-orange"
            style={{ flex: 1, padding: "14px 12px" }}>
            <span className="vv-btn-icon" style={{ fontSize: 20 }}>🍕</span>
            Snack-Game
          </button>
        </div>
      )}

      {/* Footer-Zeile 2: Nachbarn + Friedhof */}
      <div style={{ display: "flex", gap: 10, marginTop: 4, width: "100%", maxWidth: 380 }}>
        <button type="button" onClick={() => setShowNeighbors(true)}
          className="vv-btn-big vv-btn-big-cyan"
          style={{ flex: 1 }}>
          <span className="vv-btn-icon">👋</span> Nachbarn
        </button>
        <button type="button" onClick={() => setShowCemetery(true)}
          className="vv-btn-big vv-btn-big-ghost"
          style={{ flex: 1 }}>
          <span className="vv-btn-icon">🏆</span> Friedhof
        </button>
      </div>

      <style>{`
        @keyframes vv-egg-shake { 0%,100% { transform: rotate(0) } 25% { transform: rotate(-12deg) } 75% { transform: rotate(12deg) } }
        @keyframes vv-action-float {
          0%   { opacity: 0; transform: translateY(0) scale(0.6) rotate(-8deg) }
          15%  { opacity: 1; transform: translateY(-10px) scale(1.1) rotate(4deg) }
          70%  { opacity: 1; transform: translateY(-60px) scale(1) rotate(-3deg) }
          100% { opacity: 0; transform: translateY(-90px) scale(0.8) rotate(6deg) }
        }
      `}</style>
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
