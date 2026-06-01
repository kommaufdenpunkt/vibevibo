"use client";

// Mini-VIBO-Widget für das Profil. Auf dem eigenen Profil zum Pflegen,
// auf fremden Profilen zum Anschauen + Knuddeln.
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import ViboSprite from "./ViboSprite";

const SPECIES_NAMES = {
  sprout: "Sprössling", kitsune: "Kitsune", drago: "Drago", knuddi: "Knuddi", stella: "Stella",
};

export default function ViboProfileWidget({ username, isOwner }) {
  const [vibo, setVibo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = isOwner ? await api.viboGet() : await api.viboOf(username);
        if (alive) setVibo(r?.vibo || null);
      } catch {}
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [username, isOwner]);

  async function knuddel() {
    setBusy(true);
    try {
      await api.viboKnuddel(username);
      setFlash("🫶 geknuddelt! +1 ✨");
      setTimeout(() => setFlash(""), 3000);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 3000);
    } finally { setBusy(false); }
  }

  if (loading) return null;
  if (!vibo) {
    if (!isOwner) return null;
    return (
      <div style={{
        background: "linear-gradient(135deg, #fef3c7, #fde68a)",
        border: "2px dashed #fbbf24",
        borderRadius: 14, padding: 16, textAlign: "center", marginBottom: 14,
      }}>
        <div style={{ fontSize: 40 }}>🥚</div>
        <div style={{ fontWeight: 700, color: "#92400e", marginTop: 4 }}>Du hast noch kein VIBO!</div>
        <div style={{ fontSize: 12, color: "#92400e", marginTop: 4 }}>
          Lass dein persönliches Pixel-Pet schlüpfen und pflege es jeden Tag.
        </div>
        <Link href="/messenger?tab=vibo" className="vv-btn-big vv-btn-big-yellow"
          style={{ marginTop: 10, display: "inline-flex", padding: "10px 20px", fontSize: 14 }}>
          🥚 VIBO schlüpfen lassen
        </Link>
      </div>
    );
  }

  const isDead = vibo.stage === "dead";
  return (
    <div style={{
      background: "linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 50%, #a78bfa 100%)",
      borderRadius: 14, padding: 16, marginBottom: 14, color: "#1c1c1e",
      boxShadow: "0 6px 18px rgba(139,92,246,0.30)",
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        background: "rgba(255,255,255,0.6)", borderRadius: 12,
        padding: 8, display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", flexShrink: 0,
      }}>
        <ViboSprite stage={vibo.stage} species={vibo.species} mood={vibo.mood} size={70} sleeping={vibo.sleeping} />
        {vibo.sleeping && <div style={{ position: "absolute", top: -8, right: -8, fontSize: 20 }}>💤</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 600, letterSpacing: 0.5 }}>
          {isOwner ? "DEIN VIBO" : `${username}S VIBO`}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800 }}>
          {isDead ? "✝ " : ""}{vibo.name}
        </div>
        <div style={{ fontSize: 11, color: "#4c1d95", marginTop: 2 }}>
          {SPECIES_NAMES[vibo.species]} · {vibo.stageInfo?.label || vibo.stage} · {vibo.ageDays} Tag{vibo.ageDays === 1 ? "" : "e"}
        </div>
        <div style={{ fontSize: 11, color: "#4c1d95", marginTop: 2, fontStyle: "italic" }}>
          {isDead ? "in liebevoller Erinnerung" : `Stimmung: ${vibo.mood}`}
        </div>
        {flash && <div style={{ fontSize: 12, fontWeight: 700, color: flash.startsWith("⚠") ? "#c2185b" : "#0d8a3f", marginTop: 6 }}>{flash}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        {isOwner ? (
          <Link href="/messenger?tab=vibo" className="vv-btn-big vv-btn-big-violet" style={{ padding: "8px 14px", fontSize: 12 }}>
            Pflegen
          </Link>
        ) : (
          !isDead && (
            <button type="button" disabled={busy} onClick={knuddel}
              className="vv-btn-big vv-btn-big-pink" style={{ padding: "8px 14px", fontSize: 12 }}>
              🫶 Knuddeln
            </button>
          )
        )}
      </div>
    </div>
  );
}
