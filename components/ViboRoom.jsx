"use client";

// Die VIBO-Wohnung: isometrischer Raum mit Tag/Nacht-Fenster, Wolken,
// Sternen, animierten Möbeln und autonom wanderndem VIBO.
// Edit-Modus: Möbel aus Inventar in freie Slots ziehen.

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import ViboSprite from "./ViboSprite";
import FurnitureSprite from "./RoomFurniture";
import { TIME_THEMES } from "@/lib/room";

const ROOM_W = 360;
const ROOM_H = 280;

function Sky({ phase }) {
  const theme = TIME_THEMES[phase] || TIME_THEMES.day;
  return (
    <div style={{ position: "absolute", inset: 0, background: theme.sky, transition: "background 1.2s ease" }}>
      {/* Sterne nur nachts/dämmerung */}
      {(phase === "night" || phase === "dusk") && (
        <>
          {[[15,12],[28,22],[42,8],[58,18],[72,10],[86,24],[20,40],[78,42],[35,32],[64,36]].map(([x,y],i) => (
            <div key={i} style={{
              position: "absolute", left: `${x}%`, top: `${y}%`,
              width: 2, height: 2, background: "#fff", borderRadius: "50%",
              animation: `vv-twinkle ${1.5 + (i % 4) * 0.4}s ease-in-out infinite`,
              boxShadow: "0 0 4px #fff",
            }} />
          ))}
          <div style={{
            position: "absolute", left: "70%", top: "20%",
            width: 28, height: 28, borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #fef3c7 0%, #e5e7eb 60%, #9ca3af 100%)",
            boxShadow: "0 0 20px rgba(255,255,255,0.5)",
          }} />
        </>
      )}
      {/* Sonne tagsüber */}
      {(phase === "day" || phase === "dawn" || phase === "evening") && (
        <div style={{
          position: "absolute", left: phase === "dawn" ? "20%" : phase === "evening" ? "75%" : "50%",
          top: phase === "day" ? "12%" : "28%",
          width: 32, height: 32, borderRadius: "50%",
          background: "radial-gradient(circle, #fef3c7 0%, #fde047 50%, #f59e0b 100%)",
          boxShadow: "0 0 25px rgba(253,224,71,0.7)",
          transition: "all 1.2s ease",
        }} />
      )}
      {/* Wolken tagsüber */}
      {phase === "day" && (
        <>
          <div style={cloudStyle(10, 30, 30, 0)} />
          <div style={cloudStyle(50, 50, 22, 1)} />
          <div style={cloudStyle(75, 18, 26, 2)} />
        </>
      )}
    </div>
  );
}

function cloudStyle(left, top, w, idx) {
  return {
    position: "absolute",
    left: `${left}%`, top: `${top}%`,
    width: w, height: w * 0.55,
    background: "radial-gradient(circle, #fff 30%, transparent 70%)",
    borderRadius: "50%",
    opacity: 0.75,
    animation: `vv-cloud ${20 + idx * 6}s linear infinite`,
  };
}

function Window({ phase }) {
  return (
    <div style={{
      position: "absolute",
      left: "8%", top: 18,
      width: 96, height: 70,
      borderRadius: 6,
      border: "4px solid #78350f",
      background: "#1e293b",
      overflow: "hidden",
      boxShadow: "inset 0 2px 6px rgba(0,0,0,0.4)",
    }}>
      <Sky phase={phase} />
      {/* Fensterkreuz */}
      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 3, background: "#78350f", marginLeft: -1.5 }} />
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 3, background: "#78350f", marginTop: -1.5 }} />
    </div>
  );
}

function Floor({ phase }) {
  // Boden in Perspektive: trapezförmig
  const theme = TIME_THEMES[phase] || TIME_THEMES.day;
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      height: "55%",
      background: `repeating-linear-gradient(90deg, ${theme.floor} 0px, ${theme.floor} 28px, rgba(0,0,0,0.08) 28px, rgba(0,0,0,0.08) 30px)`,
      clipPath: "polygon(0% 18%, 100% 18%, 92% 100%, 8% 100%)",
      boxShadow: "inset 0 0 30px rgba(0,0,0,0.25)",
    }}>
      {/* Bodenleiste */}
      <div style={{
        position: "absolute", top: "18%", left: "0%", right: "0%", height: 4,
        background: "linear-gradient(180deg, rgba(0,0,0,0.3), rgba(0,0,0,0))",
      }} />
    </div>
  );
}

