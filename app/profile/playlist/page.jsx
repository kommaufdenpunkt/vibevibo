"use client";

// 🎵 Meine Profil-Playlist verwalten — 3-5 Songs hinzufügen/entfernen.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";

export default function MyPlaylistPage() {
  const { me } = useMe();
  const [data, setData] = useState(null);
  const [musicUrl, setMusicUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const refresh = useCallback(() => {
    fetch("/api/me/playlist")
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (!me) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: "40px auto 0", textAlign: "center" }}>
        <div style={{ fontSize: 50 }}>🎵</div>
        <h1>Profil-Playlist</h1>
        <p>Bitte einloggen.</p>
        <Link href="/login?next=/profile/playlist" className="vv-btn">🔑 Einloggen</Link>
      </div>
    );
  }

  if (!data) return <div className="vv-card" style={{ maxWidth: 720, margin: "20px auto" }}>Lädt...</div>;

  const playlist = data.playlist || [];
  const max = data.max || 5;
  const slotsFree = max - playlist.length;

  async function add() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/me/playlist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ musicUrl, title }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fehler");
      setMusicUrl(""); setTitle("");
      setData(d);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function remove(id) {
    setBusy(true);
    try {
      const r = await fetch(`/api/me/playlist/${id}`, { method: "DELETE" });
      const d = await r.json();
      setData(d);
    } finally { setBusy(false); }
  }

  return (
    <div style={{ maxWidth: 600, margin: "20px auto", padding: 12 }}>
      <div style={{
        background: "linear-gradient(135deg, #1e293b, #0f172a)",
        color: "#fff",
        borderRadius: 16, padding: 18, marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 32 }}>🎵</span>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Meine Playlist</h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.85 }}>
              {playlist.length} / {max} Songs · YouTube oder HTTPS-Audio
            </p>
          </div>
        </div>
      </div>

      {/* Add */}
      {slotsFree > 0 ? (
        <div style={{
          background: "rgba(255,255,255,0.92)", padding: 16, borderRadius: 14, marginBottom: 14,
        }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800 }}>+ Song hinzufügen</h3>
          <input
            value={musicUrl}
            onChange={(e) => setMusicUrl(e.target.value)}
            placeholder="YouTube-Link oder https://...mp3"
            style={{
              width: "100%", padding: 10, borderRadius: 8,
              border: "1.5px solid #cbd5e1", fontSize: 13, fontFamily: "inherit",
              marginBottom: 8, boxSizing: "border-box",
            }}
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titel (optional, z.B. 'The Killers — Mr. Brightside')"
            maxLength={120}
            style={{
              width: "100%", padding: 10, borderRadius: 8,
              border: "1.5px solid #cbd5e1", fontSize: 13, fontFamily: "inherit",
              marginBottom: 10, boxSizing: "border-box",
            }}
          />
          {err && (
            <div style={{
              background: "rgba(239,68,68,0.1)", color: "#991b1b",
              padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 8,
            }}>⚠ {err}</div>
          )}
          <button onClick={add} disabled={busy || !musicUrl.trim()} style={{
            width: "100%", padding: 11, borderRadius: 10,
            background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
            border: "none", fontWeight: 800, fontSize: 14,
            cursor: busy || !musicUrl.trim() ? "not-allowed" : "pointer",
            opacity: busy || !musicUrl.trim() ? 0.5 : 1, fontFamily: "inherit",
          }}>
            {busy ? "⏳…" : "🎵 Hinzufügen"}
          </button>
        </div>
      ) : (
        <div style={{
          background: "rgba(251,191,36,0.15)", border: "1px solid #fbbf24",
          padding: 12, borderRadius: 10, marginBottom: 14, fontSize: 13, color: "#92400e",
        }}>
          🔒 Maximum erreicht ({max} Songs) — erst einen löschen, dann neuen hinzufügen.
        </div>
      )}

      {/* Liste */}
      <div style={{ background: "rgba(255,255,255,0.92)", padding: 16, borderRadius: 14 }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800 }}>Deine Playlist</h3>
        {playlist.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13 }}>
            <div style={{ fontSize: 30, marginBottom: 6 }}>🎼</div>
            Noch keine Songs. Füg deinen ersten hinzu!
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {playlist.map((t, i) => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10,
                background: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
              }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: "#831843", width: 22 }}>
                  {i + 1}.
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#831843", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.title || (isYouTubeId(t.musicUrl) ? `YouTube: ${t.musicUrl}` : "Audio-Stream")}
                  </div>
                  <div style={{ fontSize: 10, color: "#831843", opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.musicUrl}
                  </div>
                </div>
                <button onClick={() => remove(t.id)} disabled={busy} style={{
                  padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: "rgba(239,68,68,0.12)", color: "#b91c1c",
                  border: "1px solid rgba(239,68,68,0.3)",
                  cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
                }}>🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        marginTop: 14, padding: 12, borderRadius: 10,
        background: "rgba(0,0,0,0.04)", fontSize: 11, color: "#64748b", lineHeight: 1.5,
      }}>
        💡 <b>Tipp:</b> Playlist erscheint auf deinem Profil. Browser blockieren Auto-Start —
        Besucher müssen einmal auf ▶ klicken, dann läuft alles automatisch durch.
        Jede Wiedergabe startet an einer zufälligen Stelle im Song — so wird's nie langweilig.
      </div>

      <div style={{ marginTop: 14, textAlign: "center" }}>
        <Link href={`/u/${me.username}`} style={{
          fontSize: 13, color: "#475569", textDecoration: "none",
        }}>← Zurück zu meinem Profil</Link>
      </div>
    </div>
  );
}

function isYouTubeId(s) {
  return /^[a-zA-Z0-9_-]{11}$/.test(String(s || ""));
}
