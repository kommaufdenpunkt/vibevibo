// ⏳ Warteliste — schöne Landing-Seite für Nutzer die auf Freigabe warten.
//
// Wird angesteuert von:
//   • Facebook-Callback wenn user.status === "pending" → ?fb=1&name=...
//   • Login-Form nach manuellem Register → ?name=...
//   • Direkt-Aufruf von Wartenden die zurückkommen
//
// Server-Component (kein State, kein Auth-Check nötig — alle dürfen hin).

import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WartelistePage({ searchParams }) {
  const sp = (await searchParams) || {};
  const name = typeof sp?.name === "string" ? sp.name.trim().slice(0, 40) : "";
  const fromFacebook = sp?.fb === "1";

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* Header-Bar */}
        <div style={headerStyle}>
          <span style={{ letterSpacing: 1.5 }}>★ Warteliste</span>
        </div>

        {/* Hero */}
        <div style={heroStyle}>
          <div style={iconStyle}>⏳</div>
          <h1 style={titleStyle}>
            {name ? <>Hi <span style={{ color: "#fbbf24" }}>{name}</span>!</> : "Willkommen!"}
          </h1>
          <p style={subStyle}>
            Du stehst auf der Warteliste — wir schalten dich frei, sobald du dran bist.
          </p>
        </div>

        {/* Facebook-Kontext */}
        {fromFacebook && (
          <div style={fbBlockStyle}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2" style={{ flexShrink: 0 }}>
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <div>
              <strong>Facebook erfolgreich verbunden</strong>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "#475569" }}>
                Deine Facebook-Daten sind sicher hinterlegt. Sobald wir dich freischalten,
                kannst du dir Username und Anzeigename selbst aussuchen.
              </p>
            </div>
          </div>
        )}

        {/* Inhalt */}
        <div style={bodyStyle}>

          <div style={sectionTitleStyle}>★ Wie geht es weiter?</div>

          <ol style={stepsStyle}>
            <li style={stepItemStyle}>
              <span style={stepNumStyle}>1</span>
              <div>
                <strong style={{ color: "#1e3a8a" }}>Wir prüfen kurz</strong>
                <p style={stepDescStyle}>Damit hier niemand belästigt wird, schauen wir bei jeder Neu-Anmeldung kurz drüber. Das dauert meistens nur wenige Stunden.</p>
              </div>
            </li>
            <li style={stepItemStyle}>
              <span style={stepNumStyle}>2</span>
              <div>
                <strong style={{ color: "#1e3a8a" }}>Du bekommst Bescheid</strong>
                <p style={stepDescStyle}>Sobald wir dich freigeschaltet haben, kannst du dich einloggen und loslegen. Beim ersten Login darfst du dir Username + Anzeigename aussuchen.</p>
              </div>
            </li>
            <li style={stepItemStyle}>
              <span style={stepNumStyle}>3</span>
              <div>
                <strong style={{ color: "#1e3a8a" }}>Profil einrichten</strong>
                <p style={stepDescStyle}>Pinnwand dekorieren, Lieblingssong setzen, Top-5-Freunde, VIBO-Pet adoptieren — alles wie früher, nur schöner.</p>
              </div>
            </li>
          </ol>

          {/* Was VibeVibo bietet */}
          <div style={sectionTitleStyle}>★ Was dich erwartet</div>
          <div style={featGridStyle}>
            <div style={featTileStyle}>
              <div style={featEmojiStyle}>📌</div>
              <div style={featLabelStyle}>Pinnwand &amp; Gästebuch</div>
            </div>
            <div style={featTileStyle}>
              <div style={featEmojiStyle}>🎵</div>
              <div style={featLabelStyle}>Profilmusik</div>
            </div>
            <div style={featTileStyle}>
              <div style={featEmojiStyle}>💖</div>
              <div style={featLabelStyle}>Komplimente</div>
            </div>
            <div style={featTileStyle}>
              <div style={featEmojiStyle}>👯</div>
              <div style={featLabelStyle}>Top-5-Freunde</div>
            </div>
            <div style={featTileStyle}>
              <div style={featEmojiStyle}>🎁</div>
              <div style={featLabelStyle}>Geschenke-Vitrine</div>
            </div>
            <div style={featTileStyle}>
              <div style={featEmojiStyle}>🥚</div>
              <div style={featLabelStyle}>VIBO-Pet</div>
            </div>
            <div style={featTileStyle}>
              <div style={featEmojiStyle}>🗺</div>
              <div style={featLabelStyle}>Realitätskarte</div>
            </div>
            <div style={featTileStyle}>
              <div style={featEmojiStyle}>📣</div>
              <div style={featLabelStyle}>Buschfunk-Feed</div>
            </div>
          </div>

          {/* Sicherheits-Hinweis */}
          <div style={safeBlockStyle}>
            <div style={{ fontSize: 22, lineHeight: 1 }}>🛡️</div>
            <div>
              <strong style={{ color: "#9a3412", display: "block", marginBottom: 2 }}>
                Wir nehmen Sicherheit ernst
              </strong>
              <p style={{ margin: 0, fontSize: 12, color: "#7c2d12", lineHeight: 1.45 }}>
                Fidolin (unsere KI-Moderation) prüft Profile, Bilder und Nachrichten.
                Männer dürfen Frauen mit aktiver Initiative-Sperre nicht direkt anschreiben.
                Wir wollen, dass sich hier wirklich alle wohlfühlen.
              </p>
            </div>
          </div>

          {/* Aktion */}
          <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            <Link href="/login" style={primaryBtnStyle}>
              ← Zurück zum Login
            </Link>
            <Link href="/" style={secondaryBtnStyle}>
              🏠 Startseite
            </Link>
          </div>

          <p style={hintStyle}>
            ℹ Diese Seite kannst du dir merken. Wenn du dich erneut anmeldest und noch nicht freigeschaltet bist, landest du wieder hier.
          </p>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <span style={{ color: "#f97316", fontSize: 14 }}>★</span>
          <span>VibeVibo © 2026 · made for everyone who misses the old web</span>
          <span style={{ color: "#f97316", fontSize: 14 }}>★</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #e8edf5 0%, #d6dfee 100%)",
  display: "flex", alignItems: "flex-start", justifyContent: "center",
  padding: "24px 12px 40px",
  fontFamily: "Tahoma, Verdana, 'Trebuchet MS', sans-serif",
  color: "#1e293b",
};

