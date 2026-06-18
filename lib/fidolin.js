// Fidolin – der KI-Ordnungshüter von VibeVibo.
// Prüft Texte (Pinnwand, Nachrichten, Gruppen) und Profilbilder.
// Gehirn: Google Gemini (kostenloses Kontingent). Ohne API-Key fällt
// Fidolin auf einen eingebauten Wortfilter zurück (Bilder dann ohne KI).

const API_KEY = process.env.GEMINI_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const ENDPOINT = (m) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${API_KEY}`;

export function fidolinEnabled() {
  return API_KEY.length > 10;
}

// ---- Gemini-Aufruf -------------------------------------------------
async function callGemini(parts, { json = true } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(ENDPOINT(MODEL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0,
          ...(json ? { responseMimeType: "application/json" } : {}),
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    return text;
  } finally {
    clearTimeout(t);
  }
}

function parseJsonLoose(text) {
  if (!text) return null;
  let s = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch { return null; }
}

// ---- Wortfilter-Fallback ------------------------------------------
const BAD_WORDS = [
  // Beleidigungen / Hass (DE/EN, bewusst knapp gehalten)
  "hurensohn", "wichser", "fotze", "missgeburt", "schwuchtel", "neger",
  "nigger", "faggot", "bitch", "schlampe", "spasti", "behindert",
  "vergasen", "heil hitler", "judensau",
  // Drohung / Gewalt
  "bring dich um", "töte dich", "abstechen", "kill yourself", "kys",
  // Sexuell explizit / Minderjährige
  "kinderporno", "child porn", "cp ", "loli",
];
const SPAM_PATTERNS = [
  /\bviagra\b/i, /\bcasino\b/i, /\bcrypto invest/i, /\bporn\b/i,
  /(http|www\.)\S+\.(ru|tk|top|xyz|click)\b/i,
];

function keywordCheck(text) {
  const low = " " + String(text || "").toLowerCase() + " ";
  for (const w of BAD_WORDS) {
    if (low.includes(w)) {
      return { block: true, category: "Beleidigung/Hass", severity: 3, reason: `Verbotenes Wort erkannt`, by: "wortfilter" };
    }
  }
  for (const re of SPAM_PATTERNS) {
    if (re.test(text)) {
      return { block: true, category: "Spam/Werbung", severity: 1, reason: "Spam/Werbung erkannt", by: "wortfilter" };
    }
  }
  return { block: false, category: "", severity: 0, reason: "", by: "wortfilter" };
}

// ---- Öffentliche API ----------------------------------------------

// Synchrone Namens-Prüfung (Username + Anzeigename): Wortfilter + Spam.
// Gibt { ok, reason } zurück. Kein Gemini-Call (Namen müssen instant gehen).
export function checkNameAllowed(name) {
  const r = keywordCheck(name);
  if (r.block) return { ok: false, reason: r.reason || "Unzulässiger Name." };
  // Offensichtliche Impersonation von System/Admin verhindern
  const low = String(name || "").toLowerCase().replace(/[\s_-]/g, "");
  if (["system", "admin", "vibevibo", "moderator", "fidolin", "support"].some((w) => low === w)) {
    return { ok: false, reason: "Dieser Name ist reserviert." };
  }
  return { ok: true, reason: "" };
}

const TEXT_PROMPT = `Du bist Fidolin, der Moderator einer freundlichen, nostalgischen Community (Alter 14+).
Bewerte den folgenden Nutzer-Beitrag. Blockiere NUR bei echten Verstößen:
- Beleidigung, Hass, Rassismus, Diskriminierung
- Drohung, Gewaltaufruf, Mobbing/Belästigung
- Sexuell explizite Inhalte, besonders mit Minderjährigen
- Spam/Werbung/Betrug
- Weitergabe sensibler Daten (Adresse, Telefon) zum Schaden anderer
Normale Umgangssprache, Flirten, Emojis, Kritik sind ERLAUBT.
Antworte AUSSCHLIESSLICH als JSON:
{"block": true|false, "category": "kurz", "severity": 1-3, "reason": "kurze Begründung auf Deutsch"}
Beitrag:
`;

// 🛡 STRICT-MODUS für „Mann schreibt Frau" — blockt auch grenzwertige
// Anmache, Komplimente über Körper, Treffen-Anfragen, sexuelle Andeutungen.
const MALE_TO_FEMALE_TEXT_PROMPT = `Du bist Fidolin, der Frauen-Schutz-Wächter von VibeVibo.
Du prüfst eine Nachricht von einem MÄNNLICHEN Absender an eine WEIBLICHE Empfängerin.

