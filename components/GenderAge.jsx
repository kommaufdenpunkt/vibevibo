import { NAME_COLOR_STYLES } from "@/lib/premium";

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
// nameColor: optionaler Premium-Override-Key (siehe NAME_COLOR_STYLES) — überschreibt die Geschlechtsfarbe.
export function ColoredName({ gender, age, name, size, fallbackColor, nameColor }) {
  const g = gender === "m" || gender === "w" ? gender : "";
  const hasAge = age != null && age !== "";

  const style = NAME_COLOR_STYLES[nameColor || ""] || null;
  // Default: Geschlechts-Farbe oder fallback.
  let color = g ? genderColor(g) : (fallbackColor || "inherit");
  let gradient = null;
  let fxClass = "";

  if (style) {
    if (style.gradient) gradient = style.gradient;
    else if (style.color) color = style.color;
    if (style.fx === "sparkle") fxClass = "vv-name-sparkle";
  }

  const prefix = (g ? g + " " : "") + (hasAge ? age + " " : "");

  // Bei Verlauf: nur der Name selbst kriegt den Gradient (Prefix bleibt einfarbig).
  if (gradient) {
    return (
      <span style={{ fontWeight: "bold", fontFamily: "Arial, sans-serif", fontSize: size, color }}>
        {prefix}
        <span
          className={fxClass}
          style={{
            backgroundImage: gradient,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            WebkitTextFillColor: "transparent",
            fontWeight: "bold",
          }}
        >{name}</span>
      </span>
    );
  }

  return (
    <span className={fxClass} style={{ color, fontWeight: "bold", fontFamily: "Arial, sans-serif", fontSize: size }}>
      {prefix}{name}
    </span>
  );
}
