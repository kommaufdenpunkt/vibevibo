export const metadata = {
  title: "Datenschutzerklärung — VibeVibo",
  description: "Wie wir mit deinen Daten umgehen, welche Cookies wir setzen, und wie Werbung über Google AdSense funktioniert.",
};

export default function DatenschutzPage() {
  return (
    <div className="vv-card" style={{ maxWidth: 760, margin: "0 auto", padding: 18 }}>
      <h1>🛡 Datenschutzerklärung</h1>
      <p className="vv-muted" style={{ fontSize: 12 }}>
        Stand: Juni 2026
      </p>

      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlich für die Datenverarbeitung auf dieser Website im Sinne
        der DSGVO ist:
      </p>
      <p>
        4ever1.tv<br/>
        c/o IP-Management #9293<br/>
        Ludwig-Erhard-Straße 18<br/>
        20459 Hamburg, Deutschland<br/>
        E-Mail: <a href="mailto:ginoheidrich@outlook.com">ginoheidrich@outlook.com</a>
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <h3>2.1 Server-Logs (notwendig)</h3>
      <p>
        Beim Aufruf der Website werden automatisch Daten an unseren Server
        übertragen und für maximal 30 Tage gespeichert:
      </p>
      <ul>
        <li>IP-Adresse (zur Missbrauchs-Erkennung, anti-Hacker-Schutz)</li>
        <li>User-Agent (Browser-/Geräte-Typ)</li>
        <li>Zugriffs-Datum und -Uhrzeit</li>
        <li>Aufgerufene URL</li>
      </ul>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse:
        Betrieb und Sicherheit der Plattform).
      </p>

      <h3>2.2 Account-Daten</h3>
      <ul>
        <li>Username, Anzeigename, Geschlecht, Geburtsdatum, optional Profilbild</li>
        <li>Passwort (gehasht mit bcrypt — wir können es nicht entschlüsseln)</li>
        <li>Optionale Angaben: Status, Familienstand, Hobbys, Beruf etc.</li>
      </ul>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
      </p>

      <h3>2.3 Nutzer-Inhalte</h3>
      <p>
        Pinnwand-Posts, Status-Updates, Sprachnachrichten, Geschenke, Bilder,
        Gruppen-Beiträge, Direktnachrichten. Inhalte sind nur für die
        jeweils berechtigten Empfänger sichtbar (je nach Privacy-Einstellung).
      </p>

      <h2>3. KI-Moderation („Fidolin")</h2>
      <p>
        Zum Schutz unserer Community nutzen wir eine KI-gestützte
        Inhalts-Moderation („Fidolin", basiert auf <b>Google Gemini</b>):
      </p>
      <ul>
        <li>Profilbild- und Foto-Prüfung (NSFW-Erkennung)</li>
        <li>Text-Moderation in öffentlichen Posts und privaten Nachrichten</li>
        <li>Sprachnachrichten-Transkription und -Prüfung</li>
        <li>Voice-Gender-Erkennung zur Anti-Fake-Account-Sicherung</li>
        <li>Erkennung von Werbe-Reward-Missbrauch</li>
      </ul>
      <p>
        Inhalte werden <b>zur einmaligen Prüfung</b> an Google übermittelt
        und nach der Bewertung verworfen. Google nutzt diese Daten gemäß
        eigener Zusicherung nicht zum Training. Mehr Infos:{" "}
        <a href="https://ai.google.dev/terms" target="_blank" rel="noreferrer noopener">
          Google AI Studio Terms of Service
        </a>.
      </p>

      <h2>4. Werbung — Google AdSense</h2>
      <p>
        Diese Website nutzt <b>Google AdSense</b>, einen Dienst zum Einbinden
        von Werbeanzeigen der Google Ireland Limited („Google"), Gordon House,
        Barrow Street, Dublin 4, Irland.
      </p>
      <p>
        Google AdSense verwendet Cookies und Web Beacons (kleine unsichtbare
        Grafiken), um die Benutzung der Website analysieren zu können.
        Hierdurch erhobene Informationen über die Nutzung dieser Website
        werden in der Regel an einen Server von Google in den USA übertragen
        und dort gespeichert.
      </p>
      <p>
        Du kannst die Installation der Cookies durch eine entsprechende
        Einstellung deiner Browser-Software verhindern oder im Cookie-Banner
        eine entsprechende Auswahl treffen. Mehr Informationen:
      </p>
      <ul>
        <li>
          <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noreferrer noopener">
            Wie Google Daten von Websites/Apps verwendet, die unsere Dienste nutzen
          </a>
        </li>
        <li>
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer noopener">
            Google-Datenschutzerklärung
          </a>
        </li>
        <li>
          <a href="https://adssettings.google.com/" target="_blank" rel="noreferrer noopener">
            Werbeeinstellungen verwalten / Personalisierung deaktivieren
          </a>
        </li>
      </ul>
      <p>
        <b>Consent:</b> Anzeigen werden erst geladen wenn du im Cookie-Banner
        zugestimmt hast. Bei „Generische Werbung" bekommst du nicht
        personalisierte Anzeigen. Du kannst deine Einwilligung jederzeit in
        den Profil-Einstellungen widerrufen.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).
      </p>

      <h2>5. Rewarded Ads (Vibes verdienen)</h2>
      <p>
        Optional kannst du Werbevideos anschauen und dafür unsere virtuelle
        Plattform-Währung „Vibes" erhalten. Dabei verwenden wir je nach
        Konfiguration verschiedene Drittanbieter. Server-zu-Server-Callbacks
        verifizieren erfolgreich angeschaute Anzeigen, ohne dass wir
        personenbezogene Daten aus der Werbung selbst sehen.
      </p>

      <h2>6. Cookies — Übersicht</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--vv-surface, #f5f5f7)" }}>
            <th style={tdStyle}>Cookie</th>
            <th style={tdStyle}>Zweck</th>
            <th style={tdStyle}>Dauer</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>vv_session</td><td style={tdStyle}>Login-Session (essenziell)</td><td style={tdStyle}>30 Tage</td></tr>
          <tr><td style={tdStyle}>vv_device</td><td style={tdStyle}>Geräte-Wiedererkennung (Sicherheit)</td><td style={tdStyle}>1 Jahr</td></tr>
          <tr><td style={tdStyle}>ads_consent (im User-Profil)</td><td style={tdStyle}>Deine Cookie-Wahl</td><td style={tdStyle}>dauerhaft bis Widerruf</td></tr>
          <tr><td style={tdStyle}>__gads, __gpi, NID (Google)</td><td style={tdStyle}>AdSense / Anzeigen-Personalisierung — NUR mit Consent</td><td style={tdStyle}>bis 13 Monate</td></tr>
        </tbody>
      </table>

      <h2>7. Deine Rechte</h2>
      <p>Du hast jederzeit das Recht auf:</p>
      <ul>
        <li>Auskunft über die zu deiner Person gespeicherten Daten (Art. 15 DSGVO)</li>
        <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
        <li>Löschung deiner Daten („Recht auf Vergessenwerden", Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerruf einer erteilten Einwilligung (Art. 7 Abs. 3 DSGVO)</li>
        <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO) — für Hamburg:
          {" "}<a href="https://datenschutz-hamburg.de" target="_blank" rel="noreferrer noopener">datenschutz-hamburg.de</a>
        </li>
      </ul>
      <p>
        Wende dich an{" "}
        <a href="mailto:ginoheidrich@outlook.com">ginoheidrich@outlook.com</a>
        {" "}oder lösche dein Konto direkt im Profil unter „Einstellungen → Konto löschen".
      </p>

      <h2>8. Hosting</h2>
      <p>
        Diese Website wird auf einem Server in der EU gehostet. Die
        SQLite-Datenbank liegt auf demselben Server. Backups werden
        verschlüsselt aufbewahrt.
      </p>

      <h2>9. Änderungen dieser Datenschutzerklärung</h2>
      <p>
        Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie
        stets den aktuellen rechtlichen Anforderungen entspricht oder um
        Änderungen unserer Leistungen in der Datenschutzerklärung umzusetzen.
        Für deinen erneuten Besuch gilt dann die neue Datenschutzerklärung.
      </p>

      <p className="vv-muted" style={{ fontSize: 11, marginTop: 24 }}>
        Bei Fragen zum Datenschutz: <a href="mailto:ginoheidrich@outlook.com">ginoheidrich@outlook.com</a>
      </p>
    </div>
  );
}

const tdStyle = { padding: "8px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", textAlign: "left", verticalAlign: "top" };
