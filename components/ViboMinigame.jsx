"use client";

// Snack-Schnapp: 30-Sekunden-Mini-Game. Snacks fallen, VIBO mit Tap/Drag
// horizontal bewegen, jeden Snack einfangen = +1 Punkt. Bomben vermeiden!
// Score wird Server-validiert (Anti-Cheat in /api/vibo/minigame).

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import ViboSprite from "./ViboSprite";

const ROUND_MS = 30_000;
const TICK_MS = 30;            // ~33 fps
const SPAWN_BASE = 900;        // ms zwischen Spawns am Anfang
const SPAWN_MIN = 350;         // ms zwischen Spawns am Ende
const FALL_SPEED = 0.18;       // %/tick
const ITEMS = ["🍔","🍕","🍎","🍪","🍩","🍓","🍌","🧀","🍇","🥕"];
const BOMBS = ["💣","☠️"];

function rand(a, b) { return a + Math.random() * (b - a); }

export default function ViboMinigame({ vibo, onClose }) {
  const [phase, setPhase] = useState("intro");   // intro | playing | done
  const [score, setScore] = useState(0);
  const [bombs, setBombs] = useState(0);
  const [pop, setPop] = useState([]);            // floating "+1" etc
  const [petX, setPetX] = useState(50);          // % horizontal
  const [items, setItems] = useState([]);        // [{id, x, y, kind, isBomb}]
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [reward, setReward] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const arenaRef = useRef(null);
  const startedAtRef = useRef(0);
  const itemIdRef = useRef(0);
  const popIdRef = useRef(0);

  // Tap/Drag: VIBO folgt dem Finger
  function handlePointer(e) {
    if (phase !== "playing") return;
    const el = arenaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const t = (e.touches && e.touches[0]) || e;
    const x = ((t.clientX - r.left) / r.width) * 100;
    setPetX(Math.max(8, Math.min(92, x)));
  }

  function start() {
    setPhase("playing");
    setScore(0); setBombs(0); setPop([]); setItems([]);
    setTimeLeft(ROUND_MS); setReward(null); setError("");
    startedAtRef.current = Date.now();
  }

  const submitScore = useCallback(async (finalScore) => {
    setBusy(true);
    try {
      const r = await api.viboMinigame(finalScore, Date.now() - startedAtRef.current);
      setReward(r);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }, []);

  // Game-Loop
  useEffect(() => {
    if (phase !== "playing") return;
    const startedAt = startedAtRef.current;
    let cancelled = false;

    function spawn() {
      if (cancelled || Date.now() - startedAt >= ROUND_MS) return;
      const isBomb = Math.random() < 0.12;
      const id = ++itemIdRef.current;
      const kind = isBomb ? BOMBS[Math.floor(Math.random() * BOMBS.length)] : ITEMS[Math.floor(Math.random() * ITEMS.length)];
      setItems((it) => [...it, { id, x: rand(8, 92), y: -8, kind, isBomb }]);
      // immer schneller spawnen
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(1, elapsed / ROUND_MS);
      const next = SPAWN_BASE - (SPAWN_BASE - SPAWN_MIN) * progress;
      spawnTimer = setTimeout(spawn, next + rand(-100, 100));
    }
    let spawnTimer = setTimeout(spawn, 600);

    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, ROUND_MS - elapsed);
      setTimeLeft(left);

      setItems((it) => {
        const next = [];
        for (const i of it) {
          const ny = i.y + FALL_SPEED * TICK_MS;
          // Kollision mit VIBO? Pet ist auf y=80..96, breite ~10
          const petY = 86;
          if (ny >= petY - 6 && ny <= petY + 8 && Math.abs(i.x - petX) < 9) {
            // Treffer
            const pid = ++popIdRef.current;
            if (i.isBomb) {
              setBombs((b) => b + 1);
              setScore((s) => Math.max(0, s - 2));
              setPop((p) => [...p, { id: pid, x: i.x, y: petY, text: "−2", isBad: true }]);
            } else {
              setScore((s) => s + 1);
              setPop((p) => [...p, { id: pid, x: i.x, y: petY, text: "+1" }]);
            }
            setTimeout(() => setPop((p) => p.filter((q) => q.id !== pid)), 700);
            continue;
          }
          if (ny > 105) continue; // unten raus
          next.push({ ...i, y: ny });
        }
        return next;
      });

      if (left <= 0) {
        cancelled = true;
        clearInterval(tick);
        clearTimeout(spawnTimer);
        setPhase("done");
      }
    }, TICK_MS);

    return () => { cancelled = true; clearInterval(tick); clearTimeout(spawnTimer); };
  }, [phase, petX]);

  useEffect(() => {
    if (phase === "done" && reward === null && !busy) {
      submitScore(score);
    }
  }, [phase, reward, busy, score, submitScore]);

  return (
    <div style={{ padding: 12, maxWidth: 420, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 17 }}>🍕 Snack-Schnapp</h3>
        {onClose && (
          <button onClick={onClose} className="vv-btn-big vv-btn-big-ghost"
            style={{ padding: "6px 10px", fontSize: 12 }}>← Zurück</button>
        )}
      </div>

      {phase === "intro" && (
        <div style={{
          padding: 16, borderRadius: 12,
          background: "linear-gradient(135deg, #fef3c7, #fde68a)",
          border: "2px solid #f59e0b",
        }}>
          <div style={{ fontSize: 14, marginBottom: 10 }}>
            🎯 <b>30 Sekunden</b>. Fang so viele Snacks wie möglich.
          </div>
          <div style={{ fontSize: 13, color: "#92400e", marginBottom: 12 }}>
            👆 Tippen/Wischen bewegt {vibo?.name || "dein VIBO"} nach links/rechts.<br/>
            💣 <b>Bomben meiden</b> (−2 Punkte!)<br/>
            ✨ Pro 3 Punkte gibt's 1 Vibe (max 10/Runde).
          </div>
          <button onClick={start} className="vv-btn-big vv-btn-big-orange"
            style={{ width: "100%", padding: 14, fontSize: 15 }}>
            <span className="vv-btn-icon">🚀</span> Loslegen!
          </button>
        </div>
      )}

      {(phase === "playing" || phase === "done") && (
        <>
          {/* Score-Bar */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 14px", borderRadius: 10,
            background: "linear-gradient(90deg, #fbbf24, #f97316)",
            color: "#fff", fontWeight: 800, marginBottom: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}>
            <span>🎯 {score}</span>
            <span>💣 {bombs}</span>
            <span>⏱ {Math.ceil(timeLeft / 1000)}s</span>
          </div>

          {/* Arena */}
          <div
            ref={arenaRef}
            onMouseMove={handlePointer}
            onTouchMove={handlePointer}
            onTouchStart={handlePointer}
            onClick={handlePointer}
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "0.75",
              maxWidth: 360,
              margin: "0 auto",
              borderRadius: 14,
              overflow: "hidden",
              background: "linear-gradient(180deg, #7dd3fc 0%, #38bdf8 50%, #86efac 100%)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3), inset 0 0 50px rgba(0,0,0,0.1)",
              border: "3px solid #0c4a6e",
              touchAction: "none",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            {/* Wolken Deko */}
            <div style={{ position: "absolute", left: "15%", top: "10%", width: 38, height: 18, background: "radial-gradient(circle, #fff 40%, transparent 70%)", borderRadius: "50%", opacity: 0.7 }} />
            <div style={{ position: "absolute", left: "70%", top: "18%", width: 32, height: 16, background: "radial-gradient(circle, #fff 40%, transparent 70%)", borderRadius: "50%", opacity: 0.6 }} />
            <div style={{ position: "absolute", left: "40%", top: "6%", width: 26, height: 14, background: "radial-gradient(circle, #fff 40%, transparent 70%)", borderRadius: "50%", opacity: 0.5 }} />

            {/* Boden-Gras */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 28, background: "linear-gradient(180deg, #16a34a, #14532d)", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)" }} />

            {/* Fallende Items */}
            {items.map((i) => (
              <div key={i.id} style={{
                position: "absolute",
                left: `${i.x}%`, top: `${i.y}%`,
                transform: "translate(-50%, -50%)",
                fontSize: 26,
                filter: i.isBomb ? "drop-shadow(0 0 4px #dc2626)" : "drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
                animation: "vv-fallSpin 2s linear infinite",
                pointerEvents: "none",
              }}>{i.kind}</div>
            ))}

            {/* Pop-Texte (+1 / -2) */}
            {pop.map((p) => (
              <div key={p.id} style={{
                position: "absolute",
                left: `${p.x}%`, top: `${p.y}%`,
                transform: "translate(-50%, -50%)",
                color: p.isBad ? "#dc2626" : "#16a34a",
                fontWeight: 900, fontSize: 18,
                textShadow: "0 1px 2px #fff",
                animation: "vv-popUp 0.7s ease-out forwards",
                pointerEvents: "none",
              }}>{p.text}</div>
            ))}

            {/* VIBO */}
            <div style={{
              position: "absolute",
              left: `${petX}%`, top: "82%",
              transform: "translate(-50%, -50%)",
              transition: "left 0.15s ease-out",
              pointerEvents: "none",
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
            }}>
              <ViboSprite stage={vibo?.stage || "kid"} species={vibo?.species || "sprout"} mood="glücklich" size={70} />
            </div>

            {/* Zähler-Overlay nur am Ende */}
            {phase === "done" && (
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(0,0,0,0.65)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 12, color: "#fff", padding: 18, textAlign: "center",
              }}>
                <div style={{ fontSize: 42 }}>🏁</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>Runde vorbei!</div>
                <div style={{ fontSize: 14, opacity: 0.95 }}>
                  🎯 {score} Punkte · 💣 {bombs} Bomben
                </div>
                {busy && <div style={{ fontSize: 13 }}>Wird gewertet…</div>}
                {reward && (
                  <div style={{
                    background: reward.reward > 0 ? "linear-gradient(135deg, #fbbf24, #f97316)" : "rgba(255,255,255,0.15)",
                    padding: "12px 18px", borderRadius: 14, fontWeight: 800, fontSize: 16,
                  }}>
                    {reward.blocked === "saturation" || reward.blocked === "ai_earn_block" ? (
                      <>Heute schon genug Vibes verdient — gleich morgen wieder!</>
                    ) : reward.reward > 0 ? (
                      <>+{reward.reward} ✨ Vibes!</>
                    ) : (
                      <>Keine Vibes — versuch's nochmal!</>
                    )}
                  </div>
                )}
                {error && <div style={{ color: "#fda4af", fontSize: 12 }}>⚠ {error}</div>}
                {reward && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={start} className="vv-btn-big vv-btn-big-orange" style={{ padding: "10px 18px" }}>
                      <span className="vv-btn-icon">🔁</span> Nochmal
                    </button>
                    {onClose && (
                      <button onClick={onClose} className="vv-btn-big vv-btn-big-ghost" style={{ padding: "10px 18px" }}>
                        Fertig
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "var(--vv-muted,#666)", textAlign: "center" }}>
            👆 Tippe oder wische, um {vibo?.name || "VIBO"} zu bewegen
          </div>
        </>
      )}

      <style>{`
        @keyframes vv-fallSpin { 0% { transform: translate(-50%, -50%) rotate(0) } 100% { transform: translate(-50%, -50%) rotate(360deg) } }
        @keyframes vv-popUp { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.6) } 30% { opacity: 1 } 100% { opacity: 0; transform: translate(-50%, -120%) scale(1.3) } }
      `}</style>
    </div>
  );
}