Sei in diesem Modus deutlich STRENGER. BLOCKIERE bei:
- Beleidigung, Hass, Drohung, sexuell explizit (wie immer)
- Anmache, Anbaggern, "Hey Süße/Hübsche", "schreib mir mal", Annäherungsversuche
- Komplimente über Körper, Aussehen, Figur, Brust, Po, "siehst gut aus"
- Aufdringliche Treffen-Anfragen, Date-Vorschläge, "wo wohnst du", "wie alt bist du"
- Sexuelle Andeutungen, Flirten von Fremden, anzügliche Emojis (🍆💦🥵😈)
- Forderung nach Bildern, Selfies, Videos, Sprachnachrichten
- Übergriffige Fragen zu Beziehungsstatus, Partner
- Manipulative Anmach-Sprüche, "Pickup-Lines"
Höfliche Begrüßung, fachliche Frage, normale Gesprächs-Einleitung sind OK.

Antworte AUSSCHLIESSLICH als JSON:
{"block": true|false, "category": "kurz", "severity": 1-3, "reason": "kurze Begründung auf Deutsch"}
Beitrag:
`;

export async function moderateText(text, opts = {}) {
  const clean = String(text || "").trim();
  if (!clean) return { block: false, category: "", severity: 0, reason: "", by: "fidolin" };
  if (!fidolinEnabled()) return keywordCheck(clean);
  const prompt = opts.mode === "male_to_female" ? MALE_TO_FEMALE_TEXT_PROMPT : TEXT_PROMPT;
  try {
    const out = await callGemini([{ text: prompt + clean.slice(0, 4000) }]);
    const j = parseJsonLoose(out);
    if (!j || typeof j.block !== "boolean") return keywordCheck(clean);
    return {
      block: !!j.block,
      category: String(j.category || "").slice(0, 60),
      severity: Math.max(0, Math.min(3, Number(j.severity) || (j.block ? 2 : 0))),
      reason: String(j.reason || "").slice(0, 200),
      by: "fidolin",
      mode: opts.mode || "default",
    };
  } catch {
    // KI nicht erreichbar -> sicherer Wortfilter als Netz
    return keywordCheck(clean);
  }
}

const IMAGE_PROMPT = `Du bist Fidolin, der STRENGE Moderator von VibeVibo. Prüfe dieses Bild sehr genau.
SOFORT ABLEHNEN (block=true) bei:
- Nacktheit jeder Art: entblößte Genitalien, Brüste, Gesäß; durchsichtige/aufreizend wenig Kleidung
- sexuelle Handlungen, pornografische oder anzügliche Posen, eindeutig sexueller Kontext
- jegliche (auch nur mögliche) sexualisierte Darstellung Minderjähriger -> IMMER ablehnen
- Gewalt, Blut, Misshandlung, bedrohliche Waffen
- Hass-/Extremismus-Symbole (z.B. Hakenkreuz)
- Drogen, illegale oder rechtswidrige Inhalte
WICHTIG: Im Zweifel IMMER ablehnen (block=true) – lieber einmal zu viel.
Erlaubt sind nur klar harmlose, angezogene Fotos: normale Selfies/Porträts, Tiere,
Landschaften, Cartoons, Avatare, Gegenstände.
Antworte AUSSCHLIESSLICH als JSON:
{"block": true|false, "reason": "kurze Begründung auf Deutsch"}`;

// dataUrl: "data:image/jpeg;base64,...."
export async function moderateImage(dataUrl) {
  const s = String(dataUrl || "");
  const m = s.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return { block: true, reason: "Ungültiges Bildformat", by: "fidolin", undecided: false };
  if (!fidolinEnabled()) {
    // Ohne KI: Bild ohne Prüfung freigeben (mit Hinweis im Mod-Log).
    // Admin kann es jederzeit nachträglich sperren — sonst würden alle Profilbilder
    // ewig in 'pending' stecken bleiben, weil keiner sie freischaltet.
    return { block: false, undecided: false, reason: "Keine KI konfiguriert – automatisch freigegeben", by: "ohne-ki" };
  }
  try {
    const out = await callGemini([
      { text: IMAGE_PROMPT },
      { inline_data: { mime_type: m[1], data: m[2] } },
    ]);
    const j = parseJsonLoose(out);
    if (!j || typeof j.block !== "boolean") {
      // Antwort unbrauchbar → optimistisch freigeben statt ewig pending
      return { block: false, undecided: false, reason: "KI-Antwort unklar – automatisch freigegeben", by: "fidolin-fallback" };
    }
    return { block: !!j.block, reason: String(j.reason || "").slice(0, 200), by: "fidolin", undecided: false };
  } catch {
    // Netzwerk-/Timeout-Fehler → optimistisch freigeben, Admin kann nachträglich blockieren
    return { block: false, undecided: false, reason: "KI nicht erreichbar – automatisch freigegeben", by: "fidolin-offline" };
  }
}

const AUDIO_PROMPT = `Du bist Fidolin, der KI-Wächter von VibeVibo. Pruefe diese Sprachnachricht.
Blocke wenn: Beleidigung, Hass, Drohung, sexuell explizit, Werbung/Spam,
Personenbezogene Daten (Telefonnr, Adresse, Bankdaten), Auffordern zu illegalen Handlungen.
Erlaubt sind normale Plaudereien, Begruessungen, Musik im Hintergrund, lachen, traurige Stimmung.
Antworte AUSSCHLIESSLICH als JSON:
{"block": true|false, "category": "kurze Kategorie", "reason": "kurze Begruendung auf Deutsch"}`;

const MALE_TO_FEMALE_AUDIO_PROMPT = `Du bist Fidolin, der Frauen-Schutz-Wächter von VibeVibo.
Du prüfst eine Sprachnachricht von einem MÄNNLICHEN Absender an eine WEIBLICHE Empfängerin.

