// OpenLigaDB-Fetcher fuer das Bundesliga-Tippspiel (kostenlos, kein Key).
const BASE = "https://api.openligadb.de";
const cache = new Map();
const TTL_MS = 5 * 60 * 1000;

async function get(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error("OpenLigaDB " + r.status);
  const data = await r.json();
  cache.set(url, { at: Date.now(), data });
  return data;
}

function finalResult(m) {
  const list = Array.isArray(m.matchResults) ? m.matchResults : [];
  const end = list.find((x) => /endergebnis/i.test(x.resultName || ""));
  return end || list[list.length - 1] || null;
}

function mapMatch(m) {
  const fr = finalResult(m);
  return {
    matchId: m.matchID,
    season: String(m.leagueSeason || ""),
    matchday: Number((m.group && m.group.groupOrderID) || 0),
    team1: (m.team1 && m.team1.teamName) || "",
    team2: (m.team2 && m.team2.teamName) || "",
    team1Icon: (m.team1 && m.team1.teamIconUrl) || "",
    team2Icon: (m.team2 && m.team2.teamIconUrl) || "",
    kickoffAt: m.matchDateTimeUTC ? Date.parse(m.matchDateTimeUTC) : (m.matchDateTime ? Date.parse(m.matchDateTime) : 0),
    goals1: fr ? Number(fr.pointsTeam1) : null,
    goals2: fr ? Number(fr.pointsTeam2) : null,
    finished: !!m.matchIsFinished,
  };
}

export async function fetchCurrentMatchday() {
  const data = await get(BASE + "/getmatchdata/bl1");
  return (Array.isArray(data) ? data : []).map(mapMatch).filter((m) => m.matchId && m.matchday);
}
