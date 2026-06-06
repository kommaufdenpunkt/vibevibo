"use client";

// 🌸 Landing-Extras: ausführliche Info-Sektionen + Ad-Slots für die Public-Page.
// Wird AM ENDE der Landing eingefügt — vor dem Final-Disclaimer.

import { useEffect, useState } from "react";
import Link from "next/link";
import LandingAd from "./LandingAd";

const FEATURES = [
  { icon: "📌", title: "Pinnwand wie früher",
    text: "Schreib auf die Wand deiner Freunde — Glitzer-Smileys, Bilder, Sprachnachrichten. Pinnwand-Einträge bleiben. Kein Story-Verfall." },
  { icon: "💌", title: "Komplimente",
    text: "Anonym oder mit Namen. 5/Tag gratis, eigene Texte kosten ein paar Vibes. Niemand farmt sich durch deinen Feed." },
  { icon: "🎁", title: "80 Geschenke",
    text: "9 Kategorien · 6 Verpackungen · persönliche Nachricht. Geschenke landen für immer in der Vitrine des Empfängers." },
  { icon: "🥚", title: "VIBO-Pet (Tamagotchi)",
    text: "Eigenes virtuelles Pet, das auf der Realitätskarte mit dir mitläuft. Füttern, spielen, schlafen, Sammelkarten gewinnen." },
  { icon: "🗺", title: "Realitätskarte",
    text: "Sammle Items in der echten Welt. POIs · Basar · Fischen an Seen/Flüssen · Pflege-Orte. Open-Source-Karte." },
  { icon: "🎨", title: "Eigenes CSS / Skin",
    text: "Wie damals bei MySpace — gestalte dein Profil komplett um. 29 Presets + Color-Builder + 7 Schriftarten + Auto-Kontrast." },
  { icon: "💬", title: "Live-Messenger",
    text: "Eigene PWA als App installierbar. Sprachnachrichten · Bilder · Anrufe · Stumm-Schalten · Push." },
  { icon: "🏅", title: "Rang-System 0-200",
    text: "Jappy-Style Erfahrungspunkte. Jeder Rang schaltet neue Features frei (eigene Skin, Sammelkarten-Tausch, Hall of Fame …)." },
  { icon: "🏘", title: "Gruppen & Foren",
    text: "Eigene Threads gründen. Klassische Foren-Optik. Kategorien für Hobbys, Städte, Interessen." },
  { icon: "🎵", title: "Profilmusik",
    text: "Dein Lieblingssong als Hintergrund-Musik. YouTube oder Spotify einbinden. Wie früher." },
  { icon: "📣", title: "Buschfunk-Feed",
    text: "Live wer-hat-was-wo gemacht. Kommentare · Sprachnachrichten · 6 Reaktionen pro Comment. Fidolin moderiert." },
  { icon: "💑", title: "Partnerschaft & Familienstand",
    text: "vergeben / verlobt / verheiratet — mit Anfrage-System & Konsens beider Seiten. Niemand wird ohne Zustimmung geoutet." },
];

const FAQS = [
  { q: "Wie verdient ihr Geld?",
    a: "Werbung (rechts auf der Landing & vereinzelt im Feed) + freiwillige Vibes-Käufe + VIP-Mitgliedschaft (werbefrei, 1500 ✨/Monat oder 12000 ✨/Jahr). Eingeloggte User können Werbung in den Einstellungen abschalten — wir respektieren das." },
  { q: "Sammelt ihr meine Daten?",
    a: "Nur was nötig ist: Username · gehashtes Passwort (bcrypt) · was du selbst eingibst (Steckbrief, Pinnwand, Mood). Kein Tracking-Cookie, kein Verkauf an Dritte. Push-Standort ist opt-in." },
  { q: "Wer moderiert die Inhalte?",
    a: "Fidolin — unsere KI-Moderation. Sie prüft Pinnwand-Posts, Gästebuch, Profilbilder, Kommentare und Voice-Messages auf Hass, Spam, Nacktheit, Doxing. Bei Unsicherheit → manueller Admin-Check." },
  { q: "Warum nostalgisch?",
    a: "Weil moderne Plattformen zu Algorithmus-Hölle geworden sind. Wir wollen echte Verbindungen wie 2007: Pinnwand-Einträge, gruscheln, Lieblingssong auf dem Profil, ICQ-Status. Ohne Werbe-Tracking, ohne TikTok-Brain." },
  { q: "Kann ich meinen Account löschen?",
    a: "Ja, jederzeit — in den Einstellungen mit Bestätigung. DSGVO-konform. Wir löschen deine Daten innerhalb von 30 Tagen vollständig." },
  { q: "Ist das sicher?",
    a: "TLS-Verschlüsselung · bcrypt-Passwörter · 2FA · IP-Limits gegen Brute-Force · Pwned-Passwords-Check bei Registrierung · VPN/Tor-Sperre bei Anmeldung. Sicherheits-Audits regelmäßig." },
];

