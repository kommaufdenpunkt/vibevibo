// Name mit hellem, kräftigem Grün-Hintergrund wenn online — gut sichtbar
// auf hellem UND dunklem Theme. Jappy-Klassiker.
import { isOnlineActivity } from "@/lib/activity";

export default function OnlineName({ lastSeen, children, style = {} }) {
  const online = isOnlineActivity(lastSeen);
  if (!online) return <span style={style}>{children}</span>;
  return (
    <span
      style={{
        background: "#86efac",                         // green-300 — saftig hell
        padding: "2px 8px",
        borderRadius: 6,
        boxShadow: "inset 0 0 0 1.5px #4ade80",        // grüner Innenrahmen
        textShadow: "0 1px 0 rgba(255,255,255,0.6)",   // bessere Lesbarkeit aller Namensfarben
        ...style,
      }}
    >
      {children}
    </span>
  );
}