const cardStyle = {
  width: "100%", maxWidth: 620,
  background: "#ffffff",
  border: "1px solid #c5d2e8",
  borderRadius: 6,
  overflow: "hidden",
  boxShadow:
    "0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 20px rgba(30,58,138,0.18)",
};

const headerStyle = {
  padding: "11px 14px",
  background: "linear-gradient(180deg, #1e40af 0%, #1e3a8a 100%)",
  color: "#ffffff",
  fontSize: 13, fontWeight: 700,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  fontFamily: "'Trebuchet MS', Tahoma, sans-serif",
  borderBottom: "2px solid #f97316",
  textShadow: "0 1px 1px rgba(0,0,0,0.3)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
};

const heroStyle = {
  position: "relative",
  background:
    "linear-gradient(180deg, #2563eb 0%, #1e40af 100%)",
  padding: "28px 20px 24px",
  textAlign: "center",
  color: "#ffffff",
  borderBottom: "1px solid #c5d2e8",
  boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.15)",
};

const iconStyle = {
  fontSize: 56, lineHeight: 1,
  marginBottom: 8,
  display: "inline-block",
  width: 90, height: 90, borderRadius: "50%",
  background: "#ffffff",
  border: "3px solid #f97316",
  padding: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  margin: "0 auto 10px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
};

