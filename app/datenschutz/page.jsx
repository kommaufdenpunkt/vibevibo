export const metadata = { title: "Datenschutz — VibeVibo" };

// Platzhalter-Datenschutzerklaerung. Vor Live-Schaltung mit echter
// Anwalts-Vorlage (z.B. e-recht24.de) ersetzen!

export default function DatenschutzPage() {
  return (
    <div className="vv-card" style={{ maxWidth: 760, margin: "0 auto", padding: 18 }}>
      <h1>🛡 Datenschutzerklärung</h1>
      <p className="vv-muted" style={{ fontSize: 12 }}>
        Stand: <em>Platzhalter — vor Live-Schaltung durch echte Anwaltsvorlage ersetzen!</em>
      </p>

      <h2>1. Verantwortlich</h2>
      <p>
        Verantwortlich für die Datenverarbeitung ist der Betreiber von VibeVibo.<br/>
        Kontakt siehe <a href="/impressum">Impressum</a>.
      </p>

      <h2>2. Welche Daten verarbeiten wir?</h2>
      <ul>
        <li><b>Account-Daten</b>: Username, Anzeigename, Geschlecht, Geburtsdatum, optional Profilbild</li>
        <li><b>Inhalte</b>: deine Pinnwand-Posts, Status, Geschenke, Bilder, Nachrichten (verschlüsselt nur in Transit)</li>
        <li><b>Standort</b>: nur wenn du in der Karte explizit zustimmst, dann anonymisiert auf ~100m gerundet</li>
        <li><b>Werbung</b>: nur wenn du im Cookie-Banner zustimmst — siehe Punkt 4</li>
        <li><b>Sicherheit</b>: IP-Adresse zur Missbrauchs-Erkennung (gelöscht nach 30 Tagen)</li>
      </ul>

      <h2>3. Fidolin (KI-Moderation)</h2>
      <p>
        VibeVibo nutzt eine KI namens „Fidolin" (basiert auf Google Gemini) für:
      </p>
      <ul>
        <li>Profilbild-Prüfung (NSFW-Erkennung)</li>
        <li>Text-Moderation in öffentlichen Posts</li>
        <li>Erkennung von Missbrauch im Werbe-Reward-System</li>
      </ul>
      <p>
        Inhalte werden <b>zur Prüfung</b> an Google übertragen und sofort wieder verworfen.
        Es werden keine Trainingsdaten gespeichert.
      </p>

      <h2>4. Werbung (AdSense + Rewarded Ads)</h2>
      <p>
        Mit deiner Einwilligung im Cookie-Banner schalten wir Werbung über
        Google AdSense. Bei „personalisierter Werbung" setzt Google Cookies
        zur Interessen-Erkennung. Bei „generischer Werbung" werden keine
        personalisierten Profile erstellt.
      </p>
      <p>
        Bei Rewarded Ads (Video gucken für Vibes) verwenden wir den Drittanbieter
        <em> [Provider hier eintragen, sobald gewählt] </em>. Server-zu-Server-Callbacks
        verifizieren erfolgreiche Anzeigen — wir sehen keine personenbezogenen Daten
        aus der Werbung selbst.
      </p>
      <p>
        Du kannst deine Einwilligung jederzeit in den Profil-Einstellungen widerrufen.
      </p>

      <h2>5. Deine Rechte</h2>
      <p>
        Auskunft, Berichtigung, Löschung deines Kontos. Kontakt via{" "}
        <a href="/impressum">Impressum</a> oder Profil → Konto löschen.
      </p>

      <p className="vv-muted" style={{ fontSize: 11, marginTop: 24 }}>
        Hinweis: Vor offiziellem Launch zwingend durch eine professionelle
        Datenschutzerklärung ersetzen (z.B. von einem Anwalt oder über
        eRecht24/Datenschutz-Generator).
      </p>
    </div>
  );
}
