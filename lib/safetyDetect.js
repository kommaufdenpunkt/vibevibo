// 🆘 Safety-Detection — erkennt Krisen-Signale in Texten.
//
// Keyword-basiert (sehr konservativ, lieber Falsch-Positive als Falsch-Negative).
// Wird in Posts + DMs + Live-Chat aufgerufen.
// Bei Hit: Banner an User + Mod-Alarm.

const HIGH_RISK = [
  // Direkte Suizid-Sprache
  "will nicht mehr leben", "möchte nicht mehr leben",
  "umbringen", "selbstmord", "suizid", "schluss machen mit meinem leben",
  "mein leben beenden", "leben nicht mehr wert",
  "alle wären besser ohne mich", "alle wären glücklicher ohne mich",
  "ohne mich besser dran", "wäre besser nicht geboren",
  "von der brücke", "von einer brücke", "vor den zug",
  "tabletten genommen", "tabletten schlucken", "überdosis",
  "schneide mich", "ritzen",
  "kann nicht mehr", "halte das nicht mehr aus", "will nicht mehr",
  "es hat keinen sinn mehr", "alles sinnlos",
];

const MEDIUM_RISK = [
  "einsam", "verlassen", "niemand mag mich", "hasse mich selbst",
  "wertlos", "nichts wert", "nutzlos",
  "depression", "depressiv", "hoffnungslos",
  "alleine sterben", "wer würde mich vermissen",
];

const STALKING_RISK = [
  "weiß wo du wohnst", "komme zu dir nach hause",
  "stehe vor deiner tür", "warte vor deinem haus",
  "verfolge dich", "beobachte dich seit",
];

const VIOLENCE_RISK = [
  "bring dich um", "mach dich fertig", "schlag dich tot",
  "töte dich", "vernichte dich",
];

function _normalize(s) {
  return String(s || "").toLowerCase()
    .replace(/[äöü]/g, (c) => ({ "ä": "ae", "ö": "oe", "ü": "ue" })[c])
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export function detectSafetySignals(text) {
  const n = _normalize(text);
  const hits = { highRisk: [], mediumRisk: [], stalking: [], violence: [] };
  for (const kw of HIGH_RISK) {
    if (n.includes(_normalize(kw))) hits.highRisk.push(kw);
  }
  for (const kw of MEDIUM_RISK) {
    if (n.includes(_normalize(kw))) hits.mediumRisk.push(kw);
  }
  for (const kw of STALKING_RISK) {
    if (n.includes(_normalize(kw))) hits.stalking.push(kw);
  }
  for (const kw of VIOLENCE_RISK) {
    if (n.includes(_normalize(kw))) hits.violence.push(kw);
  }
  const isHigh = hits.highRisk.length > 0;
  const isMedium = hits.mediumRisk.length >= 2; // Mehr als 1 Signal = Eskalation
  const isStalking = hits.stalking.length > 0;
  const isViolence = hits.violence.length > 0;
  return {
    risk: isHigh ? "high" : isMedium ? "medium" : isStalking ? "stalking" : isViolence ? "violence" : "none",
    hits,
    suggestion: isHigh ? "show_help_immediately"
      : isMedium ? "show_help_softly"
      : isStalking ? "alert_target_and_mods"
      : isViolence ? "alert_mods_immediately"
      : null,
  };
}

// Help-Resources je nach Risk-Level
export function getHelpResources(risk) {
  if (risk === "high" || risk === "medium") {
    return {
      title: risk === "high" ? "💛 Wir sehen dich. Du musst das nicht alleine tragen." : "💛 Geht's dir gerade nicht gut?",
      resources: [
        { name: "Telefonseelsorge", contact: "0800-111-0-111", note: "24/7, kostenlos, anonym" },
        { name: "Krisenchat",        contact: "krisenchat.de",  note: "24/7, per Chat" },
        { name: "Nummer gg Kummer",  contact: "116-111",        note: "für Jüngere" },
        { name: "Bei akuter Gefahr", contact: "112",            note: "Notruf" },
      ],
    };
  }
  if (risk === "violence" || risk === "stalking") {
    return {
      title: "🛡 Dich bedroht jemand? Hier sind deine Optionen:",
      resources: [
        { name: "Polizei",           contact: "110",                       note: "bei akuter Gefahr" },
        { name: "Hilfetelefon Gewalt", contact: "08000 116 016",           note: "24/7, kostenlos" },
        { name: "Weiße Ring",        contact: "116 006",                   note: "Opferhilfe" },
        { name: "Wir melden den User", contact: "→ /mcp/meldungen", note: "Unsere Mods werden informiert" },
      ],
    };
  }
  return null;
}
