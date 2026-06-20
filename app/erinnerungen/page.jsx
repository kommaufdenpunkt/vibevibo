"use client";

// 📅 Heute vor X Jahren — eigene Erinnerungen aus dem heutigen Tag in vergangenen Jahren.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useMe } from "@/lib/useMe";

export default function MemoriesPage() {
  const { me } = useMe();
  const [data, setData] = useState(null);
  const [reposting, setReposting] = useState(null);
  const [toast, setToast] = useState("");

  const refresh = useCallback(() => {
    fetch("/api/me/memories")
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (!me) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: "40px auto 0", textAlign: "center" }}>
        <div style={{ fontSize: 50 }}>📅</div>
        <h1>Heute vor X Jahren</h1>
        <p>Bitte einloggen.</p>
        <Link href="/login?next=/erinnerungen" className="vv-btn">🔑 Einloggen</Link>
      </div>
    );
  }

  if (!data) {
    return <div className="vv-card" style={{ maxWidth: 720, margin: "20px auto" }}>Lädt...</div>;
  }

  const memories = data.memories || [];

  async function repost(mem) {
    setReposting(mem.id + mem.kind);
    try {
      const r = await fetch("/api/me/memories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: mem.kind,
          originalText: mem.text || mem.note || mem.caption || "",
          yearsAgo: mem.yearsAgo,
        }),
      });
      if (r.ok) {
        setToast("📅 Erinnerung auf deiner Pinnwand gepostet!");
        setTimeout(() => setToast(""), 3500);
      } else {
        const d = await r.json();
        setToast("⚠ " + (d.error || "Fehler"));
        setTimeout(() => setToast(""), 4000);
      }
    } catch {
      setToast("⚠ Netzwerk-Fehler");
      setTimeout(() => setToast(""), 4000);
    } finally { setReposting(null); }
  }

  return (
    <div style={{ maxWidth: 720, margin: "20px auto", padding: 12 }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(249,115,22,0.18), rgba(236,72,153,0.12))",
        border: "1px solid rgba(249,115,22,0.3)",
        borderRadius: 16, padding: 18, marginBottom: 18, textAlign: "center",
      }}>
        <div style={{ fontSize: 38 }}>📅</div>
        <h1 style={{ margin: "6px 0 4px", fontSize: 22, fontWeight: 900 }}>Heute vor … Jahren</h1>
        <p style={{ fontSize: 13, color: "#475569", margin: 0, lineHeight: 1.5 }}>
          Was war an einem <b>{data.todayLabel}</b> in deiner VibeVibo-Vergangenheit?
        </p>
      </div>

      {toast && (
        <div style={{
          padding: 12, marginBottom: 12, borderRadius: 10, fontSize: 13, fontWeight: 700,
          background: toast.startsWith("⚠") ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.12)",
          color: toast.startsWith("⚠") ? "#991b1b" : "#15803d",
          textAlign: "center",
        }}>{toast}</div>
      )}

      {memories.length === 0 ? (
        <div style={{
          background: "rgba(255,255,255,0.85)", padding: 30, borderRadius: 16,
          textAlign: "center", color: "#64748b",
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌱</div>
          <h3 style={{ margin: "0 0 8px" }}>Heute keine Erinnerungen — noch nicht.</h3>
          <p style={{ fontSize: 13, lineHeight: 1.5 }}>
            Je länger du bei VibeVibo bist, desto mehr Erinnerungen findet diese Seite.
            Komm in einem Jahr wieder — dann erinnern wir uns gemeinsam an heute! 💖
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {memories.map((m) => (
            <MemoryCard
              key={`${m.kind}-${m.id}`}
              memory={m}
              onRepost={() => repost(m)}
              busy={reposting === (m.id + m.kind)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MemoryCard({ memory, onRepost, busy }) {
  const yearsLabel = memory.yearsAgo === 1 ? "1 Jahr" : `${memory.yearsAgo} Jahre`;
  return (
    <div style={{
      background: "rgba(255,255,255,0.92)",
      borderRadius: 14, padding: 16,
      border: "1px solid rgba(249,115,22,0.2)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
        paddingBottom: 8, borderBottom: "1px dashed #f4a261",
      }}>
        <span style={{
          background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff",
          padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 900, letterSpacing: 0.5,
        }}>
          ⏳ vor {yearsLabel}
        </span>
        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>
          {new Date(memory.at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
        </span>
      </div>

      <MemoryBody memory={memory} />

      <button onClick={onRepost} disabled={busy} style={{
        marginTop: 12, padding: "9px 14px", borderRadius: 10,
        background: "linear-gradient(135deg, #ec4899, #a855f7)", color: "#fff",
        border: "none", fontWeight: 800, fontSize: 12, cursor: busy ? "wait" : "pointer",
        fontFamily: "inherit",
      }}>
        {busy ? "⏳…" : "📅 Auf meine Pinnwand reposten"}
      </button>
    </div>
  );
}

function MemoryBody({ memory }) {
  if (memory.kind === "pinnwand") {
    return (
      <>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Avatar url={memory.from.avatarUrl} name={memory.from.displayName} className="vv-avatar vv-avatar-sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>
              📌 Pinnwand-Eintrag von <b>{memory.from.displayName}</b>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: "#1c1c1e", whiteSpace: "pre-wrap" }}>
              {memory.text}
            </div>
          </div>
        </div>
      </>
    );
  }
  if (memory.kind === "gift") {
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{ fontSize: 32 }}>🎁</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>
            Geschenk von <b>{memory.from.displayName}</b>
          </div>
          {memory.note && (
            <div style={{ fontSize: 13, fontStyle: "italic", color: "#475569" }}>
              „{memory.note}"
            </div>
          )}
        </div>
      </div>
    );
  }
  if (memory.kind === "photo") {
    return (
      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
          📸 Du hast ein Foto hochgeladen
        </div>
        {memory.dataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={memory.dataUrl} alt="" style={{
            maxWidth: "100%", maxHeight: 320, borderRadius: 10, display: "block",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }} />
        )}
        {memory.caption && (
          <div style={{ fontSize: 13, color: "#475569", marginTop: 6, fontStyle: "italic" }}>
            „{memory.caption}"
          </div>
        )}
      </div>
    );
  }
  if (memory.kind === "status") {
    return (
      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
          💬 Dein Status
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: "#1c1c1e", whiteSpace: "pre-wrap" }}>
          {memory.text}
        </div>
        {memory.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={memory.imageUrl} alt="" style={{
            maxWidth: "100%", maxHeight: 240, borderRadius: 10, marginTop: 8,
          }} />
        )}
      </div>
    );
  }
  return null;
}
