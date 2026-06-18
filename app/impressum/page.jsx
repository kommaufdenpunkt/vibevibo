export const metadata = {
  title: "Impressum — VibeVibo",
  description: "Pflichtangaben nach § 5 DDG, Verantwortlich nach § 18 Abs. 2 MStV.",
};

export default function ImpressumPage() {
  return (
    <div className="vv-card" style={{ maxWidth: 760, margin: "0 auto", padding: 18 }}>
      <h1>📜 Impressum</h1>

      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        4ever1.tv<br/>
        c/o IP-Management #9293<br/>
        Ludwig-Erhard-Straße 18<br/>
        20459 Hamburg<br/>
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href="mailto:ginoheidrich@outlook.com">ginoheidrich@outlook.com</a><br/>
        Telefon: +49 176 83382930<br/>
        Web: <a href="https://vibevibo.de">vibevibo.de</a>
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        Gino Heidrich<br/>
        Anschrift wie oben (c/o IP-Management)
      </p>

      <h2>EU-Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer noopener">
          https://ec.europa.eu/consumers/odr/
        </a>.
        <br/>
        Unsere E-Mail-Adresse findest du oben im Impressum.
      </p>

      <h2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
      <p>
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
        vor einer Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte
        auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
        Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht
        verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
        überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
        Tätigkeit hinweisen.
      </p>
      <p>
        Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
        Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
        Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der
        Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden
        von entsprechenden Rechtsverletzungen werden wir diese Inhalte
        umgehend entfernen.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Unser Angebot enthält Links zu externen Websites Dritter, auf deren
        Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden
        Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten
        Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten
        verantwortlich.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen
        Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung,
        Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
        Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des
        jeweiligen Autors bzw. Erstellers.
      </p>
      <p>
        Nutzer-generierte Inhalte (Pinnwand-Posts, Profil-Bilder, Status,
        Gruppen-Beiträge etc.) liegen im Verantwortungsbereich des jeweiligen
        Nutzers. Bei Rechtsverletzungen melde dich bitte umgehend — wir
        entfernen entsprechende Inhalte nach Prüfung.
      </p>

      <h2>Bildnachweise</h2>
      <p>
        Emojis: <a href="https://openmoji.org" target="_blank" rel="noreferrer noopener">OpenMoji (CC BY-SA 4.0)</a> /
        System-Emojis (Apple, Google) je nach Plattform.
      </p>

      <p className="vv-muted" style={{ fontSize: 11, marginTop: 24 }}>
        Stand: Juni 2026
      </p>
    </div>
  );
}
