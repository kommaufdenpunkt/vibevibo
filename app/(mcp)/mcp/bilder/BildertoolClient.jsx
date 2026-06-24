// 🖼 Client-Komponente — lädt Queue + rendered Cards.

"use client";

import { useEffect, useState } from "react";
import ImageReviewCard from "@/components/mcp/ImageReviewCard";

export default function BildertoolClient() {
  const [images, setImages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const r = await fetch("/api/mcp/images/queue?limit=50", { credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Konnte Queue nicht laden.");
      setImages(d.images || []);
      setTemplates(d.templates || []);
      setTotal(d.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleDone(imageId, action) {
    // Bild aus lokaler Liste entfernen (es ist jetzt approved oder rejected)
    setImages((prev) => prev.filter((i) => i.id !== imageId));
    setTotal((prev) => Math.max(0, prev - 1));
  }

  return (
    <div className="mcp-app" style={{ paddingBottom: 80 }}>
      <div className="mcp-header">
        <div className="mcp-header-row">
          <div className="mcp-brand">
            <div className="mcp-brand-mark">🖼</div>
            <div className="mcp-brand-text">
              BILDERTOOL
              <small>INSTAGRAM-STYLE FEED</small>
            </div>
          </div>
        </div>
        <div className="mcp-greeting">
          <div className="mcp-greeting-time">
            {total === 0 ? "Alles ruhig" : `${total} ${total === 1 ? "Bild" : "Bilder"} warten`}
          </div>
          <div className="mcp-greeting-text">
            <span className="accent">Bild-Moderation</span>
          </div>
        </div>
      </div>

      <div className="mcp-content" style={{ paddingTop: 8 }}>
        {loading && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--mcp-text-mid, rgba(241,241,245,0.5))" }}>
            🔄 Lade Queue …
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

        {!loading && !error && images.length === 0 && (
          <div style={{
            padding: 48, textAlign: "center",
            background: "rgba(16,185,129,0.06)",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: 16,
          }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#86efac", marginBottom: 6 }}>
              Queue ist leer
            </div>
            <div style={{ fontSize: 13, color: "var(--mcp-text-mid, rgba(241,241,245,0.55))", lineHeight: 1.6, maxWidth: 420, margin: "0 auto" }}>
              Aktuell sind keine Bilder zur Moderation offen.<br/>
              <br/>
              <strong>Zum Testen:</strong> per CLI Bilder in die Queue legen mit{" "}
              <code style={{
                background: "rgba(255,255,255,0.06)", padding: "2px 6px",
                borderRadius: 4, fontSize: 11,
              }}>
                scripts/add-test-image-to-queue.mjs
              </code>
            </div>
          </div>
        )}

        {!loading && images.length > 0 && (
          <div>
            <div style={{
              marginBottom: 16, padding: "10px 14px",
              background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.25)",
              borderRadius: 10, fontSize: 12, color: "rgba(241,241,245,0.75)",
              lineHeight: 1.5,
            }}>
              💡 Tipp: Bei Ablehnung wird automatisch eine orange System-DM an den User
              geschickt + das Bild in seiner Akte vermerkt. Komplett dynamisch.
            </div>

            {images.map(image => (
              <ImageReviewCard
                key={image.id}
                image={image}
                templates={templates}
                onDone={handleDone}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
