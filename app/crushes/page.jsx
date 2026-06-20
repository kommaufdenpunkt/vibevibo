"use client";

// 💕 Geheimer Schwarm — 3 Slots, Mutual-Match, Konfetti.
// URL: /crushes
//
// Logik:
//   - 3 Slots maximal pro User
//   - Slot füllen = Crush eintragen, andere User sieht NICHTS davon
//   - Wenn er/sie dich auch einträgt → 💥 Match (Konfetti + Push)
//   - Match wird ÖFFENTLICH in der Matches-Liste (für euch zwei sichtbar)

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useMe } from "@/lib/useMe";

export default function CrushesPage() {
  const { me } = useMe();
  const [data, setData] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [confetti, setConfetti] = useState(null);

  const refresh = useCallback(() => {
    fetch("/api/me/crushes")
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (!me) {
    return (
      <div style={{ maxWidth: 540, margin: "30px auto", padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 50 }}>💕</div>
        <h2>Geheimer Schwarm</h2>
        <p>Bitte einloggen, um deine geheimen Slots zu verwalten.</p>
        <Link href="/login?next=/crushes" className="vv-btn">Einloggen</Link>
      </div>
    );
  }

  if (!data) {
    return <div className="vv-card" style={{ maxWidth: 720, margin: "20px auto" }}>Lädt...</div>;
  }

  const slots = data.slots || [];
  const matches = data.matches || [];
  const slotsTotal = data.slotsTotal || 3;
  const slotsUsed = data.slotsUsed || 0;
  const emptySlots = Math.max(0, slotsTotal - slotsUsed);

  async function removeSlot(crushId) {
    if (!confirm("Diesen Slot wirklich freiräumen? (Wenn es ein Match war, geht der Match verloren.)")) return;
    try {
      await fetch(`/api/me/crushes/${crushId}`, { method: "DELETE" });
      refresh();
    } catch {}
  }

  async function onAdded(result) {
    setSearchOpen(false);
    refresh();
    if (result?.matched && result?.partner) {
      setConfetti(result.partner);
      setTimeout(() => setConfetti(null), 6500);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "20px auto", padding: 12 }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(168,85,247,0.12))",
        border: "1px solid rgba(236,72,153,0.3)",
        borderRadius: 16, padding: 20, marginBottom: 18, textAlign: "center",
      }}>
        <div style={{ fontSize: 38 }}>💕</div>
        <h1 style={{ margin: "8px 0 4px", fontSize: 22, fontWeight: 900 }}>Geheimer Schwarm</h1>
        <p style={{ fontSize: 13, color: "#475569", margin: "0 0 8px", lineHeight: 1.5 }}>
          Trage <b>bis zu {slotsTotal} Personen</b> ein — alles bleibt geheim. Wenn jemand
          dich auch einträgt: <b>💥 Es funkt!</b>
        </p>
        <div style={{ fontSize: 11, color: "#94a3b8" }}>
          {slotsUsed} von {slotsTotal} Slots vergeben · vergebene/verheiratete User werden ausgeblendet
        </div>
      </div>

      {/* 3 Slots */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12, marginBottom: 24,
      }}>
        {slots.map((s) => (
          <CrushSlot key={s.id} slot={s} onRemove={() => removeSlot(s.id)} />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} onClick={() => setSearchOpen(true)} />
        ))}
      </div>

      {/* Match-Liste */}
      {matches.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #fef3c7, #fde68a)",
          border: "2px dashed #f59e0b",
          borderRadius: 16, padding: 16, marginBottom: 20,
        }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 900, color: "#7c2d12" }}>
            💥 Eure Matches ({matches.length})
          </h3>
          <div style={{ display: "grid", gap: 10 }}>
            {matches.map((m) => (
              <Link key={m.id} href={`/u/${m.username}`} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.7)",
                textDecoration: "none", color: "#7c2d12",
              }}>
                <Avatar
                  url={m.avatarStatus === "approved" ? m.avatarUrl : ""}
                  name={m.displayName}
                  className="vv-avatar vv-avatar-md"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{m.displayName}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>@{m.username}</div>
                </div>
                <span style={{ fontSize: 22 }}>💕</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Wer hat mich (Datenschutz: NICHT zeigen) */}
      <div style={{
        background: "rgba(0,0,0,0.04)", padding: 12, borderRadius: 12,
        fontSize: 11.5, color: "#64748b", textAlign: "center", lineHeight: 1.6,
      }}>
        🔒 <b>Geheimhaltung:</b> Niemand sieht, wen du eingetragen hast — auch deine Crushes nicht.
        Nur wenn ihr euch <b>gegenseitig</b> wählt, taucht der Match auf. Wenn du einen Slot
        freiräumst, geht der Match dabei verloren.
      </div>

      {searchOpen && (
        <CrushSearchModal
          onClose={() => setSearchOpen(false)}
          onAdded={onAdded}
        />
      )}

      {confetti && <ConfettiOverlay partner={confetti} onClose={() => setConfetti(null)} />}
    </div>
  );
}

