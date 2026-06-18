"use client";

// ✓ Verifiziert-Badge — wird neben dem Username angezeigt.
// Bedeutet: User hat per Stimm-Probe sein angegebenes Geschlecht bestätigt.

export default function VerifiedBadge({ size = 14, title = "Stimm-verifiziert" }) {
  return (
    <span
      title={title}
      aria-label={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size + 4,
        height: size + 4,
        borderRadius: 999,
        background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
        color: "#fff",
        fontSize: size - 2,
        fontWeight: 900,
        verticalAlign: "middle",
        marginLeft: 4,
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }}>
      ✓
    </span>
  );
}