const titleStyle = {
  margin: "4px 0",
  fontSize: 26,
  fontWeight: 900,
  letterSpacing: -0.5,
  textShadow: "0 2px 4px rgba(0,0,0,0.25)",
  fontFamily: "'Trebuchet MS', Tahoma, sans-serif",
};

const subStyle = {
  margin: "6px 0 0",
  fontSize: 13.5,
  opacity: 0.95,
  lineHeight: 1.5,
};

const fbBlockStyle = {
  display: "flex", gap: 12, alignItems: "flex-start",
  padding: 14,
  background: "#f0f4fa",
  borderBottom: "1px solid #c5d2e8",
  borderLeft: "4px solid #1877F2",
};

const bodyStyle = {
  padding: "18px 18px 16px",
};

const sectionTitleStyle = {
  fontSize: 12.5,
  fontWeight: 800,
  color: "#1e3a8a",
  letterSpacing: 1.5,
  textTransform: "uppercase",
  fontFamily: "'Trebuchet MS', Tahoma, sans-serif",
  marginTop: 4,
  marginBottom: 10,
  paddingBottom: 5,
  borderBottom: "1px solid #c5d2e8",
};

const stepsStyle = {
  listStyle: "none", padding: 0, margin: "0 0 18px",
  display: "flex", flexDirection: "column", gap: 10,
};

const stepItemStyle = {
  display: "flex", gap: 12, alignItems: "flex-start",
  padding: 10,
  background: "#f0f4fa",
  border: "1px solid #c5d2e8",
  borderLeft: "3px solid #3b82f6",
  borderRadius: 3,
};

const stepNumStyle = {
  flexShrink: 0,
  width: 28, height: 28,
  borderRadius: "50%",
  background: "linear-gradient(180deg, #f97316, #ea580c)",
  color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontWeight: 800, fontSize: 14,
  border: "1px solid #c2410c",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
};

const stepDescStyle = {
  margin: "3px 0 0",
  fontSize: 12,
  color: "#334155",
  lineHeight: 1.5,
};

const featGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 6,
  marginBottom: 18,
};

const featTileStyle = {
  padding: "10px 6px",
  background: "#ffffff",
  border: "1px solid #c5d2e8",
  borderRadius: 3,
  textAlign: "center",
  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
};

const featEmojiStyle = { fontSize: 22 };

const featLabelStyle = {
  fontSize: 10.5,
  fontWeight: 700,
  color: "#1e3a8a",
  lineHeight: 1.2,
};

const safeBlockStyle = {
  display: "flex", gap: 12,
  padding: 12,
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  borderLeft: "4px solid #f97316",
  borderRadius: 3,
  marginBottom: 8,
};

const primaryBtnStyle = {
  flex: 1, minWidth: 200,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: "11px 16px",
  background: "linear-gradient(180deg, #f97316, #ea580c)",
  color: "#ffffff",
  border: "1px solid #c2410c",
  borderRadius: 4,
  fontWeight: 800, fontSize: 14,
  textDecoration: "none",
  fontFamily: "'Trebuchet MS', Tahoma, sans-serif",
  letterSpacing: 0.3,
  textShadow: "0 1px 1px rgba(0,0,0,0.25)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 0 #9a3412",
};

const secondaryBtnStyle = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: "11px 16px",
  background: "#f0f4fa",
  color: "#1e3a8a",
  border: "1px solid #c5d2e8",
  borderRadius: 4,
  fontWeight: 700, fontSize: 13,
  textDecoration: "none",
  fontFamily: "Tahoma, sans-serif",
};

const hintStyle = {
  fontSize: 11.5,
  color: "#64748b",
  marginTop: 12,
  marginBottom: 0,
  fontStyle: "italic",
  textAlign: "center",
};

const footerStyle = {
  padding: "10px 14px",
  background: "linear-gradient(180deg, #1e3a8a, #172554)",
  color: "#cbd5e1",
  fontSize: 11,
  letterSpacing: 0.3,
  textAlign: "center",
  display: "flex", justifyContent: "center", alignItems: "center", gap: 12,
};