function CrushSlot({ slot, onRemove }) {
  const isMatch = slot.matchedAt && slot.matchedAt > 0;
  return (
    <div style={{
      position: "relative",
      background: isMatch
        ? "linear-gradient(135deg, #fef3c7, #fde68a)"
        : "linear-gradient(135deg, #fce7f3, #fbcfe8)",
      border: isMatch ? "2px solid #f59e0b" : "1px solid rgba(236,72,153,0.4)",
      borderRadius: 14, padding: 14, textAlign: "center",
    }}>
      {isMatch && (
        <div style={{
          position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
          background: "#f59e0b", color: "#fff", padding: "3px 10px", borderRadius: 999,
          fontSize: 10, fontWeight: 900, letterSpacing: 0.5,
        }}>💥 MATCH</div>
      )}
      <Avatar
        url={slot.avatarStatus === "approved" ? slot.avatarUrl : ""}
        name={slot.displayName}
        className="vv-avatar vv-avatar-lg"
        style={{ margin: "0 auto 8px" }}
      />
      <div style={{ fontSize: 14, fontWeight: 800, color: "#831843", marginBottom: 2 }}>
        {slot.displayName}
      </div>
      <div style={{ fontSize: 11, opacity: 0.7, color: "#831843", marginBottom: 10 }}>
        @{slot.username}
      </div>
      <button onClick={onRemove} style={{
        padding: "5px 11px", fontSize: 11, fontWeight: 700,
        background: "rgba(239,68,68,0.1)", color: "#b91c1c",
        border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8,
        cursor: "pointer", fontFamily: "inherit",
      }}>🗑 Slot frei</button>
    </div>
  );
}

function EmptySlot({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "rgba(255,255,255,0.5)",
      border: "2px dashed rgba(236,72,153,0.4)",
      borderRadius: 14, padding: 24, textAlign: "center",
      cursor: "pointer", fontFamily: "inherit",
      transition: "all 0.18s",
    }}>
      <div style={{ fontSize: 32, marginBottom: 6, opacity: 0.5 }}>+</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#831843" }}>
        Slot frei — wähle einen Crush
      </div>
    </button>
  );
}