Sei STRENG. BLOCKIERE bei:
- Beleidigung, Hass, Drohung, sexuell explizit (wie immer)
- Anmache, "Hey Süße", anzügliche Komplimente, Komplimente über Körper/Aussehen
- Treffen-/Date-Anfragen, "wo wohnst du", "wie alt bist du"
- Sexuelle Andeutungen, schwere Atmung, anzüglich gestöhnt, Flirt-Versuche
- Forderungen nach Bildern, Sprachnachrichten, Video-Calls
- Pickup-Sprüche, manipulative Anmach-Versuche
Erlaubt: höfliche Begrüßung, fachliche Frage, normale Konversation ohne Anmache.

Antworte AUSSCHLIESSLICH als JSON:
{"block": true|false, "category": "kurze Kategorie", "reason": "kurze Begruendung auf Deutsch"}`;

// 🎤 Voice-Gender-Detection — analysiert die Stimme und schätzt das wahrscheinliche
// Geschlecht des Sprechers. Genutzt für Verifikation + Anti-Fake-Frau-Schutz.
const VOICE_GENDER_PROMPT = `Du bist ein neutraler Sprach-Analytiker.
Analysiere diese Audio-Aufnahme und schätze das wahrscheinliche Geschlecht der sprechenden Person.
Beachte Stimmlage (Tonhöhe, Frequenz), Klangfarbe, Sprechrhythmus.
Gib KEIN moralisches Urteil ab. Nur technische Einschätzung.

Antworte AUSSCHLIESSLICH als JSON:
{"gender": "m"|"w"|"unsure", "confidence": 0.0-1.0, "reason": "kurze technische Begründung auf Deutsch"}

