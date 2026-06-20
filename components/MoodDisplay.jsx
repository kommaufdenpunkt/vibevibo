"use client";

// 🎭 MoodDisplay — zeigt Mood eines Users im Profil-Header.
// Bei glitterStatus=1 → Glitter-Animation drauf.

export default function MoodDisplay({ emoji, text, setAt, glitter }) {
  if (!emoji && !text) return null;
  return (
    <div className={glitter ? "vv-mood-glitter" : ""} style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "8px 14px", borderRadius: 999,
      background: "linear-gradient(135deg, rgba(236,72,153,0.18), rgba(168,85,247,0.12))",
      border: "1px solid rgba(236,72,153,0.3)",
      maxWidth: "100%", overflow: "hidden",
    }}>
      {emoji && <span style={{ fontSize: 22, lineHeight: 1 }}>{emoji}</span>}
      {text && (
        <span style={{
          fontSize: 13, color: "#1c1c1e", fontWeight: 700,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{text}</span>
      )}
      {setAt && (Date.now() - setAt) < 24 * 3600 * 1000 && (
        <span style={{ fontSize: 9, color: "#a855f7", fontWeight: 800, textTransform: "uppercase" }}>frisch</span>
      )}
    </div>
  );
}