function CrushSearchModal({ onClose, onAdded }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/me/crush-search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.ok ? r.json() : { results: [] })
        .then((d) => setResults(d.results || []))
        .catch(() => {});
    }, 200);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [q]);

  async function pick(user) {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/me/crushes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      onAdded(d);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", padding: 22, borderRadius: 18, maxWidth: 480, width: "100%",
        maxHeight: "85vh", display: "flex", flexDirection: "column",
      }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 900 }}>
          💕 Wer ist dein geheimer Schwarm?
        </h3>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, marginBottom: 12 }}>
          Gib mind. 2 Buchstaben ein. Personen die vergeben/verheiratet sind, werden nicht angezeigt.
        </p>

        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Username oder Anzeigename..."
          style={{
            padding: 12, borderRadius: 10, border: "1.5px solid #cbd5e1",
            fontFamily: "inherit", fontSize: 14, marginBottom: 10,
          }}
        />

        {err && (
          <div style={{ color: "#991b1b", marginBottom: 10, fontSize: 12, fontWeight: 700,
            background: "rgba(239,68,68,0.1)", padding: 8, borderRadius: 8 }}>
            ⚠ {err}
          </div>
        )}

        <div style={{ overflowY: "auto", flex: 1, display: "grid", gap: 4 }}>
          {q.trim().length < 2 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: 20, fontSize: 13 }}>
              Tippe einen Namen ein...
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: 20, fontSize: 13 }}>
              Niemand gefunden mit „{q}"
            </div>
          ) : results.map((u) => (
            <button key={u.id} type="button" disabled={busy} onClick={() => pick(u)} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: 10, borderRadius: 10, background: "#fafafa", border: "1px solid #e5e5e7",
              cursor: busy ? "wait" : "pointer", fontFamily: "inherit", textAlign: "left",
            }}>
              <Avatar
                url={u.avatarStatus === "approved" ? u.avatarUrl : ""}
                name={u.displayName}
                className="vv-avatar vv-avatar-sm"
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{u.displayName}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>@{u.username}</div>
              </div>
              <span style={{ fontSize: 18 }}>💕</span>
            </button>
          ))}
        </div>

        <button onClick={onClose} disabled={busy} style={{
          marginTop: 12, padding: 12, borderRadius: 10,
          background: "#f5f5f7", border: "1px solid #e5e5e7",
          fontFamily: "inherit", fontWeight: 700, cursor: "pointer",
        }}>Schließen</button>
      </div>
    </div>
  );
}

function ConfettiOverlay({ partner, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 10001,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      overflow: "hidden",
    }}>
      {/* Konfetti (CSS-only) */}
      {Array.from({ length: 60 }).map((_, i) => (
        <span key={i} style={{
          position: "absolute",
          left: `${Math.random() * 100}%`,
          top: -20,
          fontSize: 24 + Math.random() * 18,
          animation: `vv-crush-fall ${2 + Math.random() * 2.5}s ${Math.random() * 1}s ease-in forwards`,
          pointerEvents: "none",
        }}>
          {["💕","💖","💗","💜","🎉","✨","🌟","💞"][Math.floor(Math.random() * 8)]}
        </span>
      ))}

      <div style={{
        position: "relative", zIndex: 2,
        background: "linear-gradient(135deg, #ec4899, #a855f7)",
        color: "#fff", padding: "32px 28px", borderRadius: 24,
        textAlign: "center", maxWidth: 380,
        boxShadow: "0 30px 80px rgba(236,72,153,0.4)",
      }}>
        <div style={{ fontSize: 60, marginBottom: 6 }}>💥</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 900 }}>
          Es hat gefunkt!
        </h2>
        <p style={{ fontSize: 15, opacity: 0.95, margin: "0 0 16px", lineHeight: 1.4 }}>
          Du und <b>{partner.displayName}</b> habt euch gegenseitig
          als geheimen Schwarm eingetragen!
        </p>
        <Link href={`/messenger/${partner.username}`} onClick={onClose} style={{
          display: "inline-block",
          padding: "12px 26px", borderRadius: 999,
          background: "#fff", color: "#831843",
          fontWeight: 900, fontSize: 14, textDecoration: "none",
        }}>
          ✉ Schreib ihm/ihr eine Nachricht
        </Link>
        <div onClick={onClose} style={{
          marginTop: 14, fontSize: 11, opacity: 0.7, cursor: "pointer",
        }}>(klicke außerhalb zum Schließen)</div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes vv-crush-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0.3; }
        }
      ` }} />
    </div>
  );
}
