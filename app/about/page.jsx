export const metadata = {
  title: "Über VibeVibo — die nostalgische Community von 2003 bis heute",
  description: "VibeVibo bringt das Lebensgefühl der frühen Web-2.0-Ära zurück: Jappy, SchülerVZ, MySpace, Lokalisten, wer-kennt-wen — moderne Plattform, alter Zauber.",
};

export default function AboutPage() {
  return (
    <article className="vv-card" style={{ maxWidth: 780, margin: "0 auto", padding: 22, lineHeight: 1.6 }}>
      <h1>🌟 Über VibeVibo</h1>

      <p>
        <strong>VibeVibo</strong> ist eine nostalgische Social-Plattform, die
        das Lebensgefühl der frühen 2000er-Jahre zurückbringt — die Zeit, als
        Online-Sein noch ein Erlebnis war: Tokio Hotel auf einem Klapphandy,
        ICQ-Uh-Oh, Top-8-Friends auf MySpace, *gruschelt* auf
        SchülerVZ, ★彡 Glitzer-Symbole in den Nicknames und Mixtapes für den
        Schwarm. Wir glauben: Social Media kann wieder Spaß machen.
      </p>

      <h2>Warum gibt es uns?</h2>
      <p>
        Heutige Social Networks sind Algorithmus-getrieben, voller Werbung
        ohne Ende, und das Gefühl von echter Community ist verloren gegangen.
        Bei VibeVibo dreht sich alles um das, was Jappy, SchülerVZ, MySpace
        und Lokalisten damals so liebenswert gemacht hat:
      </p>
      <ul>
        <li><strong>Profile mit Persönlichkeit</strong> — eigene Hintergrundfarben, Musik, Hobbys-Liste, persönlicher Status.</li>
        <li><strong>Pinnwand statt Algorithmus</strong> — was deine Freunde schreiben, siehst du in der Reihenfolge in der sie es geschrieben haben.</li>
        <li><strong>Gruscheln, Geschenke, Smileys</strong> — kleine Gesten die zeigen „ich denk an dich", ohne gleich tippen zu müssen.</li>
        <li><strong>Coms (Gruppen)</strong> — eigene Communities mit Owner, Officers, Forum, News, Custom-Theme.</li>
        <li><strong>Live-Streams</strong> — solo oder Multi-Couch mit bis zu 16 Hosts, mit Sprach-Chat, Reaktionen, Geschenken.</li>
      </ul>

      <h2>Was uns besonders macht</h2>

      <h3>🤖 Fidolin — der KI-Wächter</h3>
      <p>
        VibeVibo hat einen eigenen KI-Moderator namens <strong>Fidolin</strong>
        (basiert auf Google Gemini). Fidolin prüft Bilder, Texte und sogar
        Sprachnachrichten in Echtzeit auf Beleidigungen, Hass, Belästigung
        und sexuell explizite Inhalte. Bei Verstoß wird der Beitrag sofort
        blockiert, bei schweren Verstößen folgt eine automatische
        Kommunikationssperre. So bleibt VibeVibo ein freundlicher Ort.
      </p>

      <h3>🛡 Frauen-Schutz</h3>
      <p>
        Weibliche Accounts sind bei VibeVibo standardmäßig besonders
        geschützt: Nachrichten von Fremden werden strenger gefiltert
        (kein Anbaggern, keine Komplimente über Aussehen, keine Date-Anfragen
        von Fremden), Sprachnachrichten werden transkribiert und überprüft.
        Zusätzlich gibt es die freiwillige <strong>Stimm-Verifikation</strong>:
        Mit einer kurzen Sprachprobe bestätigst du dein angegebenes
        Geschlecht und bekommst dafür ein ✓-Verifiziert-Badge. Frauen können
        dann einstellen „nur verifizierte Accounts dürfen mir schreiben" —
        das verhindert, dass Männer sich als Frau ausgeben um Frauen anzuschreiben.
      </p>

      <h3>🎤 Sprachnachrichten als Highlight</h3>
      <p>
        Das große Plus bei VibeVibo: <strong>überall kannst du auch per
        Sprachnachricht antworten und kommentieren</strong> — in Direkt-Chats,
        Gruppen-Räumen, in Buschfunk-Kommentaren. Fidolin hört zu, transkribiert
        und sortiert Übergriffiges raus, bevor es bei der Empfängerin oder dem
        Empfänger ankommt.
      </p>

      <h3>✨ Vibes — die Plattform-Währung</h3>
      <p>
        VibeVibo nutzt eine virtuelle Währung namens „Vibes" (✨). Du
        verdienst sie durch tägliches Einloggen, Aktivitäten in der Community,
        Achievements oder optional durch Anschauen von Werbevideos. Mit Vibes
        kannst du Geschenke verschenken, Profile boosten, in deiner Com
        Funktionen freischalten und Premium-Features kaufen.
      </p>

      <h3>🔓 Com-Funktionen freischalten</h3>
      <p>
        Owner einer Com können besondere Funktionen mit Vibes freischalten:
        Animierte Themes (Schnee, Konfetti), Saisonal-Schmuck, Sound-FX beim
        Beitritt, Live-Polls, Throwback-Feed (alte Posts tauchen wieder auf),
        Geburtstags-Kalender, Quiz-Night, Meetup-Planer und vieles mehr. So
        kann jede Com eine eigene Persönlichkeit haben.
      </p>

      <h2>Für wen ist VibeVibo?</h2>
      <p>
        VibeVibo richtet sich an alle, die in den 2000er Jahren online aktiv
        waren und sich nach dieser Zeit zurücksehnen — aber auch an alle, die
        diese Ära nie erlebt haben und neugierig sind, wie sich „echte"
        Online-Community angefühlt hat, bevor TikTok-Algorithmen den
        Newsfeed übernahmen.
      </p>
      <p>
        Wir setzen ein Mindestalter von 14 Jahren voraus. Strenge Moderation
        und Anti-Belästigungs-Maßnahmen stehen für uns ganz oben.
      </p>

      <h2>Datenschutz und Sicherheit</h2>
      <p>
        Deine Daten gehören dir. Wir verkaufen keine Profile, keine Listen,
        keine Verhaltensdaten an Werbenetzwerke. Werbung läuft ausschließlich
        über Google AdSense und nur, wenn du im Cookie-Banner zugestimmt hast.
        Bei Server-Logs speichern wir IP-Adressen nur 30 Tage zur
        Missbrauchs-Erkennung. Account-Passwörter sind mit bcrypt gehasht und
        nicht entschlüsselbar.
      </p>
      <p>
        Mehr Details in unserer{" "}
        <a href="/datenschutz">Datenschutzerklärung</a>.
      </p>

      <h2>Mitmachen</h2>
      <p>
        VibeVibo wird kontinuierlich weiterentwickelt. Was zuletzt neu
        dazugekommen ist, siehst du auf der{" "}
        <a href="/neu">„Was ist neu?"-Seite</a>. Fragen, Anregungen,
        Bug-Reports? Schreib uns an{" "}
        <a href="mailto:ginoheidrich@outlook.com">ginoheidrich@outlook.com</a>.
      </p>

      <h2>Quick-Navigation</h2>
      <ul>
        <li><a href="/">Startseite</a></li>
        <li><a href="/faq">Häufige Fragen (FAQ)</a></li>
        <li><a href="/hilfe">Hilfe-Center</a></li>
        <li><a href="/neu">Was ist neu?</a></li>
        <li><a href="/datenschutz">Datenschutzerklärung</a></li>
        <li><a href="/impressum">Impressum</a></li>
      </ul>
    </article>
  );
}
