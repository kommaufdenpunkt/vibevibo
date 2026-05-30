// Name mit zartem hellgrünem Hintergrund wenn online — Jappy-Klassiker.
// Verwendet activityLevel: online = Stufe 3+ (höchstens 10 Min weg).
import { isOnlineActivity } from "@/lib/activity";

export default function OnlineName({ lastSeen, children, style = {} }) {
  const online = isOnlineActivity(lastSeen);
  if (!online) return <span style={style}>{children}</span>;
  return (
    <span
      style={{
        background: "rgba(76, 217, 100, 0.22)",
        padding: "1px 6px",
        borderRadius: 5,
        boxShadow: "inset 0 0 0 1px rgba(76,217,100,0.35)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
