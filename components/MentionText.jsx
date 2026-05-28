import Link from "next/link";

// Rendert einen Text und verwandelt @username in einen Link zum Profil.
const MENTION_RE = /(@[a-z0-9_.]{3,30})/gi;

export default function MentionText({ text, color = "#c2185b" }) {
  const s = String(text || "");
  if (!s) return null;
  const parts = s.split(MENTION_RE);
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null;
        if (i % 2 === 1 && p.startsWith("@")) {
          const name = p.slice(1).toLowerCase();
          return <Link key={i} href={`/u/${name}`} style={{ color, fontWeight: "bold", textDecoration: "none" }}>{p}</Link>;
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
