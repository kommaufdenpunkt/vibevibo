import Link from "next/link";

export default function Footer() {
  return (
    <footer className="vv-footer">
      <div style={{ marginBottom: 6 }}>
        ✿ VibeVibo © 2026 - made with ♥ for everyone who misses the old web ✿
      </div>
      <div className="vv-muted" style={{ marginBottom: 8 }}>
        in Gedenken an MySpace · wer-kennt-wen · SchülerVZ · Jappy · Lokalisten · Kwick · Knuddels · MeineFreundeInsel
      </div>
      <nav style={{
        display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center",
        fontSize: 12, marginTop: 4,
      }}>
        <Link href="/about">Über uns</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/hilfe">Hilfe</Link>
        <Link href="/neu">Was ist neu?</Link>
        <Link href="/wuensche">💡 Wunschseite</Link>
        <Link href="/agb">AGB</Link>
        <Link href="/datenschutz">Datenschutz</Link>
        <Link href="/impressum">Impressum</Link>
      </nav>
    </footer>
  );
}
