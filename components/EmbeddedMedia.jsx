"use client";

// Geteilte Komponenten: Audio-Player + YouTube/Spotify-Embed.
// Wird in Buschfunk, Pinnwand und Status-Anzeige genutzt.
// Autoplay ist BROWSER-seitig nur ohne Ton erlaubt - daher startet das
// Video stumm + User klickt "Ton an".

import { useState } from "react";
import { deserializeMedia } from "@/lib/media";

export function VoiceMessage({ src, compact = false }) {
  if (!src) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "var(--vv-surface, #f5f5f7)",
      border: "1px solid var(--vv-border, #ddd)",
      borderRadius: 10, padding: compact ? 6 : 8,
      marginTop: 6,
    }}>
      <span style={{ fontSize: compact ? 14 : 16 }}>🎤</span>
      <audio src={src} controls preload="metadata" style={{ flex: 1, height: compact ? 28 : 32 }} />
    </div>
  );
}

export function MusicEmbed({ mediaJson }) {
  const media = typeof mediaJson === "string" ? deserializeMedia(mediaJson) : mediaJson;
  if (!media || !media.embedUrl) return null;

  if (media.provider === "youtube") {
    return (
      <div style={{
        position: "relative", marginTop: 8,
        borderRadius: 10, overflow: "hidden",
        background: "#000", aspectRatio: "16/9",
        maxHeight: 280,
      }}>
        <iframe
          src={media.embedUrl}
          title="YouTube"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: 0 }}
        />
        <div style={{
          position: "absolute", top: 6, left: 6,
          background: "rgba(0,0,0,0.7)", color: "#fff",
          padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700,
        }}>▶ YouTube · Auto-Play (stumm) — klick für Ton</div>
      </div>
    );
  }

  if (media.provider === "spotify") {
    const tall = media.kind === "playlist" || media.kind === "album";
    return (
      <div style={{
        marginTop: 8, borderRadius: 12, overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}>
        <iframe
          src={media.embedUrl}
          title="Spotify"
          allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture"
          allowTransparency="true"
          style={{ width: "100%", height: tall ? 360 : 152, border: 0 }}
        />
      </div>
    );
  }

  return null;
}

export default function EmbeddedMedia({ audioUrl, mediaJson, compact }) {
  if (!audioUrl && !mediaJson) return null;
  return (
    <>
      <VoiceMessage src={audioUrl} compact={compact} />
      <MusicEmbed mediaJson={mediaJson} />
    </>
  );
}
