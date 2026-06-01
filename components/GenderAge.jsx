// Jappy-Style Kennung. m = blau, w = pink.
export function genderColor(gender) {
  return gender === "m" ? "#2a7fff" : gender === "w" ? "#ff3e9d" : "inherit";
}

// Nur die Kennung "m 21" (z.B. in Formularen/Listen)
export default function GenderAge({ gender, age, size = "0.85em" }) {
  const g = gender === "m" || gender === "w" ? gender : "";
  const hasAge = age != null && age !== "";
  if (!g && !hasAge) return null;
  return (
    <span style={{ color: genderColor(g), fontWeight: "bold", fontSize: size, fontFamily: "Arial, sans-serif", whiteSpace: "nowrap" }}>
      {g}{g && hasAge ? " " : ""}{hasAge ? age : ""}
    </span>
  );
}

// Ganzer Name im Jappy-Stil: "m 21 Anzeigename" – in der Geschlechtsfarbe, Arial.
// fallbackColor: Farbe, wenn kein Geschlecht gesetzt ist (z.B. hell auf dunklem Balken).
export function ColoredName({ gender, age, name, size, fallbackColor }) {
  const g = gender === "m" || gender === "w" ? gender : "";
  const hasAge = age != null && age !== "";
  const color = g ? genderColor(g) : (fallbackColor || "inherit");
  return (
    <span style={{ color, fontWeight: "bold", fontFamily: "Arial, sans-serif", fontSize: size }}>
      {g ? g + " " : ""}{hasAge ? age + " " : ""}{name}
    </span>
  );
}
