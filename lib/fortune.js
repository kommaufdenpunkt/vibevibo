// 🥠 Glückskeks des Tages — täglich ein neuer Spruch, deterministisch.
// Pure Funktion, kein DB-State. Alle User sehen dasselbe pro Tag.

export const FORTUNES = [
  { emoji: "✨", text: "Heute ist ein guter Tag, jemandem aufs Maul zu lächeln." },
  { emoji: "🌟", text: "Glück ist, was passiert, wenn deine Pinnwand sich selbst füllt." },
  { emoji: "🎈", text: "Manchmal ist offline der lauteste Status." },
  { emoji: "🍀", text: "Wer heute knuddelt, knuddelt morgen doppelt." },
  { emoji: "🌈", text: "Dein Steckbrief verrät weniger als dein Profilbild — wähle weise." },
  { emoji: "💫", text: "Ein altes Foto sagt mehr als 1000 Stories." },
  { emoji: "🦋", text: "Heute jemanden gruschelt? Sonst war es kein Tag." },
  { emoji: "🎀", text: "Deine Top-Freunde verraten viel — auch über dich." },
  { emoji: "🍕", text: "Pizza ist die einzige Sprache, die jeder versteht." },
  { emoji: "🌸", text: "Halt jemandem die digitale Tür auf." },
  { emoji: "🎮", text: "Vergiss nicht, dein VIBO zu füttern." },
  { emoji: "📻", text: "Spiel den Song, der dich an früher erinnert." },
  { emoji: "🌙", text: "Nachtschwärmer sind die ehrlicheren Schreiber." },
  { emoji: "☀️", text: "Lass das Handy mal liegen — die Welt da draußen lädt." },
  { emoji: "🪩", text: "Tanze, als sähe es niemand. Außer Fidolin." },
  { emoji: "🍰", text: "Kleine Updates, große Wirkung." },
  { emoji: "🐾", text: "Dein VIBO denkt grad an dich." },
  { emoji: "📞", text: "Heute schreibst du jemandem, mit dem du lange nicht gesprochen hast." },
  { emoji: "🌻", text: "Status-Update: gut drauf, danke der Nachfrage." },
  { emoji: "🎂", text: "Jemand hat heute Geburtstag — schau auf der Startseite." },
  { emoji: "🚲", text: "Geh raus, lauf eine Runde — dein VIBO wächst dadurch." },
  { emoji: "🪐", text: "Das Internet ist groß. VibeVibo ist gemütlich." },
  { emoji: "🎁", text: "Verschenk ein Smiley, kost nix, bedeutet alles." },
  { emoji: "🍦", text: "Komplimente sind die Eiskugel des Internets." },
  { emoji: "🎤", text: "Dein Lieblingssong heute? Pinn ihn aufs Profil." },
  { emoji: "🌊", text: "Tief durchatmen. Dann gruschelt sich's leichter." },
  { emoji: "🛼", text: "Sei der Skater-Boy / das Skater-Girl von früher — wenigstens kurz." },
  { emoji: "🧸", text: "Ein Knuddi-Knuddel zählt doppelt im Buschfunk." },
  { emoji: "🪞", text: "Spiegelbild-Check: Du siehst gut aus." },
  { emoji: "🍪", text: "Cookies dieser Art darfst du essen." },
  { emoji: "🔮", text: "In 24h passiert was Schönes — bleib dran." },
];

// Liefert den Glückskeks des Tages (deterministisch nach Datum).
export function fortuneOfTheDay(now = Date.now()) {
  const d = new Date(now);
  const key = d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  const idx = key % FORTUNES.length;
  return { ...FORTUNES[idx], dayKey: d.toISOString().slice(0, 10) };
}