export default function LandingExtras() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch("/api/ping", { cache: "no-store" })
      .then((r) => r.json()).then((d) => setStats(d?.stats || null))
      .catch(() => {});
  }, []);

  return (
    <div className="vv-landing-extras">
      {/* === Stats / Live-Zahlen === */}
      <div className="vv-landing-stats">
        <div className="vv-landing-stat">
          <div className="vv-landing-stat-num">{stats?.users ?? "—"}</div>
          <div className="vv-landing-stat-label">👥 Mitglieder</div>
        </div>
        <div className="vv-landing-stat">
          <div className="vv-landing-stat-num">{stats?.online ?? "—"}</div>
          <div className="vv-landing-stat-label">🟢 Jetzt online</div>
        </div>
        <div className="vv-landing-stat">
          <div className="vv-landing-stat-num">{stats?.pinnwand ?? "—"}</div>
          <div className="vv-landing-stat-label">📌 Pinnwand-Einträge</div>
        </div>
        <div className="vv-landing-stat">
          <div className="vv-landing-stat-num">{stats?.gifts ?? "—"}</div>
          <div className="vv-landing-stat-label">🎁 Geschenke heute</div>
        </div>
      </div>

      {/* === Werbe-Banner (Landing) === */}
      <div className="vv-landing-ad-section">
        <LandingAd slot="landing-top" minHeight={120} label="Werbung — VIP-User sehen das nicht" />
      </div>

      {/* === Features Deep-Dive === */}
      <div className="vv-landing-section">
        <h2 className="vv-landing-section-title">🌸 Was kannst du bei VibeVibo?</h2>
        <div className="vv-landing-section-sub">12 Features, die du sonst nirgendwo mehr findest</div>
        <div className="vv-landing-feat-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="vv-landing-feat">
              <div className="vv-landing-feat-icon">{f.icon}</div>
              <div className="vv-landing-feat-title">{f.title}</div>
              <div className="vv-landing-feat-text">{f.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* === Pricing / VIP === */}
      <div className="vv-landing-section">
        <h2 className="vv-landing-section-title">💎 Mitgliedschaft & VIP</h2>
        <div className="vv-landing-section-sub">Kostenlos für alle · VIP-Vorteile für ein paar Vibes</div>
        <div className="vv-landing-pricing">
          <div className="vv-landing-price" data-tier="free">
            <div className="vv-landing-price-tier">FREE</div>
            <div className="vv-landing-price-val">0 €</div>
            <div className="vv-landing-price-sub">Für immer kostenlos</div>
            <ul className="vv-landing-price-list">
              <li>✓ Alle Grundfunktionen</li>
              <li>✓ Pinnwand · Messenger · Geschenke</li>
              <li>✓ VIBO-Pet & Karte</li>
              <li>✓ 5 Komplimente/Tag</li>
              <li>○ Mit dezenter Werbung</li>
              <li>○ 9 Profilbild-Slots</li>
            </ul>
          </div>
          <div className="vv-landing-price" data-tier="vip">
            <div className="vv-landing-price-tier">⭐ VIP</div>
            <div className="vv-landing-price-val">1500 ✨/Monat</div>
            <div className="vv-landing-price-sub">oder 12.000 ✨/Jahr (33% Rabatt)</div>
            <ul className="vv-landing-price-list">
              <li>✓ Alles aus FREE</li>
              <li>✓ <b>Komplett werbefrei</b></li>
              <li>✓ +5 Profilbild-Slots</li>
              <li>✓ Custom-Status gratis</li>
              <li>✓ Gold-Badge neben Name</li>
              <li>✓ Prio-Support</li>
            </ul>
          </div>
        </div>
        <div className="vv-landing-price-note">
          ✨ Vibes verdienst du durch Aktivität (Pinnwand, Geschenke, Quests) — Auch kaufbar im Shop, falls du den Vibe-Boost willst.
        </div>
      </div>

      {/* Zweiter Ad-Slot mitten im Content */}
      <div className="vv-landing-ad-section">
        <LandingAd slot="landing-mid" minHeight={250} label="Werbung — VIP-User sehen das nicht" />
      </div>

      {/* === FAQ === */}
      <div className="vv-landing-section">
        <h2 className="vv-landing-section-title">❓ Häufige Fragen</h2>
        <div className="vv-landing-section-sub">Alles was du wissen willst, bevor du dich registrierst</div>
        <div className="vv-landing-faqs">
          {FAQS.map((f, i) => (
            <details key={i} className="vv-landing-faq">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* === Trust / Sicherheit === */}
      <div className="vv-landing-section vv-landing-trust">
        <h2 className="vv-landing-section-title">🛡 Sicherheit & Datenschutz</h2>
        <div className="vv-landing-trust-grid">
          <div className="vv-landing-trust-item">
            <div className="vv-landing-trust-emoji">🔒</div>
            <b>TLS überall</b>
            <p>Komplette HTTPS-Verschlüsselung. Keine ungeschützten Verbindungen.</p>
          </div>
          <div className="vv-landing-trust-item">
            <div className="vv-landing-trust-emoji">🔐</div>
            <b>bcrypt + 2FA</b>
            <p>Passwörter sind gehasht. Zwei-Faktor optional via Authenticator-App.</p>
          </div>
          <div className="vv-landing-trust-item">
            <div className="vv-landing-trust-emoji">🇪🇺</div>
            <b>DSGVO</b>
            <p>Account jederzeit löschbar. Daten-Export auf Anfrage. Server in der EU (Hetzner).</p>
          </div>
          <div className="vv-landing-trust-item">
            <div className="vv-landing-trust-emoji">🤖</div>
            <b>Fidolin KI</b>
            <p>Inhalts-Moderation auf Hass · Spam · Nacktheit · Doxing — automatisch & sofort.</p>
          </div>
        </div>
      </div>

      {/* === Final CTA + Footer-Links === */}
      <div className="vv-landing-final-cta">
        <h2>Bereit für den Vibe? 🌸</h2>
        <p>Kostenlos · Werbefrei mit VIP · DSGVO-konform · Made with ♥ for everyone who misses the old web</p>
        <Link href="/login" className="vv-landing-cta-btn">✨ Jetzt registrieren — kostenlos</Link>
      </div>

      <div className="vv-landing-footer-links">
        <Link href="/impressum">Impressum</Link>
        <Link href="/datenschutz">Datenschutz</Link>
        <a href="mailto:hallo@vibevibo.de">Kontakt</a>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>VibeVibo © 2026</span>
      </div>
    </div>
  );
}
