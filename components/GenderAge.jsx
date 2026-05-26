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

// Ganzer Name im Jappy-Stil: "m 21 Anzeigename" – komplett in der Geschlechtsfarbe, Arial.
export function ColoredName({ gender, age, name, size }) {
  const g = gender === "m" || gender === "w" ? gender : "";
  const hasAge = age != null && age !== "";
  return (
    <span style={{ color: genderColor(g), fontWeight: "bold", fontFamily: "Arial, sans-serif", fontSize: size }}>
      {g ? g + " " : ""}{hasAge ? age + " " : ""}{name}
    </span>
  );
}
