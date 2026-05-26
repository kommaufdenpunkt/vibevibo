// Jappy-Style Kennung: "m 18" (m blau, w pink). Zeigt nichts, wenn unbekannt.
export default function GenderAge({ gender, age, size = "0.85em" }) {
  const g = gender === "m" || gender === "w" ? gender : "";
  const hasAge = age != null && age !== "";
  if (!g && !hasAge) return null;
  const color = g === "m" ? "#2a7fff" : g === "w" ? "#ff3e9d" : "#888";
  return (
    <span style={{ color, fontWeight: "bold", fontSize: size, whiteSpace: "nowrap" }}>
      {g}{g && hasAge ? " " : ""}{hasAge ? age : ""}
    </span>
  );
}
