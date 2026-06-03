export const metadata = { title: "Impressum — VibeVibo" };

// Platzhalter-Impressum. Vor Live-Schaltung mit echten Daten ersetzen!

export default function ImpressumPage() {
  return (
    <div className="vv-card" style={{ maxWidth: 760, margin: "0 auto", padding: 18 }}>
      <h1>📜 Impressum</h1>

      <h2>Anbieter</h2>
      <p>
        <em>[Vor- und Nachname des Betreibers]</em><br/>
        <em>[Straße + Hausnummer]</em><br/>
        <em>[PLZ + Ort]</em><br/>
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <em>[deine Mail-Adresse]</em><br/>
        Web: <a href="/">vibevibo</a>
      </p>

      <h2>Verantwortlich für den Inhalt (§ 18 Abs. 2 MStV)</h2>
      <p>
        <em>[Vor- und Nachname, Anschrift wie oben]</em>
      </p>

      <h2>EU-Streitschlichtung</h2>
      <p>
        Plattform der EU-Kommission zur Online-Streitbeilegung (OS):{" "}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer noopener">
          https://ec.europa.eu/consumers/odr/
        </a>
      </p>
      <p>
        Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren
        einer Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <p className="vv-muted" style={{ fontSize: 11, marginTop: 24 }}>
        Hinweis: Vor offiziellem Launch zwingend mit echten Daten füllen.
        Pflichtangaben nach § 5 TMG sind verpflichtend.
      </p>
    </div>
  );
}
