export const metadata = {
  title: "Hilfe-Center — VibeVibo",
  description: "Schnelleinstieg, Anleitungen und Tipps für VibeVibo. Profil einrichten, Coms gründen, Live gehen, Privatsphäre einstellen.",
};

export default function HilfePage() {
  return (
    <article className="vv-card" style={{ maxWidth: 780, margin: "0 auto", padding: 22, lineHeight: 1.6 }}>
      <h1>💡 Hilfe-Center</h1>
      <p>
        Hier findest du Schritt-für-Schritt-Anleitungen, Tipps und Tricks rund
        um VibeVibo. Für allgemeine Fragen schau in unsere{" "}
        <a href="/faq">FAQ</a>.
      </p>

      <h2>🚀 Erster Start</h2>
      <h3>Anmelden und Profil einrichten</h3>
      <ol>
        <li>Auf der Startseite klickst du auf <strong>„Mitmachen“</strong>.</li>
        <li>Wähle einen Username (eindeutig, wird in URLs verwendet) und einen Anzeigenamen (kann später geändert werden).</li>
        <li>Trage dein Geburtsdatum und Geschlecht ein — wichtig für den Frauen-Schutz und Altersfilter.</li>
        <li>Optional: lade ein Profilbild hoch. Fidolin prüft es automatisch (bei Auffälligkeiten wird es abgelehnt).</li>
        <li>Nach Login landest du auf der „Heute“-Seite mit deiner persönlichen Übersicht.</li>
      </ol>

      <h3>Profil personalisieren</h3>
      <ul>
        <li><strong>Hintergrund-Skin</strong>: Im Profil unter „Skin bearbeiten“ wählst du eine eigene Farb- oder Foto-Atmosphäre.</li>
        <li><strong>Begrüßungstext</strong>: Direkt am Profil klicken und bearbeiten — wird sichtbar wenn Freunde dich besuchen.</li>
        <li><strong>Profil-Musik</strong>: Lade eine MP3 hoch oder verlinke eine YouTube-URL. Spielt beim Besuch automatisch.</li>
        <li><strong>Hobbys, Beruf, Familienstand</strong>: Alles optional im Profil unter „Bearbeiten“.</li>
      </ul>

      <h2>👥 Freunde finden</h2>
      <p>
        Klick auf <strong>„Mitglieder“</strong> in der Bottom-Nav. Filtere
        nach Geschlecht, Alter, Online-Status oder Standort. Auf jedem Profil
        kannst du:
      </p>
      <ul>
        <li><strong>Gruscheln</strong> — kleine Anstoß-Geste ohne Worte (klassisch SchülerVZ).</li>
        <li><strong>Nachricht schreiben</strong> — Direkt-Chat starten.</li>
        <li><strong>Top-Friend hinzufügen</strong> — bis zu 8 Lieblings-Personen erscheinen prominent auf deinem Profil.</li>
        <li><strong>Geschenk schicken</strong> — kostet Vibes, bleibt aber dauerhaft am Empfänger-Profil.</li>
      </ul>

      <h2>🏘 Coms (Gruppen)</h2>
      <h3>Einer Com beitreten</h3>
      <p>
        Unter <a href="/coms">/coms</a> findest du alle offenen Communities.
        Filter nach Kategorie (Musik, Sport, Gaming, Kunst, Lokal, …),
        Trending, Größte oder Neueste. Klick auf eine Com → „Beitreten“.
        Manche Coms sind privat — dann brauchst du eine Einladung.
      </p>

      <h3>Eine eigene Com gründen</h3>
      <ol>
        <li>Auf <a href="/coms">/coms</a> oben rechts „+ Com gründen“.</li>
        <li>Kostet einmalig <strong>500 ✨</strong> — dafür gehört sie dir komplett.</li>
        <li>Wähle einen Namen, Slug (URL), Cover-Emoji, Motto und Theme-Farbe.</li>
        <li>Als Owner kannst du Officers ernennen (Moderatoren mit 8 einzelnen Rechten), das Forum verwalten, News posten und besondere Funktionen freischalten.</li>
      </ol>

      <h3>Funktionen freischalten</h3>
      <p>
        Im 🔓-Tab deiner Com kannst du als Owner besondere Features mit Vibes
        kaufen. Aktuell verfügbar:
      </p>
      <ul>
        <li>❄ <strong>Animated Theme</strong> (500 ✨) — Schnee, Konfetti, Herbstlaub, Herzen oder Sterne im Hintergrund.</li>
        <li>🎨 <strong>Saisonal Hero-Schmuck</strong> (700 ✨) — Cover-Banner mit saisonalem Rahmen.</li>
        <li>🔊 <strong>Sound-FX</strong> (300 ✨) — kurzer Sound beim Beitritt.</li>
        <li>📊 <strong>Live-Polls</strong> (400 ✨) — Umfragen mit Live-Balken.</li>
        <li>📼 <strong>Throwback-Feed</strong> (600 ✨) — alte Posts tauchen wieder auf.</li>
        <li>🎂 <strong>Geburtstags-Kalender</strong> (400 ✨) — wer hat in den nächsten 7 Tagen Geburtstag?</li>
        <li>🧠 <strong>Quiz-Night</strong> (1000 ✨, ab 5 Members) — Multiple-Choice-Quizze mit Leaderboard.</li>
        <li>🤝 <strong>Meetup-Planer</strong> (600 ✨, ab 8 Members) — echte Treffen mit RSVPs.</li>
      </ul>

      <h2>🎥 Live-Streams</h2>
      <h3>Selbst streamen</h3>
      <ol>
        <li>Klick auf den 🎥-Button in der Navigation.</li>
        <li>Wähle <strong>Solo</strong> oder <strong>Multi-Couch</strong> (bis zu 16 Hosts).</li>
        <li>Erlaube Kamera und Mikrofon im Browser-Dialog.</li>
        <li>Optional: Titel setzen, Audio-only-Modus für Mehr-Hosts-Setups (spart Bandbreite).</li>
        <li>Während des Streams: Mute, Cam-Toggle, Cohost einladen, Reaktionen sehen.</li>
      </ol>
      <p>
        <strong>Wichtig:</strong> Bitte halte dich an die Community-Regeln.
        Nacktheit, Drogenkonsum und Hassrede führen zu sofortigem Stream-Abbruch
        und Strike. Fidolin überwacht Streams stichprobenartig.
      </p>

      <h3>Live zugucken</h3>
      <p>
        Aktive Streams findest du unter „Live“ in der Bottom-Nav. Beim
        Beitritt fragt der Browser nach Mikrofon (für Voice-Chat) — du kannst
        auch lautlos zuschauen. Reaktionen sendest du per Emoji-Knöpfe,
        Geschenke kosten Vibes.
      </p>

      <h2>🛡 Privatsphäre einstellen</h2>
      <p>
        Im Profil unter <strong>„Privatsphäre“</strong> kannst du fein granular
        einstellen, wer dich kontaktieren darf:
      </p>
      <ul>
        <li><strong>Maximaler Schutz</strong> — 1-Klick-Bundle: Nachrichten nur von Freunden, Pinnwand nur von Freunden, Besuche werden nicht protokolliert.</li>
        <li><strong>DM-Policy</strong> — Wer darf dir schreiben? Jeder / nur Freunde / nur Verifizierte / niemand.</li>
        <li><strong>Wall-Policy</strong> — Wer darf auf deine Pinnwand?</li>
        <li><strong>Ruhezeit</strong> — Stundengenaue Zeitfenster in denen Fremde keine Nachrichten schicken können.</li>
        <li><strong>Strict-First-Msg</strong> — Erste Nachricht von Fremden wird besonders streng von Fidolin geprüft.</li>
        <li><strong>Frauen-Schutz</strong> — Nur stimm-verifizierte Accounts dürfen schreiben + Strict-Modus für Live-Streams.</li>
      </ul>

      <h3>Stimm-Verifikation</h3>
      <p>
        Unter <a href="/profile/verify">/profile/verify</a> kannst du eine
        5-15-Sekunden-Sprachprobe abgeben. Gemini-KI prüft, ob deine Stimme
        zum angegebenen Geschlecht passt, und vergibt bei Erfolg das
        ✓-Verifiziert-Badge. Andere User können dann „nur verifizierte
        dürfen mir schreiben" aktivieren.
      </p>

      <h2>✨ Vibes</h2>
      <h3>Vibes verdienen</h3>
      <ul>
        <li><strong>Daily-Bonus</strong>: Einmal pro Tag einloggen — kleine Vibes plus Streak-Bonus.</li>
        <li><strong>Achievements</strong>: 25 Auszeichnungen in 6 Kategorien, jede gibt Vibes.</li>
        <li><strong>Aktivität</strong>: Posten, Kommentieren, Geschenke senden bringt kleine Bonus-Vibes.</li>
        <li><strong>Rewarded Ads</strong> (optional, nur mit Werbe-Consent): Video gucken für Vibes.</li>
        <li><strong>Kauf</strong>: Vibes-Pakete im Shop für echtes Geld.</li>
      </ul>

      <h3>Vibes ausgeben</h3>
      <ul>
        <li>Geschenke an Freunde verschenken</li>
        <li>Profil-Status boosten (mehr Sichtbarkeit)</li>
        <li>Com gründen oder Funktionen freischalten</li>
        <li>Premium-Pass aktivieren (keine Werbung, exklusive Badges)</li>
      </ul>

      <h2>📧 Probleme melden</h2>
      <p>
        Falls etwas nicht funktioniert oder du dich belästigt fühlst:
      </p>
      <ul>
        <li><strong>Beleidigung/Spam in einem Beitrag</strong>: Klick neben dem Beitrag auf „⋯ → Melden“. Wir reagieren in der Regel innerhalb von 24 Stunden.</li>
        <li><strong>Belästigung per DM</strong>: Im Messenger neben dem Namen auf „⋯ → Blockieren“ oder „Stummschalten“. Bei akuten Drohungen: melde es bitte direkt per E-Mail.</li>
        <li><strong>Hacking-Verdacht</strong>: Sofort Passwort ändern und an <a href="mailto:ginoheidrich@outlook.com">ginoheidrich@outlook.com</a> melden.</li>
        <li><strong>Bug / Feature-Wunsch</strong>: Auch per E-Mail — beschreib was passiert ist und im Idealfall einen Screenshot.</li>
      </ul>

      <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid rgba(0,0,0,0.1)" }} />
      <p>
        Weitere Themen: <a href="/about">Über VibeVibo</a> · <a href="/faq">FAQ</a> ·{" "}
        <a href="/neu">Neuigkeiten</a> · <a href="/datenschutz">Datenschutz</a> ·{" "}
        <a href="/impressum">Impressum</a>
      </p>
    </article>
  );
}
