export const dynamic = "force-dynamic";

export default function WartelistePage() {
  return (
    <div className="vv-login-page">
      <div className="vv-login-hero">
        <div className="vv-login-hero-stars">
          <span>✿</span><span>★</span><span>✩</span><span>♡</span>
          <span>♥</span><span>★</span><span>✿</span><span>✩</span>
        </div>
        <div className="vv-login-hero-avatar"><span>⏳</span></div>
        <h1 className="vv-login-hero-title">★ Du bist auf der Warteliste ★</h1>
        <div className="vv-login-hero-sub">
          ✿ Fidolin prueft deinen Account ✿
        </div>
      </div>

      <div className="vv-login-grid">
        <div className="vv-login-card" style={{ gridColumn: "1 / -1" }}>
          <div className="vv-login-card-title">🌟 ALLES GUT!</div>
          <div className="vv-login-card-body">
            <div className="vv-login-info-block">
              <div className="vv-login-info-icon">✅</div>
              <div>
                <strong>Account angelegt</strong>
                <p>Deine Daten sind sicher gespeichert. Jetzt schaut Fidolin (unsere KI-Moderation) drueber, ob alles passt.</p>
              </div>
            </div>

            <div className="vv-login-info-block">
              <div className="vv-login-info-icon">⏱</div>
              <div>
                <strong>Wie lange?</strong>
                <p>Meistens innerhalb von 24 Stunden. Wenn du eine E-Mail hinterlegt hast, schreiben wir dir sobald freigeschaltet.</p>
              </div>
            </div>

            <div className="vv-login-info-block vv-login-info-safe">
              <div className="vv-login-info-icon">🛡️</div>
              <div>
                <strong>Warum die Pruefung?</strong>
                <p>So halten wir Fake-Profile, Doppelaccounts und Bots draussen. Niemand wird hier mit nervigen Nachrichten zugespammt.</p>
              </div>
            </div>

            <div className="vv-login-info-features">
              <div className="vv-login-feat">📌 Pinnwand & Gaestebuch</div>
              <div className="vv-login-feat">🎵 Profilmusik</div>
              <div className="vv-login-feat">💖 Komplimente</div>
              <div className="vv-login-feat">👯 Top-5-Freunde</div>
              <div className="vv-login-feat">🎁 Geschenke</div>
              <div className="vv-login-feat">🥚 VIBO-Pet</div>
              <div className="vv-login-feat">🗺️ Realitaetskarte</div>
              <div className="vv-login-feat">📣 Buschfunk</div>
            </div>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <a href="/login" className="vv-login-submit" style={{ display: "inline-block" }}>
                ← Zur Startseite
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