function Wall({ phase }) {
  const theme = TIME_THEMES[phase] || TIME_THEMES.day;
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0,
      height: "55%",
      background: `linear-gradient(180deg, ${theme.wall} 0%, ${shade(theme.wall, -10)} 100%)`,
      transition: "background 1.2s ease",
    }}>
      {/* Tapeten-Streifen */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.4,
        backgroundImage: "repeating-linear-gradient(0deg, transparent 0 24px, rgba(180,80,40,0.18) 24px 26px)",
      }} />
      {/* Licht-Glow */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 100%, ${theme.light}, transparent 70%)`, pointerEvents: "none" }} />
    </div>
  );
}

function shade(hex, amt) {
  const c = hex.replace("#", "");
  if (c.length !== 6) return hex;
  const r = Math.max(0, Math.min(255, parseInt(c.slice(0,2), 16) + amt));
  const g = Math.max(0, Math.min(255, parseInt(c.slice(2,4), 16) + amt));
  const b = Math.max(0, Math.min(255, parseInt(c.slice(4,6), 16) + amt));
  return `rgb(${r},${g},${b})`;
}

function MoodParticles({ mood, sleeping }) {
  if (sleeping) {
    return (
      <>
        <span style={{ position: "absolute", top: -8, right: 4, fontSize: 14, animation: "vv-zfloat 3s ease-in-out infinite" }}>💤</span>
        <span style={{ position: "absolute", top: -2, right: 14, fontSize: 10, animation: "vv-zfloat 3s 0.6s ease-in-out infinite" }}>z</span>
      </>
    );
  }
  if (mood === "glücklich") {
    return (
      <>
        <span style={{ position: "absolute", top: -10, left: -4, fontSize: 12, animation: "vv-heartfloat 2.5s ease-in-out infinite" }}>💖</span>
        <span style={{ position: "absolute", top: -6, right: -4, fontSize: 10, animation: "vv-heartfloat 2.5s 0.8s ease-in-out infinite" }}>✨</span>
      </>
    );
  }
  if (mood === "traurig" || mood === "krank") {
    return (
      <span style={{ position: "absolute", top: -10, right: 0, fontSize: 12 }}>💧</span>
    );
  }
  return null;
}

function PlacedItem({ p, editing, onRemove }) {
  return (
    <div style={{
      position: "absolute",
      left: `${p.x}%`, top: `${p.y}%`,
      transform: `translate(-50%, -90%)`,
      zIndex: 100 + Math.round(p.y),
      cursor: editing ? "pointer" : "default",
    }}>
      <div style={{ position: "relative" }}>
        <FurnitureSprite kind={p.kind} w={p.w} h={p.h} />
        {editing && (
          <button onClick={() => onRemove(p.slot)} aria-label="entfernen"
            style={{
              position: "absolute", top: -8, right: -8,
              width: 22, height: 22, borderRadius: "50%",
              background: "#dc2626", color: "#fff", border: "2px solid #fff",
              fontWeight: 800, fontSize: 12, cursor: "pointer", lineHeight: 1,
            }}>×</button>
        )}
      </div>
    </div>
  );
}

function EmptySlot({ s, onClick }) {
  return (
    <button onClick={() => onClick(s.slot)} aria-label="leerer Platz"
      style={{
        position: "absolute",
        left: `${s.x}%`, top: `${s.y}%`,
        transform: `translate(-50%, -50%)`,
        width: 44, height: 44, borderRadius: 8,
        background: "rgba(255,255,255,0.15)",
        border: "2px dashed rgba(255,255,255,0.5)",
        color: "#fff", fontSize: 22, fontWeight: 700,
        cursor: "pointer", zIndex: 90,
        boxShadow: "inset 0 0 10px rgba(255,255,255,0.2)",
        animation: "vv-slot-pulse 1.6s ease-in-out infinite",
      }}>+</button>
  );
}

function InventoryDrawer({ inv, onPlace, onClose }) {
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      background: "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(15,23,42,1))",
      padding: 12,
      borderTop: "3px solid #fbbf24",
      maxHeight: "60%", overflowY: "auto",
      zIndex: 500,
      borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>📦 Mein Möbel-Inventar</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#fbbf24", fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>
      {inv.length === 0 ? (
        <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: 20 }}>
          Noch keine Möbel. Geh in den Shop und kauf was!
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 6 }}>
          {inv.map((i) => (
            <button key={i.kind} onClick={() => onPlace(i.kind)}
              style={{
                background: "rgba(251,191,36,0.15)",
                border: "2px solid rgba(251,191,36,0.5)",
                borderRadius: 8, padding: "8px 4px",
                cursor: "pointer", color: "#fff",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                position: "relative",
              }}>
              <span style={{ fontSize: 26 }}>{i.emoji}</span>
              <span style={{ fontSize: 9, fontWeight: 600 }}>{i.name}</span>
              {i.count > 1 && (
                <span style={{
                  position: "absolute", top: 2, right: 2,
                  background: "#fbbf24", color: "#1c1917",
                  fontWeight: 800, fontSize: 9, padding: "1px 5px", borderRadius: 999,
                }}>{i.count}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Autonomes Wandern: VIBO bewegt sich alle 6-10s zu zufälliger Position
function useWalking(takenSlots, vibo) {
  const [pos, setPos] = useState({ x: 50, y: 60, facing: 1 });
  useEffect(() => {
    if (!vibo || vibo.sleeping || vibo.stage === "dead") {
      // Schlafmodus → ans erste Bett, sonst Mitte
      const bedSlot = takenSlots.find((s) => s.kind === "furn_bed");
      if (bedSlot) setPos({ x: bedSlot.x, y: bedSlot.y - 6, facing: 1 });
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const nx = 15 + Math.random() * 70;
      const ny = 55 + Math.random() * 30;
      setPos((prev) => ({ x: nx, y: ny, facing: nx > prev.x ? 1 : -1 }));
      const next = 6000 + Math.random() * 4000;
      timer = setTimeout(tick, next);
    };
    let timer = setTimeout(tick, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [vibo?.sleeping, vibo?.stage, takenSlots]);
  return pos;
}

export default function ViboRoom({ vibo, onClose }) {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showInv, setShowInv] = useState(false);
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState(false);
  const [tapBurst, setTapBurst] = useState(0);

  const load = useCallback(async () => {
    try { setData(await api.viboRoom()); } catch (e) { setFlash(`⚠ ${e.message}`); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Tageszeit alle 60s neu rechnen (Anzeige)
  useEffect(() => {
    const t = setInterval(load, 5 * 60_000);
    return () => clearInterval(t);
  }, [load]);

  const pos = useWalking(data?.placed || [], vibo);

  async function placeKind(kind) {
    setBusy(true);
    try {
      await api.viboRoomPlace(kind, null);
      setFlash(`+ ${kind.replace("furn_", "")} platziert`);
      setTimeout(() => setFlash(""), 1800);
      await load();
    } catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 2200); }
    finally { setBusy(false); }
  }

  async function removeSlot(slot) {
    if (!confirm("Möbel zurück ins Inventar?")) return;
    setBusy(true);
    try { await api.viboRoomRemove(slot); await load(); }
    catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 2200); }
    finally { setBusy(false); }
  }

  async function upgradeRoom() {
    if (!data?.meta?.nextLevel) return;
    if (!confirm(`Wohnung auf "${data.meta.nextLevel.label}" upgraden? Kostet ${data.meta.nextLevel.cost} ✨`)) return;
    setBusy(true);
    try {
      await api.viboRoomUpgrade();
      setFlash(`🎉 Wohnung upgegradet!`);
      setTimeout(() => setFlash(""), 2200);
      await load();
    } catch (e) { setFlash(`⚠ ${e.message}`); setTimeout(() => setFlash(""), 2200); }
    finally { setBusy(false); }
  }

  function tapVibo() {
    setTapBurst(Date.now());
  }

  if (!data) return <div style={{ textAlign: "center", padding: 24 }}>Lade Zuhause…</div>;

  const phase = data.time?.phase || "day";
  const taken = new Set(data.placed.map((p) => p.slot));
  const emptySlots = data.slots
    .map((s, i) => ({ ...s, slot: i }))
    .filter((s) => !taken.has(s.slot));

  return (
    <div style={{ padding: 12, maxWidth: 420, margin: "0 auto" }}>
      {/* Kopfzeile */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 10, padding: "0 4px",
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17 }}>
            🏠 {vibo?.name || "VIBO"}s {data.meta.levelLabel}
          </h3>
          <div style={{ fontSize: 11, color: "var(--vv-muted,#666)" }}>
            {data.time.emoji} {data.time.label} · {data.placed.length}/{data.meta.capacity} Möbel
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="vv-btn-big vv-btn-big-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>
            ← Zurück
          </button>
        )}
      </div>

      {/* DER RAUM */}
      <div style={{
        position: "relative",
        width: "100%", maxWidth: ROOM_W,
        aspectRatio: `${ROOM_W} / ${ROOM_H}`,
        margin: "0 auto",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 12px 36px rgba(0,0,0,0.35), inset 0 0 60px rgba(0,0,0,0.15)",
        border: "3px solid #78350f",
      }}>
        <Wall phase={phase} />
        <Floor phase={phase} />
        <Window phase={phase} />

        {/* Platzierte Möbel */}
        {data.placed.map((p) => (
          <PlacedItem key={p.slot} p={p} editing={editing} onRemove={removeSlot} />
        ))}

        {/* Leere Slots im Edit-Modus */}
        {editing && emptySlots.map((s) => (
          <EmptySlot key={s.slot} s={s} onClick={() => setShowInv(true)} />
        ))}

        {/* VIBO selbst */}
        {vibo && vibo.stage !== "dead" && (
          <div
            onClick={tapVibo}
            style={{
              position: "absolute",
              left: `${pos.x}%`, top: `${pos.y}%`,
              transform: `translate(-50%, -90%) scaleX(${pos.facing})`,
              transition: "left 5s ease-in-out, top 5s ease-in-out",
              zIndex: 200,
              cursor: "pointer",
            }}
          >
            <div style={{ position: "relative", transform: `scaleX(${pos.facing})` /* Mood-Partikel bleiben aufrecht */ }}>
              <ViboSprite stage={vibo.stage} species={vibo.species} mood={vibo.mood} sleeping={vibo.sleeping} size={64} />
              <MoodParticles mood={vibo.mood} sleeping={vibo.sleeping} />
              {tapBurst > 0 && (
                <span key={tapBurst} style={{
                  position: "absolute", top: -20, left: "50%", fontSize: 22,
                  transform: "translateX(-50%)",
                  animation: "vv-tapheart 1.2s ease-out forwards",
                  pointerEvents: "none",
                }}>💗</span>
              )}
            </div>
          </div>
        )}

        {flash && (
          <div style={{
            position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)",
            background: flash.startsWith("⚠") ? "#fef3c7" : "#dcfce7",
            color: flash.startsWith("⚠") ? "#92400e" : "#166534",
            padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
            zIndex: 600, boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          }}>{flash}</div>
        )}

        {showInv && (
          <InventoryDrawer
            inv={data.inventory}
            onPlace={(k) => { setShowInv(false); placeKind(k); }}
            onClose={() => setShowInv(false)}
          />
        )}
      </div>

      {/* Aktion-Buttons unter dem Raum */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => { setEditing((v) => !v); setShowInv(false); }}
          className={editing ? "vv-btn-big vv-btn-big-orange" : "vv-btn-big vv-btn-big-cyan"}
          style={{ flex: "1 1 130px" }}>
          <span className="vv-btn-icon">{editing ? "✓" : "🛠️"}</span>
          {editing ? "Fertig" : "Einrichten"}
        </button>
        {editing && (
          <button onClick={() => setShowInv(true)}
            className="vv-btn-big vv-btn-big-yellow"
            style={{ flex: "1 1 130px" }} disabled={busy}>
            <span className="vv-btn-icon">📦</span> Möbel
          </button>
        )}
        {data.meta.nextLevel && (
          <button onClick={upgradeRoom}
            className="vv-btn-big vv-btn-big-violet"
            style={{ flex: "1 1 100%" }} disabled={busy}>
            <span className="vv-btn-icon">🏗️</span>
            Upgrade → {data.meta.nextLevel.label} ({data.meta.nextLevel.cost} ✨)
          </button>
        )}
      </div>

      <style>{`
        @keyframes vv-twinkle { 0%,100% { opacity: 0.3 } 50% { opacity: 1 } }
        @keyframes vv-cloud { 0% { transform: translateX(-30px) } 100% { transform: translateX(180px) } }
        @keyframes vv-zfloat { 0% { opacity: 0; transform: translateY(0) } 50% { opacity: 1 } 100% { opacity: 0; transform: translateY(-12px) } }
        @keyframes vv-heartfloat { 0% { opacity: 0; transform: translateY(0) scale(0.7) } 30% { opacity: 1 } 100% { opacity: 0; transform: translateY(-18px) scale(1.2) } }
        @keyframes vv-tapheart { 0% { opacity: 0; transform: translate(-50%, 0) scale(0.5) } 30% { opacity: 1 } 100% { opacity: 0; transform: translate(-50%, -40px) scale(1.5) } }
        @keyframes vv-slot-pulse { 0%,100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1) } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.08) } }
      `}</style>
    </div>
  );
}