Hinweise:
- Bei klar tiefer Stimme (typisch männlich): gender="m", confidence 0.8-1.0
- Bei klar hoher Stimme (typisch weiblich): gender="w", confidence 0.8-1.0
- Bei Zwischenlage / Kinderstimme / unklar / Hintergrundmusik / kein Sprechen: gender="unsure", confidence 0.0-0.5`;

// dataUrl: "data:audio/webm;base64,...."  (auch ogg/mp3/m4a wird akzeptiert)
export async function moderateAudio(dataUrl, opts = {}) {
  const s = String(dataUrl || "");
  const m = s.match(/^data:(audio\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return { block: true, reason: "Ungueltiges Audio-Format", by: "fidolin", undecided: false };
  // Max ~700 KB Base64 = ~ 60s WebM/Opus
  if (s.length > 1_200_000) return { block: true, reason: "Audio zu gross", by: "fidolin", undecided: false };
  if (!fidolinEnabled()) {
    return { block: false, undecided: false, reason: "Keine KI konfiguriert - automatisch freigegeben", by: "ohne-ki" };
  }
  const prompt = opts.mode === "male_to_female" ? MALE_TO_FEMALE_AUDIO_PROMPT : AUDIO_PROMPT;
  try {
    const out = await callGemini([
      { text: prompt },
      { inline_data: { mime_type: m[1], data: m[2] } },
    ]);
    const j = parseJsonLoose(out);
    if (!j || typeof j.block !== "boolean") {
      return { block: false, undecided: false, reason: "KI-Antwort unklar - automatisch freigegeben", by: "fidolin-fallback" };
    }
    return {
      block: !!j.block,
      category: String(j.category || "").slice(0, 80),
      reason: String(j.reason || "").slice(0, 200),
      by: "fidolin",
      undecided: false,
      mode: opts.mode || "default",
    };
  } catch {
    return { block: false, undecided: false, reason: "KI nicht erreichbar - automatisch freigegeben", by: "fidolin-offline" };
  }
}

// 🎤 Stimm-Geschlecht-Erkennung — analysiert Audio und gibt {gender, confidence} zurück.
// Nutzung: Verifikations-Flow (User reicht Stimm-Sample ein) + passives Mitlauschen
// bei Voice-Messages, um Fake-Frauen-Accounts zu enttarnen.
export async function detectVoiceGender(dataUrl) {
  const s = String(dataUrl || "");
  const m = s.match(/^data:(audio\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return { gender: "unsure", confidence: 0, reason: "Ungültiges Audio-Format", by: "fidolin" };
  if (s.length > 1_200_000) return { gender: "unsure", confidence: 0, reason: "Audio zu groß", by: "fidolin" };
  if (!fidolinEnabled()) return { gender: "unsure", confidence: 0, reason: "Keine KI konfiguriert", by: "ohne-ki" };
  try {
    const out = await callGemini([
      { text: VOICE_GENDER_PROMPT },
      { inline_data: { mime_type: m[1], data: m[2] } },
    ]);
    const j = parseJsonLoose(out);
    if (!j) return { gender: "unsure", confidence: 0, reason: "KI-Antwort unklar", by: "fidolin-fallback" };
    const gender = ["m", "w", "unsure"].includes(j.gender) ? j.gender : "unsure";
    const confidence = Math.max(0, Math.min(1, Number(j.confidence) || 0));
    return {
      gender, confidence,
      reason: String(j.reason || "").slice(0, 200),
      by: "fidolin",
    };
  } catch {
    return { gender: "unsure", confidence: 0, reason: "KI nicht erreichbar", by: "fidolin-offline" };
  }
}

// Welche Sanktion folgt aus einem Text-Verstoß? (Fidolins Bann-Politik)
export function sanctionForText(result) {
  if (!result?.block) return null;
  const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  const cat = (result.category || "").toLowerCase();
  if (result.severity >= 3 || /kind|minderj|porn/.test(cat)) {
    return { type: "full", durationMs: 7 * DAY, reason: `Fidolin: ${result.category || "schwerer Verstoß"}` };
  }
  if (result.severity >= 2 || /hass|drohung|belästig|gewalt|beleidig/.test(cat)) {
    return { type: "comm", durationMs: 1 * DAY, reason: `Fidolin: ${result.category || "Verstoß"}` };
  }
  // leichter Verstoß / Spam -> nur löschen, kein Bann
  return null;
}
