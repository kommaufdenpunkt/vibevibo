// Wetter-Einfluss auf die Realitätskarte (Pokémon-Go-Style).
// Nutzt Open-Meteo (kostenlos, ohne API-Key). Mappt WMO-Wettercodes
// auf ein Thema + eine bevorzugte VIBO-Spezies, die dann häufiger
// als Wild-VIBO auftaucht.

// WMO Weather interpretation codes → Thema
export function weatherTheme(code, isDay = true) {
  // https://open-meteo.com/en/docs (weathercode)
  if (code === 0) return { key: "clear",  label: isDay ? "Sonnig" : "Klare Nacht", emoji: isDay ? "☀️" : "🌙", favored: isDay ? "stella" : "boo", note: isDay ? "Stella-VIBOs lieben die Sonne!" : "Boo-VIBOs spuken durch die Nacht!" };
  if (code <= 2)  return { key: "partly", label: "Leicht bewölkt", emoji: "🌤️", favored: "kitsune", note: "Kitsune streifen umher." };
  if (code === 3) return { key: "cloud",  label: "Bewölkt", emoji: "☁️", favored: "robi", note: "Robi-VIBOs mögen's grau." };
  if (code <= 48) return { key: "fog",    label: "Nebel", emoji: "🌫️", favored: "boo", note: "Im Nebel erscheinen Boo-VIBOs." };
  if (code <= 67) return { key: "rain",   label: "Regen", emoji: "🌧️", favored: "knuddi", note: "Knuddi blubbern im Regen!" };
  if (code <= 77) return { key: "snow",   label: "Schnee", emoji: "❄️", favored: "knuddi", note: "Schnee lockt Knuddi-VIBOs." };
  if (code <= 82) return { key: "shower", label: "Schauer", emoji: "🌦️", favored: "sprout", note: "Sprösslinge sprießen!" };
  if (code <= 99) return { key: "storm",  label: "Gewitter", emoji: "⛈️", favored: "drago", note: "Im Gewitter erwachen Dragos!" };
  return { key: "unknown", label: "Wetter", emoji: "🌍", favored: null, note: "" };
}

// Holt aktuelles Wetter für lat/lng von Open-Meteo. Best-effort, mit Timeout.
export async function fetchWeather(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!r.ok) return null;
    const d = await r.json();
    const cur = d?.current;
    if (!cur) return null;
    const isDay = cur.is_day === 1;
    const theme = weatherTheme(cur.weather_code, isDay);
    return {
      temp: Math.round(cur.temperature_2m),
      code: cur.weather_code,
      isDay,
      ...theme,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
