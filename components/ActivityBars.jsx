// 5-Balken-Aktivitäts-Anzeige im Stil von Jappy & Mobilfunk-Empfang.
import { activityLevel, activityColor } from "@/lib/activity";

const SIZES = {
  xs: { w: 1.5, gap: 1,   h: [3, 5, 7, 9, 11] },
  sm: { w: 2,   gap: 1.5, h: [4, 6, 8, 11, 14] },
  md: { w: 3,   gap: 2,   h: [5, 8, 11, 14, 17] },
  lg: { w: 4,   gap: 2.5, h: [7, 10, 14, 18, 22] },
};

export default function ActivityBars({ lastSeen, size = "sm", title }) {
  const level = activityLevel(lastSeen);
  const color = activityColor(level);
  const c = SIZES[size] || SIZES.sm;
  return (
    <span
      title={title}
      aria-label={`Aktivität: ${level}/5`}
      style={{
        display: "inline-flex",
        alignItems: "flex-end",
        gap: c.gap,
        verticalAlign: "middle",
      }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: c.w,
            height: c.h[i],
            background: i < level ? color : "rgba(120,120,128,0.22)",
            borderRadius: 1,
            transition: "background 0.2s",
          }}
        />
      ))}
    </span>
  );
}
