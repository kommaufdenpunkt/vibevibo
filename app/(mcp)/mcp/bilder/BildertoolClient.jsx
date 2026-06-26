// 🖼 Bildertool-Client mit Tabs:
//   • 📥 Pending   — Bilder die Fidolin durchgewunken hat, warten auf Mod-Sichtung
//   • 🤖 Auto-Rejects — Bilder die Fidolin selbst geblockt hat (Mod kann überstimmen)

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ImageReviewCard from "@/components/mcp/ImageReviewCard";

export default function BildertoolClient() {
  const [tab, setTab] = useState("pending");
  const [images, setImages] = useState([]);
  const [autoRejects, setAutoRejects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, autoRejects: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(targetTab = tab) {
    setError("");
    setLoading(true);
    try {
      const r = await fetch(`/api/mcp/images/queue?tab=${targetTab}&limit=50`, { credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Konnte Queue nicht laden.");
      setCounts(d.counts || { pending: 0, autoRejects: 0 });
      setTemplates(d.templates || []);
      if (targetTab === "auto_rejects") {
        setAutoRejects(d.entries || []);
      } else {
        setImages(d.images || []);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(tab); }, [tab]);

  function handleDone(imageId) {
    setImages((prev) => prev.filter((i) => i.id !== imageId));
    setCounts((c) => ({ ...c, pending: Math.max(0, c.pending - 1) }));
  }

  async function handleRevert(akteId) {
    const msg = prompt(
      "Optionale Korrektur-Nachricht an den User (oder leer für Standard-Text):",
      ""
    );
    if (msg === null) return;
    try {
      const r = await fetch(`/api/mcp/images/akte/${akteId}/revert`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg || null }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Revert fehlgeschlagen.");
      setAutoRejects((prev) => prev.filter((a) => a.id !== akteId));
      setCounts((c) => ({ ...c, autoRejects: Math.max(0, c.autoRejects - 1) }));
    } catch (e) {
      alert("⚠ " + e.message);
    }
  }

  return (
    <div className="mcp-app" style={{ paddingBottom: 80 }}>
      <div className="mcp-header">
        <div className="mcp-header-row">
          <div className="mcp-brand">
            <div className="mcp-brand-mark">🖼</div>
            <div className="mcp-brand-text">
              BILDERTOOL
              <small>{tab === "auto_rejects" ? "FIDOLIN AUTO-REJECTS" : "INSTAGRAM-STYLE FEED"}</small>
            </div>
          </div>
        </div>
        <div className="mcp-greeting">
          <div className="mcp-greeting-time">
            {tab === "auto_rejects"
              ? (counts.autoRejects === 0
                  ? "Keine Auto-Rejects"
                  : `${counts.autoRejects} Auto-Reject${counts.autoRejects === 1 ? "" : "s"} in der Akte`)
              : (counts.pending === 0
                  ? "Alles ruhig"
                  : `${counts.pending} ${counts.pending === 1 ? "Bild wartet" : "Bilder warten"}`)
            }
          </div>
          <div className="mcp-greeting-text">
            <span className="accent">Bild-Moderation</span>
          </div>
        </div>
      </div>

      <div className="mcp-content" style={{ paddingTop: 8 }}>
        {/* TAB-SWITCHER */}
        <div style={{
          display: "flex", gap: 8, marginBottom: 16,
          background: "rgba(255,255,255,0.03)",
          padding: 4, borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <TabButton
            active={tab === "pending"}
            onClick={() => setTab("pending")}
            color="#ec4899"
          >
            📥 Pending
            <CountPill n={counts.pending} active={tab === "pending"} />
          </TabButton>
          <TabButton
            active={tab === "auto_rejects"}
            onClick={() => setTab("auto_rejects")}
            color="#fbbf24"
          >
            🤖 Auto-Rejects
            <CountPill n={counts.autoRejects} active={tab === "auto_rejects"} />
          </TabButton>
        </div>

        {loading && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--mcp-text-mid, rgba(241,241,245,0.5))" }}>
            🔄 Lade …
          </div>
        )}

        {error && (
          <div style={{
            padding: 16, background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.35)", borderRadius: 10,
            color: "#fca5a5", fontWeight: 600,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* PENDING TAB */}
        {!loading && !error && tab === "pending" && (
          images.length === 0 ? (
            <EmptyState
              emoji="🎉"
              title="Queue ist leer"
              text={<>Aktuell sind keine Bilder zur Moderation offen.<br/><br/><strong>Zum Testen:</strong> Admin-Dashboard → 🧪 DEV-TOOLS → Test-Bild erzeugen</>}
              color="#10b981"
            />
          ) : (
            <>
              <Hint icon="💡" text="Bei Ablehnung wird automatisch eine orange System-DM an den User geschickt + das Bild in seiner Akte vermerkt." />
              {images.map((image) => (
                <ImageReviewCard
                  key={image.id}
                  image={image}
                  templates={templates}
                  onDone={handleDone}
                />
              ))}
            </>
          )
        )}

        {/* AUTO-REJECTS TAB */}
        {!loading && !error && tab === "auto_rejects" && (
          autoRejects.length === 0 ? (
            <EmptyState
              emoji="🤖"
              title="Keine Fidolin-Auto-Rejects"
              text="Fidolin hat aktuell keine Bilder selbstständig blockiert."
              color="#fbbf24"
            />
          ) : (
            <>
              <Hint
                icon="🤖"
                text={'Hier siehst du was Fidolin (KI) direkt blockiert hat. Wenn die Ablehnung falsch war, klick 🔄 Doch freigeben — der User bekommt dann eine orange Korrektur-DM und sein Akte-Eintrag wird gelöscht.'}
                color="#fbbf24"
              />
              {autoRejects.map((entry) => (
                <AutoRejectCard
                  key={entry.id}
                  entry={entry}
                  onRevert={() => handleRevert(entry.id)}
                />
              ))}
            </>
          )
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, color, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, padding: "10px 14px",
        background: active ? `${color}25` : "transparent",
        color: active ? color : "rgba(241,241,245,0.65)",
        border: active ? `1px solid ${color}50` : "1px solid transparent",
        borderRadius: 8,
        fontSize: 13, fontWeight: 800,
        cursor: "pointer", fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function CountPill({ n, active }) {
  if (!n) return null;
  return (
    <span style={{
      background: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
      padding: "2px 8px", borderRadius: 999,
      fontSize: 11, fontWeight: 800,
    }}>{n}</span>
  );
}

function EmptyState({ emoji, title, text, color }) {
  return (
    <div style={{
      padding: 48, textAlign: "center",
      background: `${color}10`,
      border: `1px solid ${color}30`,
      borderRadius: 16,
    }}>
      <div style={{ fontSize: 56, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontWeight: 800, fontSize: 18, color, marginBottom: 6 }}>{title}</div>
      <div style={{
        fontSize: 13, color: "var(--mcp-text-mid, rgba(241,241,245,0.55))",
        lineHeight: 1.6, maxWidth: 420, margin: "0 auto",
      }}>{text}</div>
    </div>
  );
}

function Hint({ icon, text, color = "#fb923c" }) {
  return (
    <div style={{
      marginBottom: 16, padding: "10px 14px",
      background: `${color}15`, border: `1px solid ${color}40`,
      borderRadius: 10, fontSize: 12, color: "rgba(241,241,245,0.78)",
      lineHeight: 1.5,
    }}>
      {icon} {text}
    </div>
  );
}

function AutoRejectCard({ entry, onRevert }) {
  const date = entry.rejected_at
    ? new Date(entry.rejected_at).toLocaleString("de-DE", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return (
    <div style={{
      marginBottom: 16, padding: 14,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 10, fontSize: 12,
      }}>
        <Link
          href={`/mcp/akte/${entry.user_id}`}
          style={{ color: "#86efac", fontWeight: 700, textDecoration: "none" }}
        >
          👤 @{entry.uploader_username || `user#${entry.user_id}`}
        </Link>
        <span style={{
          background: "rgba(251,191,36,0.2)",
          color: "#fbbf24",
          padding: "3px 8px", borderRadius: 6,
          fontSize: 10, fontWeight: 800,
          letterSpacing: "0.05em",
        }}>🤖 FIDOLIN</span>
      </div>

      <div style={{
        aspectRatio: "3/4", overflow: "hidden", borderRadius: 12,
        background: "#000", marginBottom: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <img
          src={entry.thumbnail_url || entry.image_url}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <div style={{
        marginBottom: 12, padding: "10px 12px",
        background: "rgba(239,68,68,0.08)",
        borderLeft: "3px solid rgba(239,68,68,0.5)",
        borderRadius: 8,
        fontSize: 12, color: "rgba(241,241,245,0.75)",
        lineHeight: 1.5,
      }}>
        <div style={{ fontWeight: 700, color: "#fca5a5", marginBottom: 2 }}>
          Fidolin-Grund:
        </div>
        {entry.rejection_reason_text || entry.rejection_reason_code || "Kein Grund angegeben"}
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 11, color: "rgba(241,241,245,0.45)",
        marginBottom: 10,
      }}>
        <span>{entry.source_type || "—"} · #{entry.id}</span>
        <span>{date}</span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onRevert}
          style={{
            flex: 1, padding: "10px 14px",
            background: "linear-gradient(135deg, #10b981, #047857)",
            color: "#fff", border: "none", borderRadius: 10,
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          🔄 Doch freigeben
        </button>
        <Link
          href={`/mcp/akte/${entry.user_id}`}
          style={{
            padding: "10px 14px",
            background: "rgba(255,255,255,0.06)",
            color: "#f1f1f5", textDecoration: "none",
            borderRadius: 10,
            fontSize: 13, fontWeight: 700,
            display: "inline-flex", alignItems: "center",
          }}
        >
          📋 Akte
        </Link>
      </div>
    </div>
  );
}
