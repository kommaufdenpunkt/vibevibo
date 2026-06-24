export const metadata = {
  title: "Allgemeine Geschäftsbedingungen — VibeVibo",
  description: "AGB von VibeVibo: Mindestalter 18+, Bild-Authentizität & Moderation, Nutzungsregeln, Krisen-/Suizidprävention, Moderation, Vibes, Werbung, Haftung, 24h-Lösch-Gnadenfrist.",
};

export default function AgbPage() {
  return (
    <article className="vv-card" style={{ maxWidth: 820, margin: "0 auto", padding: 22, lineHeight: 1.6 }}>
      <h1>📜 Allgemeine Geschäftsbedingungen (AGB)</h1>
      <p className="vv-muted" style={{ fontSize: 12 }}>
        Stand: 24. Juni 2026 — Aktualisierungen: § 5 (Bild-Authentizität, Bild-Akte
        & Mod-Prozess), § 13a (Krisen-/Suizidprävention), § 16 (24-Stunden-Gnadenfrist
        bei Konto-Löschung).
      </p>

      <h2>§ 1 Geltungsbereich und Anbieter</h2>
      <p>
        Diese Allgemeinen Geschäftsbedingungen („AGB") regeln das Nutzungsverhältnis
        zwischen dem Betreiber von <strong>VibeVibo</strong> und den registrierten
        Nutzern. Sie gelten für die gesamte Nutzung der Plattform, einschließlich
        aller Funktionen, Subdomains (z.B. <code>mcp.vibevibo.de</code>, <code>admin.vibevibo.de</code>)
        und damit verbundener Services.
      </p>
      <p>
        <strong>Anbieter:</strong><br/>
        4ever1.tv<br/>
        c/o IP-Management #9293<br/>
        Ludwig-Erhard-Straße 18<br/>
        20459 Hamburg<br/>
        E-Mail: <a href="mailto:ginoheidrich@outlook.com">ginoheidrich@outlook.com</a>
      </p>
      <p>
        Mit der Registrierung erklärst du dich mit diesen AGB einverstanden. Wenn du
        die AGB nicht akzeptierst, ist eine Nutzung von VibeVibo nicht erlaubt.
      </p>

      <h2>§ 2 Mindestalter — strikt 18 Jahre</h2>
      <p>
        <strong>VibeVibo ist eine Erwachsenen-Community.</strong> Die Registrierung
        ist erst ab vollendetem 18. Lebensjahr erlaubt. Dies wird bei der
        Registrierung über das Geburtsdatum geprüft.
      </p>
      <ul>
        <li>Bei begründeten Zweifeln am Alter kann der Anbieter einen Altersnachweis (Personalausweis-Foto, geschwärzt soweit möglich) verlangen.</li>
        <li>Bei falschen Altersangaben behält sich der Anbieter das Recht vor, den Account permanent zu sperren ohne weitere Vorwarnung.</li>
        <li>Bestehende Accounts unter 18 Jahren werden mit Inkrafttreten dieser AGB bestandsgeschützt, neue Registrierungen sind nur ab 18 möglich.</li>
      </ul>

      <h2>§ 3 Registrierung und Account</h2>
      <h3>3.1 Pflichtangaben</h3>
      <p>Bei der Registrierung sind folgende Angaben wahrheitsgemäß zu machen:</p>
      <ul>
        <li>Username (Pseudonym, einmalig vergeben)</li>
        <li>Anzeigename</li>
        <li>Geburtsdatum (siehe § 2)</li>
        <li>Geschlecht (für Frauen-Schutz und Altersfilter — siehe § 8)</li>
        <li>Sicheres Passwort (wird via bcrypt gehasht, ist nicht entschlüsselbar)</li>
      </ul>
      <p>Optional, aber empfohlen: Profilbild (siehe § 5).</p>

      <h3>3.2 Ein Account pro Person</h3>
      <p>
        Jede Person darf nur EINEN Account auf VibeVibo führen. Mehrfach-Accounts,
        Fake-Accounts, Test-Accounts oder Accounts zur Täuschung anderer Nutzer sind
        ausdrücklich untersagt. Der Anbieter behält sich vor, alle nachweislich von
        derselben Person geführten Accounts zu sperren.
      </p>

      <h3>3.3 Account-Sicherheit</h3>
      <p>
        Du bist verpflichtet, dein Passwort geheim zu halten. Die Weitergabe an Dritte
        ist untersagt. Die Übertragung, der Kauf oder Verkauf von Accounts ist
        verboten — Accounts sind nicht übertragbar.
      </p>

      <h3>3.4 Kostenfreiheit der Grundnutzung</h3>
      <p>
        Die Grundnutzung von VibeVibo ist kostenfrei. Die Plattform finanziert sich
        durch Werbung (Google AdSense — siehe § 11) und optionale Käufe von Vibes
        oder Premium-Pässen (siehe § 10).
      </p>

      <h2>§ 4 Verhaltensregeln</h2>
      <p>
        Du verpflichtest dich, die Plattform respektvoll und im Rahmen der geltenden
        Gesetze zu nutzen. Folgende Inhalte und Verhaltensweisen sind ausdrücklich
        verboten:
      </p>

      <h3>4.1 Verbotene Inhalte</h3>
      <ul>
        <li><strong>Beleidigung, Hass, Diskriminierung</strong> jeder Art</li>
        <li><strong>Bedrohung, Mobbing, Stalking, Cybermobbing</strong></li>
        <li><strong>Sexuell explizite Inhalte</strong> jeder Art — Nacktheit, sexuelle Handlungen, anzügliche Posen</li>
        <li><strong>Drogen und Drogenkonsum</strong> in Bild, Video oder Text (auch Anspielungen)</li>
        <li><strong>Gewalt, Waffen, Selbstverletzung</strong> in glorifizierender Form</li>
        <li><strong>Extremistische Inhalte</strong> jeder politischen Richtung</li>
        <li><strong>Volksverhetzung, Holocaust-Verharmlosung, Hakenkreuze</strong></li>
        <li><strong>Illegale Inhalte</strong> nach deutschem Recht</li>
        <li><strong>Phishing, Malware, Hacking-Tools</strong></li>
        <li><strong>Spam, Massen-Nachrichten, Werbung in DMs</strong></li>
        <li><strong>Personenbezogene Daten Dritter</strong> ohne deren Einwilligung</li>
      </ul>

      <h3>4.2 Frauen-Schutz</h3>
      <p>
        VibeVibo hat besondere Schutz-Funktionen für weibliche Accounts. Mit der
        Nutzung erklärst du dich einverstanden, dass:
      </p>
      <ul>
        <li>Anmach-Nachrichten („Hey Süße", Komplimente über Aussehen, Date-Anfragen von Fremden) automatisch durch die KI gefiltert werden.</li>
        <li>Sprachnachrichten transkribiert und analysiert werden, auch hinsichtlich der Stimmlage zur Plausibilitätsprüfung (Anti-Fake-Frauen-Schutz).</li>
        <li>Bei wiederholten Belästigungs-Verstößen automatische Sanktionen erfolgen.</li>
      </ul>

      <h3>4.3 Stimm-Verifikation</h3>
      <p>
        Du kannst freiwillig eine Sprachprobe abgeben, um dein angegebenes Geschlecht
        zu bestätigen. Bei Übereinstimmung erhältst du das ✓-Verifiziert-Badge.
        Die Sprachprobe wird zur einmaligen Prüfung an Google Gemini übermittelt und
        nicht zu Trainingszwecken gespeichert.
      </p>

      <h2>§ 5 Bilder, Bild-Authentizität & Bild-Moderation</h2>
      <p>
        Dieser Paragraph regelt verbindlich, welche Bilder du auf VibeVibo hochladen
        darfst (Profilbild, Buschfunk-Bilder, Feed-Bilder, Kommentar-Bilder,
        Fotoalben), wie Bilder geprüft werden und welche Konsequenzen bei Verstößen
        gelten.
      </p>

      <h3>5.1 Grundsatz: Authentizität</h3>
      <p>
        VibeVibo ist eine Community echter Menschen. Damit Vertrauen und Frauen-Schutz
        (§ 4.2) funktionieren, gilt für <strong>alle Bilder, auf denen eine Person
        zu sehen ist</strong>:
      </p>
      <ul>
        <li><strong>Es muss sich um dich selbst handeln.</strong> Auf Profilbildern und Bildern, die dich repräsentieren, muss die abgebildete Person eindeutig du sein.</li>
        <li><strong>Das Bild muss aktuell sein.</strong> Es darf nicht älter als rund 2 Jahre sein oder dein heutiges Aussehen so stark verfälschen, dass du nicht mehr erkennbar bist.</li>
        <li><strong>Das Bild muss von dir selbst stammen</strong> — also tatsächlich von dir aufgenommen worden oder im Auftrag für dich entstanden sein. Du bestätigst mit dem Upload, dass du alle erforderlichen Rechte (Urheber-, Persönlichkeits-, Nutzungsrechte) besitzt.</li>
      </ul>

      <h3>5.2 Was ist erlaubt</h3>
      <ul>
        <li>Selbst aufgenommene, aktuelle Fotos von dir selbst.</li>
        <li>Bilder, auf denen du klar im Vordergrund stehst (auch in Alltagssituationen).</li>
        <li>Stimmungsbilder ohne Personen (Natur, Tiere, Essen, Reisefotos) für Buschfunk, Feed und Fotoalben.</li>
        <li>Bilder mit anderen Personen, sofern du <strong>deren ausdrückliche Einwilligung</strong> zur Veröffentlichung hast.</li>
      </ul>

      <h3>5.3 Was ist verboten</h3>
      <ul>
        <li><strong>Stock-Fotos, Kataloge, Werbeaufnahmen</strong> oder andere fremde Fotografien aus Suchmaschinen, sozialen Netzwerken oder Bildagenturen.</li>
        <li><strong>KI-generierte Bilder</strong> oder synthetische Aufnahmen, die eine reale Person darstellen sollen (Deepfakes, „AI-Models", Avatar-Fotos).</li>
        <li><strong>Stark bearbeitete Bilder</strong>, die dich unkenntlich machen (massive Filter, Face-Swap, Beauty-Filter so stark, dass dein Aussehen verfälscht ist).</li>
        <li><strong>Bilder anderer realer Personen</strong>, die du als dich selbst ausgibst (Identitätsfälschung).</li>
        <li><strong>Cartoons, Avatare, Comicfiguren, Tiere</strong> als Profilbild (Stimmungsbilder im Feed bleiben davon erlaubt).</li>
        <li><strong>Nacktheit, sexuell anzügliche Posen, Unterwäsche-Fotos</strong> in einer Form, die in den öffentlichen Bereichen der Plattform unangemessen ist.</li>
        <li><strong>Drogen und Drogenkonsum</strong> in Bild oder Hintergrund (Joints, Bongs, Pillen, Spritzen, harte Drogen — auch Anspielungen wie Cannabis-Blätter als Symbol).</li>
        <li><strong>Waffen, Gewalt, Selbstverletzung</strong> in glorifizierender oder bedrohlicher Form.</li>
        <li><strong>Politische, extremistische oder verbotene Symbole</strong> (Hakenkreuze, SS-Runen, IS-Flaggen, Reichsadler etc.).</li>
        <li><strong>Bilder, die offensichtlich nicht zum Mindestalter passen</strong> (eine Person, die deutlich jünger als 18 wirkt, kombiniert mit einem Konto, das 18+ angibt).</li>
        <li><strong>Bilder mit personenbezogenen Daten Dritter</strong> (Klarname, Adresse, Telefonnummer auf einem Schild im Hintergrund) ohne deren Einwilligung.</li>
      </ul>

      <h3>5.4 Wie Bilder geprüft werden</h3>
      <p>
        Jedes auf VibeVibo hochgeladene Bild durchläuft ein mehrstufiges
        Moderationsverfahren:
      </p>
      <ol>
        <li>
          <strong>Automatische Vorprüfung (KI „Fidolin", Google Gemini).</strong>
          Klare Verstöße (z.B. Nacktheit, Drogen, Gewalt) werden direkt abgelehnt
          und gar nicht erst in der Plattform sichtbar.
        </li>
        <li>
          <strong>Menschliche Mod-Prüfung.</strong> Alle übrigen Bilder landen in
          einer Moderations-Warteschlange („Bildertool") und werden von geschultem
          Mod-Personal (siehe § 13) einzeln gesichtet — bei Bedarf mit Vergleich
          gegen frühere Bilder desselben Nutzers und gegen die Bild-Akte (§ 5.5).
        </li>
        <li>
          <strong>Entscheidung.</strong> Das Bild wird entweder freigeschaltet
          (Approve) oder mit einer der vorgesehenen Begründungen abgelehnt (Reject)
          — z.B. <em>Zu freizügig</em>, <em>Person nicht erkennbar</em>,
          <em> Stockfoto/AI-generiert</em>, <em>Wirkt minderjährig</em>,
          <em> Identitätsfälschung</em>, <em>Anstößiger Inhalt</em>, <em>Drogen</em>,
          oder eine individuell formulierte Begründung („Sonstiger Grund").
        </li>
      </ol>
      <p>
        Auf eine Freischaltung besteht <strong>kein Anspruch</strong>. Der Anbieter
        behält sich vor, einzelne Bilder oder ganze Bild-Kategorien (z.B. Fotoalben)
        nach freiem Ermessen abzulehnen, wenn dies aus Sicherheits-, Jugendschutz-
        oder Vertrauensgründen geboten erscheint.
      </p>

      <h3>5.5 Bild-Akte: Verstoß-Historie pro User</h3>
      <p>
        Für jeden Nutzer wird eine plattform-interne <strong>Bild-Akte</strong>
        geführt. Dort wird festgehalten:
      </p>
      <ul>
        <li>welche Bilder freigeschaltet wurden,</li>
        <li>welche Bilder mit welcher Begründung abgelehnt wurden,</li>
        <li>ob die Ablehnung durch die KI „Fidolin" automatisch erfolgte oder durch einen Menschen,</li>
        <li>wann und durch welchen Mod die Entscheidung getroffen wurde (für interne Audit-Zwecke und Einsprüche).</li>
      </ul>
      <p>
        Diese Akte dient ausschließlich der Qualitätssicherung, der konsistenten
        Bewertung wiederkehrender Uploads und der Eskalation bei wiederholten
        Verstößen. Sie ist nur für berechtigtes Mod- und Admin-Personal einsehbar
        und unterliegt zusätzlich einem Audit-Trail (Mods müssen eine begründete
        Anfrage stellen, um eine Userakte einzusehen).
      </p>
      <p>
        Bei einer endgültigen Konto-Löschung nach § 16 wird die Bild-Akte
        anonymisiert (Bezug zur Person entfernt), bleibt aber als statistische
        Lerngrundlage für die Moderation und ggf. als Beweismittel für laufende
        Verfahren erhalten — analog zu § 16.3.
      </p>

      <h3>5.6 Konsequenzen bei Ablehnung</h3>
      <p>
        Wird ein Bild abgelehnt, geschieht Folgendes:
      </p>
      <ul>
        <li>
          Das Bild wird <strong>sofort entfernt</strong> und nicht in der Plattform
          ausgespielt.
        </li>
        <li>
          Du erhältst eine <strong>orange System-Nachricht vom „vibeviboteam"</strong>
          im normalen Postfach. Diese Nachricht erklärt knapp, warum das Bild
          abgelehnt wurde, und muss aktiv mit <em>„Gelesen und verstanden"</em>
          bestätigt werden. Erst danach ist sie aus dem Postfach verschwunden.
        </li>
        <li>
          Der Vorfall wird in deiner Bild-Akte (§ 5.5) vermerkt.
        </li>
      </ul>

      <h3>5.7 Eskalation bei wiederholten Verstößen</h3>
      <p>
        Bild-Verstöße werden im Rahmen des allgemeinen Strike-Systems (§ 13.2)
        eskaliert. Pro 90-Tage-Zeitraum gilt:
      </p>
      <ul>
        <li><strong>1.–2. Bild-Verstoß:</strong> Verwarnung per oranger System-DM, Akteneintrag.</li>
        <li><strong>3. Bild-Verstoß:</strong> Temporäre Sperrung des Bild-Uploads für 7 Tage.</li>
        <li><strong>4. Bild-Verstoß:</strong> Sperrung des Bild-Uploads für 30 Tage + manuelle Überprüfung deines Profils.</li>
        <li><strong>5. Bild-Verstoß oder vorsätzliche Identitätsfälschung:</strong> Permanenter Bann gemäß § 13.2.</li>
      </ul>
      <p>
        Schwere Einzelverstöße (z.B. Versuch des Uploads von Material, das auf
        Minderjährige hindeutet, oder Identitätsdiebstahl mit Fotos einer realen
        Drittperson) führen <strong>ohne Vorwarnung zum dauerhaften Bann</strong>
        und können — bei Strafrechtsrelevanz — eine Anzeige nach sich ziehen.
      </p>

      <h3>5.8 Einspruchsrecht</h3>
      <p>
        Hältst du eine Bild-Ablehnung für falsch, kannst du Einspruch einlegen —
        per ❓-Hilfebutton oder direkt per E-Mail an
        <a href="mailto:ginoheidrich@outlook.com"> ginoheidrich@outlook.com</a>
        mit kurzem Hinweis, um welches Bild es geht. Dein Fall wird dann durch eine
        zweite, unabhängige Person erneut geprüft. Das Ergebnis erhältst du wieder
        als System-Nachricht.
      </p>

      <h2>§ 6 Sprachnachrichten und Voice-Chat</h2>
      <p>
        Sprachnachrichten in Direktchats, Gruppen-Räumen und Buschfunk-Kommentaren
        werden von Fidolin transkribiert und auf Verstöße geprüft. Bei Beleidigungen,
        Hass oder anderen Verstößen werden Nachrichten blockiert und ggf. Sanktionen
        ausgesprochen.
      </p>
      <p>
        Maximale Länge: 60 Sekunden pro Sprachnachricht. Audio-Daten werden zur
        Prüfung an Google übertragen und nach Bewertung verworfen.
      </p>

      <h2>§ 7 Live-Streams</h2>
      <p>
        Live-Streams unterliegen den gleichen Verhaltensregeln wie sonstige Inhalte.
        Insbesondere verboten sind:
      </p>
      <ul>
        <li>Nacktheit jeder Art</li>
        <li>Drogenkonsum (Cannabis, Alkohol-Exzesse, harte Drogen)</li>
        <li>Hassrede, Hetze, politische Propaganda</li>
        <li>Gewaltdarstellungen, Bedrohungen</li>
        <li>Übertragung urheberrechtlich geschützter Inhalte ohne Erlaubnis (Filme, Musik)</li>
      </ul>
      <p>
        Live-Streams können von Zuschauern per ⚡-Meldebutton gemeldet werden. Bei
        Meldung wird ein Clip der vorhergehenden und nachfolgenden Minuten als
        Beweismittel zur Mod-Prüfung archiviert.
      </p>
      <p>
        Bei Verstoß wird der Stream sofort beendet, der Streamer erhält einen Strike
        (siehe § 13).
      </p>

      <h2>§ 8 Coms (Communities/Gruppen)</h2>
      <p>
        Jede Com hat einen <strong>Owner</strong>, der für die Einhaltung der AGB in
        seiner Com mitverantwortlich ist. Der Owner kann <strong>Officers</strong>
        ernennen, die mit 8 einzelnen Rechten ausgestattet werden können (Mitglieder
        verwalten, Posts löschen, Forum moderieren, etc.).
      </p>
      <p>
        Der Anbieter behält sich vor, Coms bei wiederholten Regelverstößen zu
        sperren oder zu löschen. Coms mit gewerblichen Inhalten sind grundsätzlich
        erlaubt, solange sie nicht gegen die AGB verstoßen — kommerzielle Profile
        sind hingegen untersagt.
      </p>

      <h2>§ 9 Werbung in DMs verboten</h2>
      <p>
        Direktnachrichten dürfen ausschließlich zu privaten Kommunikationszwecken
        genutzt werden. Werbung jeder Art, Massenversand, Spam, Kettenbriefe und
        unaufgeforderte gewerbliche Kontaktaufnahme sind strikt verboten.
      </p>

      <h2>§ 10 Vibes (virtuelle Währung)</h2>
      <p>
        VibeVibo nutzt eine plattform-interne virtuelle Währung namens „Vibes" (✨).
        Folgende Regeln gelten:
      </p>
      <ul>
        <li>Vibes haben keinen real-monetären Gegenwert und können nicht in echtes Geld umgetauscht werden.</li>
        <li>Vibes können verdient werden (Daily-Bonus, Achievements, Aktivität, optional Werbevideos) oder gekauft werden (Pakete via Stripe).</li>
        <li>Gekaufte Vibes verfallen bei Kontolöschung — kein Rückerstattungsanspruch.</li>
        <li>Es besteht kein Anspruch auf eine bestimmte Anzahl Vibes, einen bestimmten Wechselkurs oder die dauerhafte Verfügbarkeit der Vibes-Funktion.</li>
        <li>Der Verkauf, Tausch oder Erwerb von Vibes außerhalb von VibeVibo (z.B. auf Drittplattformen) ist untersagt.</li>
      </ul>

      <h2>§ 11 Werbung (Google AdSense)</h2>
      <p>
        VibeVibo finanziert sich auch durch Werbung über Google AdSense. Werbung wird
        nur eingeblendet, wenn du im Cookie-Banner zugestimmt hast. Du hast drei
        Optionen:
      </p>
      <ul>
        <li>„Nur essenziell" — keine Werbung, keine personalisierten Cookies</li>
        <li>„Generische Werbung" — Werbung ohne Personalisierung</li>
        <li>„Personalisierte Werbung" — Werbung wird auf dich zugeschnitten</li>
      </ul>
      <p>
        Premium-Mitglieder sehen keine Werbung. In sensiblen Bereichen (Messenger,
        Vibo-Pet, Profil-Editor, Privatsphäre-Einstellungen) wird grundsätzlich keine
        Werbung angezeigt.
      </p>

      <h2>§ 12 Premium-Pass</h2>
      <p>
        Optional kannst du einen Premium-Pass per Stripe erwerben. Premium-Pass
        bietet:
      </p>
      <ul>
        <li>Keine Werbung</li>
        <li>Exklusive Premium-Badges</li>
        <li>Erweiterte Profil-Features</li>
        <li>Prioritäts-Support</li>
      </ul>
      <p>
        Premium-Käufe sind nicht erstattungsfähig, sofern nicht gesetzlich anders
        vorgeschrieben (z.B. EU-Widerrufsrecht innerhalb 14 Tagen — Erlöschen mit
        ausdrücklicher Zustimmung zur sofortigen Vertragserfüllung).
      </p>

      <h2>§ 13 Moderation und Sanktionen</h2>
      <h3>13.1 Mehrstufige Moderation</h3>
      <p>VibeVibo nutzt ein mehrstufiges Moderationssystem:</p>
      <ol>
        <li><strong>KI-Moderation („Fidolin")</strong> — Echtzeit-Prüfung von Texten, Bildern und Sprachnachrichten</li>
        <li><strong>User-Meldungen</strong> — per ⚡-Meldebutton auf jedem Inhalt</li>
        <li><strong>Moderatoren-Team</strong> — geschultes ehrenamtliches Team von „VibeVibo-Team"</li>
        <li><strong>Teamleitungen</strong> — überwachen die Moderatoren-Arbeit</li>
        <li><strong>Admin</strong> — letztinstanzliche Entscheidungen</li>
      </ol>

      <h3>13.2 Sanktions-Stufen (Strikes)</h3>
      <p>Bei Verstößen erfolgt eine stufenweise Eskalation pro 90-Tage-Zeitraum:</p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 8 }}>
        <thead>
          <tr style={{ background: "var(--vv-surface, #f5f5f7)" }}>
            <th style={tdStyle}>Strike-Nummer</th>
            <th style={tdStyle}>Sanktion</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>1. Strike</td><td style={tdStyle}>Verwarnung</td></tr>
          <tr><td style={tdStyle}>2. Strike</td><td style={tdStyle}>Mute 1 Stunde</td></tr>
          <tr><td style={tdStyle}>3. Strike</td><td style={tdStyle}>Mute 24 Stunden</td></tr>
          <tr><td style={tdStyle}>4. Strike</td><td style={tdStyle}>Sperre 7 Tage</td></tr>
          <tr><td style={tdStyle}>5. Strike</td><td style={tdStyle}>Permanenter Bann</td></tr>
        </tbody>
      </table>
      <p>
        Bei schweren Verstößen (Kinderpornografie, Hass, Drohungen, Drogen-Verkauf,
        Hacking-Versuche) kann ohne Vorwarnung der permanente Bann ausgesprochen
        werden.
      </p>

      <h3>13.3 Einspruchsrecht</h3>
      <p>
        Du hast das Recht, gegen eine Sanktion Einspruch einzulegen. Schreibe an
        <a href="mailto:ginoheidrich@outlook.com"> ginoheidrich@outlook.com</a> oder
        nutze den ❓-Hilfebutton.
      </p>

      <h2>§ 13a Schutz vulnerabler Nutzer (Krisen- und Suizidprävention)</h2>
      <p>
        VibeVibo nimmt den Schutz von Nutzern in psychischen Ausnahmesituationen
        sehr ernst. Dieser Paragraph regelt verbindlich, wie der Anbieter mit
        Anhaltspunkten auf Selbst- oder Fremdgefährdung umgeht.
      </p>

      <h3>13a.1 Automatische Erkennung</h3>
      <p>
        Der Anbieter setzt automatisierte Verfahren ein, um in öffentlichen Posts,
        Kommentaren, Pinnwand-Einträgen, Profil-Texten und Direktnachrichten
        Krisensignale (z.B. Hinweise auf Suizidabsichten, Selbstverletzung,
        unmittelbar bevorstehende Gewalt gegen sich oder Dritte) zu erkennen. Bei
        Treffern erfolgen — gestaffelt nach Schweregrad — folgende Maßnahmen:
      </p>
      <ul>
        <li>Einblendung eines <strong>Hilfe-Banners</strong> mit Notruf- und
          Beratungsangeboten (u.a. Telefonseelsorge 0800-111-0-111, krisenchat.de,
          Nummer gegen Kummer 116-111, Notruf 112).</li>
        <li>Information der Moderation („🆘 Kritisches Signal von @user") zur
          schnellen menschlichen Sichtung.</li>
        <li>Bei konkreten, ortsbezogenen oder zeitnahen Hinweisen auf eine
          unmittelbare Lebensgefahr: Übermittlung der relevanten Inhalte und
          Personalien an die zuständige Polizeibehörde gemäß § 14 Abs. 2 BDSG
          i.V.m. Art. 6 Abs. 1 lit. d DSGVO (Schutz lebenswichtiger Interessen).</li>
      </ul>
      <p>
        Diese Maßnahmen verfolgen ausschließlich den Schutz von Leib und Leben.
        Sie ersetzen keine professionelle medizinische oder psychotherapeutische
        Hilfe.
      </p>

      <h3>13a.2 SOS-Knopf</h3>
      <p>
        Auf jedem Profil findest du einen 💛-Knopf („Sorgst du dich um diesen
        User?"). Damit kannst du die Moderation auf einen Mitnutzer aufmerksam
        machen, um den du dir Sorgen machst. Der betroffene Nutzer erhält daraufhin
        ein Hilfe-Angebot, ohne zu erfahren, wer den Knopf gedrückt hat.
      </p>

      <h3>13a.3 Anstiftung und Beihilfe — Null-Toleranz</h3>
      <p>
        Wer andere Nutzer zur Selbsttötung, Selbstverletzung oder zu Straftaten
        gegen Dritte anstiftet, ermutigt, anleitet oder dabei Beihilfe leistet,
        wird <strong>ohne Vorwarnung dauerhaft gesperrt</strong>. Der Anbieter
        behält sich vor:
      </p>
      <ul>
        <li>die zugehörigen Daten <strong>bis zu 10 Jahre</strong> für
          strafrechtliche Ermittlungen aufzubewahren (Rechtsgrundlage: Art. 6
          Abs. 1 lit. c und f DSGVO i.V.m. § 257 HGB analog für Beweissicherung),</li>
        <li><strong>Strafanzeige zu erstatten</strong>, insbesondere wegen §§ 211
          (Mord), 212 (Totschlag), 217 (Geschäftsmäßige Förderung der Selbsttötung),
          222 (fahrlässige Tötung), 238 (Nachstellung/Stalking) StGB,</li>
        <li>vollständige Forensik-Datensätze (Personalien, Kontaktdaten,
          IP-Adressen, Geräte-Kennungen, sämtliche Posts und Direktnachrichten,
          Geschenk-Historie) an Ermittlungsbehörden zu übergeben.</li>
      </ul>

      <h3>13a.4 Datenaufbewahrung im Krisenfall</h3>
      <p>
        Abweichend von § 16.2 werden Daten, die zur Aufklärung eines möglichen
        Verbrechens oder zur Verhinderung weiterer Schäden erforderlich sind,
        <strong> nicht im Rahmen der 24-stündigen Lösch-Frist</strong> entfernt.
        Sie werden vielmehr in einem gesicherten Forensik-Archiv aufbewahrt, bis
        die zuständigen Behörden die Freigabe erteilen — längstens jedoch 10 Jahre.
      </p>

      <h3>13a.5 Mitwirkungspflicht des Nutzers</h3>
      <p>
        Bei Anhaltspunkten auf Selbst- oder Fremdgefährdung bist du verpflichtet,
        dem Anbieter wahrheitsgemäße Auskünfte zu erteilen, sofern dies zur
        Schadensabwehr erforderlich ist. Falschangaben in derartigen Situationen
        können zivilrechtliche und strafrechtliche Folgen haben.
      </p>

      <h2>§ 14 Datenschutz</h2>
      <p>
        Die Verarbeitung deiner personenbezogenen Daten richtet sich nach unserer
        <a href="/datenschutz"> Datenschutzerklärung</a>. Mit der Registrierung
        erklärst du dich auch mit dieser einverstanden.
      </p>

      <h2>§ 15 Haftung und Verantwortung für Inhalte</h2>
      <p>
        VibeVibo ist Host-Provider im Sinne des § 7 DDG. Für nutzergenerierte
        Inhalte (Posts, Kommentare, Sprachnachrichten, Profilbilder etc.) ist
        ausschließlich der jeweilige Nutzer verantwortlich.
      </p>
      <p>
        Eine proaktive Vollprüfung aller Inhalte ist nicht möglich. Bei Kenntnis von
        Rechtsverletzungen werden Inhalte unverzüglich entfernt. Meldungen an
        <a href="mailto:ginoheidrich@outlook.com"> ginoheidrich@outlook.com</a>.
      </p>

      <h2>§ 16 Kündigung und Kontolöschung</h2>

      <h3>16.1 Kündigung durch den Nutzer — 24-Stunden-Gnadenfrist</h3>
      <p>
        Du kannst dein Konto jederzeit ohne Angabe von Gründen kündigen — im
        Profil unter <strong>„Einstellungen → Datenschutz → Mein Konto löschen"</strong>.
        Nach Anforderung der Löschung beginnt eine Wartezeit von
        <strong> 24 Stunden („Gnadenfrist")</strong>. Während dieser Frist:
      </p>
      <ul>
        <li>siehst du beim Einloggen einen <strong>roten Banner mit Live-Countdown</strong>;</li>
        <li>kannst du die Löschung jederzeit mit <strong>einem Klick rückgängig</strong> machen (Button „Account behalten");</li>
        <li>bleibt dein Konto sichtbar, damit du dich vor der finalen Entscheidung verabschieden oder Daten sichern kannst.</li>
      </ul>

      <h3>16.2 Endgültige Löschung nach Ablauf der 24 Stunden</h3>
      <p>
        Nach Ablauf der 24 Stunden werden — automatisiert durch einen stündlichen
        Cron-Lauf — folgende Daten <strong>endgültig anonymisiert oder gelöscht</strong>:
      </p>
      <ul>
        <li>Anzeigename → ersetzt durch „N/A"</li>
        <li>Passwort-Hash (Login nicht mehr möglich)</li>
        <li>Profilbild, „Über mich", Interessen</li>
        <li>Klarname und Anschrift (Straße, PLZ, Ort)</li>
        <li>Ausweis-Foto (sofern hinterlegt)</li>
        <li>Geräte-Token, Push-Subscriptions, Session-Cookies</li>
      </ul>

      <h3>16.3 Verbleibende Inhalte (forensische Aufbewahrung)</h3>
      <p>
        Aus Gründen der Beweissicherung (z.B. bei späteren Anzeigen wegen
        Beleidigung, Stalking, Drohung oder im Rahmen von § 13a Krisenfällen)
        bleiben <strong>folgende Inhalte erhalten</strong>, jedoch ohne sichtbare
        Verknüpfung zu deiner Person:
      </p>
      <ul>
        <li>Posts, Kommentare, Pinnwand-Einträge → erscheinen als „N/A"</li>
        <li>Direktnachrichten → bleiben beim Empfänger lesbar (anonymisiert)</li>
        <li><strong>Geschenke, die du verschenkt hast</strong> → bleiben beim Empfänger sichtbar, mit Absender „N/A"</li>
        <li>Moderations-Protokolle und Sanktions-Historie</li>
        <li>Bild-Akte gemäß § 5.5 (anonymisiert)</li>
      </ul>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. c und f DSGVO (rechtliche
        Verpflichtungen, berechtigte Interessen der Beweissicherung). Die
        Aufbewahrung erfolgt nur so lange wie für den Zweck erforderlich, längstens
        jedoch entsprechend den gesetzlichen Aufbewahrungsfristen.
      </p>

      <h3>16.4 Kündigung durch den Anbieter</h3>
      <p>
        Der Anbieter kann das Nutzungsverhältnis bei wiederholten oder schweren
        Verstößen gegen diese AGB jederzeit kündigen, einschließlich permanenter
        Sperrung des Accounts. Bei Verstößen gegen § 13a (Krisen-/Suizidprävention,
        Anstiftung) erfolgt die Sperrung ohne Vorwarnung.
      </p>

      <h3>16.5 Inaktivitäts-Löschung</h3>
      <p>
        Bei sehr langer Inaktivität (24 Monate ohne Login) kann der Account
        automatisch gelöscht werden, nach vorheriger Benachrichtigung an die
        hinterlegte E-Mail-Adresse.
      </p>

      <h2>§ 17 Änderungen dieser AGB</h2>
      <p>
        Diese AGB können angepasst werden. Bei wesentlichen Änderungen wirst du per
        Benachrichtigung in der App und ggf. per E-Mail mindestens 14 Tage vorher
        informiert. Widersprichst du nicht innerhalb dieser Frist, gelten die neuen
        AGB als angenommen.
      </p>
      <p>
        Aktuelle Version stets unter <a href="/agb">vibevibo.de/agb</a> abrufbar.
      </p>

      <h2>§ 18 Salvatorische Klausel</h2>
      <p>
        Sollten einzelne Bestimmungen dieser AGB unwirksam sein, berührt dies nicht
        die Wirksamkeit der übrigen Bestimmungen. Unwirksame Bestimmungen werden
        durch wirksame ersetzt, die dem wirtschaftlichen Zweck am nächsten kommen.
      </p>

      <h2>§ 19 Anwendbares Recht und Gerichtsstand</h2>
      <p>
        Es gilt ausschließlich das Recht der Bundesrepublik Deutschland unter
        Ausschluss des UN-Kaufrechts. Gerichtsstand ist, soweit zulässig, Hamburg.
      </p>

      <h2>§ 20 Kontakt</h2>
      <p>
        Bei Fragen zu diesen AGB:<br/>
        <a href="mailto:ginoheidrich@outlook.com">ginoheidrich@outlook.com</a><br/>
        Postanschrift siehe <a href="/impressum">Impressum</a>.
      </p>

      <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid rgba(0,0,0,0.1)" }} />
      <p className="vv-muted" style={{ fontSize: 12 }}>
        Verwandte Dokumente: <a href="/datenschutz">Datenschutzerklärung</a> ·
        {" "}<a href="/impressum">Impressum</a> ·
        {" "}<a href="/about">Über VibeVibo</a>
      </p>
    </article>
  );
}

const tdStyle = { padding: "8px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", textAlign: "left", verticalAlign: "top" };
