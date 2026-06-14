"use client";

// ✨ Premium-Skeleton — eleganter Lade-Indikator mit Shimmer-Effekt
// statt nüchternem "⏳ Lade...".

export default function PremiumSkeleton({
  type = "page",  // "page" | "card" | "row" | "tile"
  height,
}) {
  if (type === "row") {
    return <div style={{
      ...skeletonBase,
      height: height || 60,
      borderRadius: 12,
      margin: "8px 0",
    }} />;
  }
  if (type === "tile") {
    return <div style={{
      ...skeletonBase,
      height: height || 110,
      borderRadius: 16,
    }} />;
  }
  if (type === "card") {
    return <div style={{
      ...skeletonBase,
      height: height || 200,
      borderRadius: 16,
      margin: "8px 0",
    }} />;
  }
  // type === "page" — komplettes Layout
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "12px 12px 0" }}>
      <div style={{ ...skeletonBase, height: 130, borderRadius: 20, marginBottom: 14 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 14 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ ...skeletonBase, height: 110, borderRadius: 18 }} />
        ))}
      </div>
      <div style={{ ...skeletonBase, height: 180, borderRadius: 16 }} />
      <style>{shimmerCss}</style>
    </div>
  );
}

const skeletonBase = {
  background: "linear-gradient(90deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.4) 100%)",
  backgroundSize: "200% 100%",
  animation: "vv-shimmer 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
};

const shimmerCss = `
  @keyframes vv-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;
