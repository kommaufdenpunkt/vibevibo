// 🗂 UserAkteImageGallery
// Zeigt alle abgelehnten Bilder eines Users als Thumbnail-Grid mit Grund + Datum.
// Wird in der Userakte (separat) eingebettet — wrapped mit AkteAccessGate damit
// der Mod erst eine Begründung eingibt warum er reinguckt.

"use client";

import { useEffect, useState } from "react";

function formatDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const SOURCE_LABELS = {
  profile: "Profilbild", buschfunk: "Buschfunk", feed: "Feed",
  comment: "Kommentar", album: "Album", avatar: "Avatar", other: "Sonstiges",
};

export default function UserAkteImageGallery({ userId, username = "" }) {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await fetch(`/api/mcp/users/${userId}/image-akte`, { credentials: "include" });
        const d = await r.json();
        if (cancel) return;
        if (!r.ok) throw new Error(d?.error || "Konnte Akte nicht laden.");
        setEntries(d.entries || []);
        setTotal(d.total || 0);
      } catch (e) {
        if (!cancel) setError(e.message);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [userId]);

  if (loading) {
    return <div style={{ padding: 24, textAlign: "center", color: "rgba(241,241,245,0.5)" }}>Lade Bild-Akte …</div>;
  }
  if (error) {
    return (
      <div style={{
        padding: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
        borderRadius: 10, color: "#fca5a5",
      }}>
        ⚠ {error}
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <div style={{
        padding: 32, textAlign: "center",
        background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
        borderRadius: 14, color: "#86efac",
      }}>
        <div style={{ fontSize: 38, marginBottom: 8 }}>✨</div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Saubere Weste</div>
        <div style={{ fontSize: 13, color: "rgba(241,241,245,0.55)" }}>
          {username ? `@${username}` : "Dieser User"} hat noch keine abgelehnten Bilder.
        </div>
      </div>
    );
  }

  // Status-Badge: ab wieviel Verstößen = bedenklich?
  let statusColor = "#86efac";
  let statusLabel = "Saubere Weste";
  if (total >= 5) { statusColor = "#ef4444"; statusLabel = "Häufige Verstöße"; }
  else if (total >= 2) { statusColor = "#fbbf24"; statusLabel = "Erste Verstöße"; }

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 14, padding: "10px 12px",
        background: `${statusColor}15`, border: `1px solid ${statusColor}55`,
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: statusColor }}>
          📋 {statusLabel}
        </div>
        <div style={{ fontSize: 12, color: "var(--mcp-text-mid, rgba(241,241,245,0.65))" }}>
          {total} abgelehnte Bilder
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
        gap: 8,
      }}>
        {entries.map(e => (
          <button
            key={e.id} type="button"
            onClick={() => setSelected(e)}
            style={{
              padding: 0, border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.04)", borderRadius: 10,
              overflow: "hidden", aspectRatio: "1/1", position: "relative",
              outline: "none",
            }}
            title={`${e.rejection_reason_text} · ${formatDate(e.rejected_at)}`}
          >
            <img
              src={e.thumbnail_url || e.image_url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(ev) => { ev.currentTarget.style.opacity = "0.2"; }}
            />
            {e.fidolin_auto ? (
              <div style={{
                position: "absolute", top: 4, right: 4,
                background: "rgba(168,85,247,0.9)", color: "#fff",
                padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700,
              }}>🤖 KI</div>
            ) : null}
          </button>
        ))}
      </div>

      {/* Detail-Modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            zIndex: 2147483646, display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, cursor: "pointer",
          }}
        >
          <div
            onClick={(ev) => ev.stopPropagation()}
            style={{
              maxWidth: 600, width: "100%", maxHeight: "90vh",
              background: "rgba(18,18,30,0.95)", borderRadius: 14,
              overflow: "auto", cursor: "default",
            }}
          >
            <img
              src={selected.image_url}
              alt=""
              style={{ width: "100%", maxHeight: 400, objectFit: "contain", background: "#000" }}
            />
            <div style={{ padding: 18 }}>
              <div style={{
                display: "inline-block", padding: "4px 10px",
                background: "rgba(239,68,68,0.2)", color: "#fca5a5",
                borderRadius: 6, fontSize: 11, fontWeight: 700, marginBottom: 8,
              }}>
                {selected.rejection_reason_text}
              </div>
              <div style={{ fontSize: 13, color: "rgba(241,241,245,0.7)", marginBottom: 6 }}>
                Quelle: <strong>{SOURCE_LABELS[selected.source_type] || "—"}</strong>
              </div>
              <div style={{ fontSize: 12, color: "rgba(241,241,245,0.5)" }}>
                Abgelehnt: {formatDate(selected.rejected_at)} · von Mod #{selected.rejected_by_mod_id}
                {selected.fidolin_auto ? " · 🤖 Auto durch Fidolin-KI" : ""}
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{
                  marginTop: 14, width: "100%", padding: 10,
                  background: "rgba(255,255,255,0.06)", color: "#f1f1f5",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                  fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
