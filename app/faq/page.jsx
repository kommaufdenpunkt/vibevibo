export const metadata = {
  title: "FAQ — Häufige Fragen zu VibeVibo",
  description: "Antworten auf die häufigsten Fragen rund um VibeVibo: Anmeldung, Vibes, Coms, Live-Streams, Sicherheit, Datenschutz und mehr.",
};

const FAQS = [
  {
    q: "Was ist VibeVibo?",
    a: "VibeVibo ist eine nostalgische Social-Plattform, die das Lebensgefühl von Jappy, SchülerVZ, MySpace und Lokalisten zurückbringt. Profile mit Persönlichkeit, Pinnwand statt Algorithmus, Gruscheln, Geschenke, Live-Streams und Gemeinschaft (Coms) — alles ohne den Zwang heutiger Mainstream-Plattformen. Mehr unter Über uns.",
  },
  {
    q: "Ist VibeVibo kostenlos?",
    a: "Ja, die Nutzung ist grundsätzlich kostenlos. Die Plattform finanziert sich über dezent eingeblendete Werbung (Google AdSense), optionale Premium-Pässe und den Kauf der virtuellen Währung „Vibes“ für Geschenke und Funktionen.",
  },
  {
    q: "Wie alt muss ich sein um VibeVibo zu nutzen?",
    a: "Das Mindestalter beträgt 14 Jahre. Wir prüfen das per Geburtsdatum-Angabe bei der Registrierung. Profile mit erkennbar falschen Altersangaben werden gesperrt.",
  },
  {
    q: "Was sind „Vibes“ (✨)?",
    a: "Vibes sind die virtuelle Plattform-Währung von VibeVibo. Du verdienst sie automatisch durch tägliches Einloggen, durch Aktivität (Posts, Reaktionen, Profil-Besuche), durch Achievements oder optional durch das Anschauen von Werbevideos. Du kannst Vibes für Geschenke, Profil-Boosts, Com-Funktionen oder Premium-Features ausgeben.",
  },
  {
    q: "Was sind „Coms“?",
    a: "Coms sind Communities/Gruppen — vergleichbar mit den Gruppen bei SchülerVZ oder den Foren bei Jappy. Jede Com hat einen Owner, optional Officers (Moderatoren), eine Pinnwand, ein Forum, News-Posts und ein eigenes Theme. Owner können besondere Funktionen mit Vibes freischalten (Live-Polls, Quiz-Night, Meetup-Planer, Throwback-Feed u.v.m.).",
  },
  {
    q: "Wie funktioniert der Frauen-Schutz?",
    a: "Bei VibeVibo werden weibliche Accounts standardmäßig strenger geschützt: Nachrichten von Fremden werden auf Anbaggern, Übergriffigkeiten und sexuelle Anspielungen vorgefiltert (Fidolin-KI). Sprachnachrichten werden transkribiert und mitgeprüft. Zusätzlich gibt es eine freiwillige Stimm-Verifikation: Mit einer kurzen Sprachprobe bestätigst du dein angegebenes Geschlecht, bekommst ein ✓-Badge und kannst einstellen „nur verifizierte Accounts dürfen mir schreiben“. Männliche Accounts, die sich als weiblich ausgeben, werden über Voice-Analysen erkannt.",
  },
  {
    q: "Wer ist Fidolin?",
    a: "Fidolin ist der KI-Moderator von VibeVibo. Er prüft Bilder, Texte und Sprachnachrichten in Echtzeit auf Beleidigungen, Hass, Belästigung, sexuell explizite Inhalte und Spam. Beiträge, die Fidolin blockiert, kommen erst gar nicht bei der Empfängerin/dem Empfänger an. Fidolin basiert auf Google Gemini.",
  },
  {
    q: "Kann ich Sprachnachrichten verschicken?",
    a: "Ja! Sprachnachrichten gehen überall: in Direktchats, Gruppen-Räumen und Buschfunk-Kommentaren. Fidolin transkribiert und prüft sie automatisch. Maximal 60 Sekunden pro Nachricht.",
  },
  {
    q: "Wie kann ich live streamen?",
    a: "Über den 🎥-Button kannst du einen Solo-Stream starten oder als „Multi-Couch“ bis zu 16 Hosts gleichzeitig auf die Bühne holen. Zuschauer können per Sprach- oder Text-Chat kommentieren, Reaktionen senden und mit Vibes Geschenke verschenken. Du brauchst einen modernen Browser (Chrome, Edge, Safari) und musst Kamera/Mikrofon erlauben.",
  },
  {
    q: "Kann ich mein Konto löschen?",
    a: "Ja, jederzeit. Im Profil unter „Einstellungen → Konto löschen“. Deine Daten werden dabei vollständig entfernt — bis auf einige aggregierte Statistiken die nicht mehr auf dich zurückführbar sind.",
  },
  {
    q: "Welche Daten speichert VibeVibo über mich?",
    a: "Nur was du selbst angibst (Username, Anzeigename, Geschlecht, Geburtsdatum, optional Profilbild und Hobbys) sowie technische Daten zur Sicherheit (IP-Adresse für max. 30 Tage, Geräte-ID). Passwörter sind mit bcrypt gehasht und nicht entschlüsselbar. Wir verkaufen keine Daten an Dritte. Details in der Datenschutzerklärung.",
  },
  {
    q: "Wie funktioniert Werbung bei VibeVibo?",
    a: "Werbung läuft über Google AdSense und nur, wenn du im Cookie-Banner zugestimmt hast. Du kannst zwischen „Generischer Werbung“ (keine Personalisierung) und „Personalisierter Werbung“ wählen, oder Werbung komplett ablehnen („Nur essenziell“). Bei Premium-Mitgliedern wird keine Werbung angezeigt. In intimen Bereichen (Messenger, Vibo-Pet, Editor) ist Werbung grundsätzlich aus.",
  },
  {
    q: "Was passiert wenn ich gemeldet werde?",
    a: "Beiträge die andere User melden werden von Moderatoren geprüft. Bei klaren Verstößen werden sie entfernt und der Account bekommt einen Strike. Drei Strikes innerhalb von 90 Tagen führen zu einer 24-Stunden-Sperre, weitere zu längeren Sperren bis hin zum permanenten Bann. Fidolin selbst kann bei eindeutigen Verstößen (Hass, Drohung, Pornografie) auch ohne Meldung sofort sperren.",
  },
  {
    q: "Was sind die Mindestanforderungen?",
    a: "Ein moderner Browser (Chrome, Edge, Safari, Firefox — jeweils aktuelle Version). Für Live-Streams: Mikrofon-Zugriff (Pflicht), Kamera-Zugriff (optional). Internet-Verbindung min. 2 Mbit/s. Auf Mobile geht alles ohne App — du kannst VibeVibo aber als Progressive Web App auf den Homescreen pinnen.",
  },
  {
    q: "Wie kontaktiere ich den Support?",
    a: "Per E-Mail an ginoheidrich@outlook.com. Bitte beschreibe dein Problem so genau wie möglich (Username, was passiert ist, Screenshot wenn möglich). Bei akuten Fällen wie Belästigung oder Bedrohung schreib uns sofort, wir reagieren schnell.",
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQS.map((f) => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a },
    })),
  };
  return (
    <article className="vv-card" style={{ maxWidth: 780, margin: "0 auto", padding: 22, lineHeight: 1.6 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1>❓ Häufige Fragen zu VibeVibo</h1>
      <p>
        Hier findest du Antworten auf die wichtigsten Fragen rund um VibeVibo.
        Wenn deine Frage nicht dabei ist, schau in unsere{" "}
        <a href="/hilfe">Hilfe</a> oder schreib an{" "}
        <a href="mailto:ginoheidrich@outlook.com">ginoheidrich@outlook.com</a>.
      </p>

      {FAQS.map((f, i) => (
        <section key={i} style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>{f.q}</h2>
          <p style={{ marginTop: 4 }}>{f.a}</p>
        </section>
      ))}

      <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid rgba(0,0,0,0.1)" }} />
      <p>
        Weitere Themen: <a href="/about">Über VibeVibo</a> · <a href="/hilfe">Hilfe</a> ·{" "}
        <a href="/neu">Neuigkeiten</a> · <a href="/datenschutz">Datenschutz</a> ·{" "}
        <a href="/impressum">Impressum</a>
      </p>
    </article>
  );
}
