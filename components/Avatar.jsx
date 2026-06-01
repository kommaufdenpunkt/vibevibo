// Einheitlicher Avatar: zeigt das Hauptprofilbild; ohne Bild einen neutralen
// Platzhalter (erster Buchstabe des Namens) – kein Emoji mehr.
export default function Avatar({ url, name = "", className = "vv-avatar", style }) {
  const letter = (String(name || "").trim().charAt(0) || "?").toUpperCase();
  return (
    <div className={className} style={{ overflow: "hidden", ...style }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ color: "#b9b9c6", fontWeight: "bold" }}>{letter}</span>
      )}
    </div>
  );
}
