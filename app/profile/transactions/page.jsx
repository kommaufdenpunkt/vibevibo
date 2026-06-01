"use client";

// Vollständiger Vibes-Verlauf — vereint alle Buchungen (VIBO-Shop, Shop,
// Geschenke, Quests, Daily, Karte, Mini-Game …) mit Kategorie- und
// Datums-Filter, gruppiert nach Tag, mit ausführlichen Labels.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";

const PAGE = 50;

// Mapping: reason → { kategorie, emoji, titel(tx) }
function classify(tx) {
  const r = tx.reason || "";
  if (r === "daily")              return { cat: "daily",   emoji: "🎁",  title: "Tages-Bonus" };
  if (r === "admin_grant")        return { cat: "admin",   emoji: "👑",  title: "Admin-Gutschrift" };
  if (r === "gruscheln_send")     return { cat: "social",  emoji: "🫶",  title: `Gegruschelt${tx.refUsername ? ` → @${tx.refUsername}` : ""}` };
  if (r === "gruscheln_recv")     return { cat: "social",  emoji: "🫶",  title: `Gegruschelt worden${tx.refUsername ? ` ← @${tx.refUsername}` : ""}` };
  if (r === "pinnwand")           return { cat: "social",  emoji: "📌",  title: "Pinnwand-Eintrag" };
  if (r === "gift_send")          return { cat: "gift",    emoji: "🎀",  title: `Geschenk verschickt${tx.refUsername ? ` → @${tx.refUsername}` : ""}` };
  if (r === "gift_recv")          return { cat: "gift",    emoji: "🎀",  title: `Geschenk bekommen${tx.refUsername ? ` ← @${tx.refUsername}` : ""}` };
  if (r === "like_recv")          return { cat: "social",  emoji: "❤️",  title: "Like bekommen" };
  if (r === "photo_upload")       return { cat: "social",  emoji: "📷",  title: "Foto hochgeladen" };
  if (r === "world_pickup")       return { cat: "karte",   emoji: "🗺️",  title: "Item auf der Karte gefunden" };
  if (r === "world_pickup_crystal") return { cat: "karte", emoji: "💎",  title: "Kristall auf der Karte" };
  if (r === "vibo_knuddel")       return { cat: "vibo",    emoji: "🥚",  title: `VIBO geknuddelt${tx.refUsername ? ` → @${tx.refUsername}` : ""}` };
  if (r === "vibo_minigame")      return { cat: "vibo",    emoji: "🍕",  title: "Snack-Schnapp-Mini-Game" };
  if (r.startsWith("shop_buy:"))  return { cat: "viboshop",emoji: "🛒",  title: `VIBO-Shop: ${prettyItem(r.slice(9))}` };
  if (r.startsWith("premium:"))   return { cat: "shop",    emoji: "🛍️",  title: `Shop: ${prettyItem(r.slice(8))}` };
  if (r.startsWith("room_upgrade:")) return { cat: "viboshop", emoji: "🏗️", title: `Wohnung erweitert (Stufe ${r.slice(17)})` };
  if (r.startsWith("Quest abgeschlossen")) return { cat: "quest", emoji: "🥇", title: r };
  if (r.startsWith("🎂"))          return { cat: "vibo",    emoji: "🎂",  title: r };
  return { cat: "andere", emoji: "✨", title: r || "Buchung" };
}

// "feast" → "Festmahl", "badge_gold" → "Gold-Badge", etc.
function prettyItem(slug) {
  const map = {
    feast: "Festmahl", potion: "Heiltrank", spa_day: "Wellness-Tag",
    love_potion: "Liebes-Trank", card_pack: "Sammelkarten-Pack",
    mystery_egg: "Mysterium-Ei",
    hat_pirate: "Piraten-Hut", hat_crown: "Krone", hat_party: "Partyhut",
    sticker_xmas: "Weihnachts-Sticker", sticker_heart: "Herz-Sticker",
    furn_bed: "Kuschelbett", furn_couch: "Sofa", furn_table: "Holztisch",
    furn_lamp: "Stehlampe", furn_plant: "Zimmerpflanze",
    furn_tv: "Flatscreen-TV", furn_console: "Spielkonsole",
    furn_frame: "Bilderrahmen", furn_bookshelf: "Bücherregal",
    furn_rug: "Flokati-Teppich", furn_disco: "Discokugel",
    furn_aquarium: "Aquarium",
    extra_pic_slots: "+5 Profilbild-Slots",
    custom_status: "Eigener Status",
    status_slot: "Status-Lieblings-Slot",
    displayname_change: "Anzeigenamen geändert",
    username_change: "@username geändert",
    badge_gold: "Gold-Badge", badge_diamond: "Diamant-Badge",
    frame_rainbow: "Regenbogen-Rahmen",
  };
  return map[slug] || slug;
}

const CATEGORIES = [
  { id: "all",      label: "Alle",        color: "#64748b", emoji: "📋" },
  { id: "daily",    label: "Tages-Bonus", color: "#fbbf24", emoji: "🎁" },
  { id: "quest",    label: "Quests",      color: "#3b82f6", emoji: "🥇" },
  { id: "social",   label: "Social",      color: "#ec4899", emoji: "💖" },
  { id: "gift",     label: "Geschenke",   color: "#f97316", emoji: "🎀" },
  { id: "vibo",     label: "VIBO",        color: "#a78bfa", emoji: "🥚" },
  { id: "viboshop", label: "VIBO-Shop",   color: "#10b981", emoji: "🛒" },
  { id: "shop",     label: "Shop",        color: "#8b5cf6", emoji: "🛍️" },
  { id: "karte",    label: "Karte",       color: "#06b6d4", emoji: "🗺️" },
  { id: "admin",    label: "Admin",       color: "#dc2626", emoji: "👑" },
  { id: "andere",   label: "Andere",      color: "#94a3b8", emoji: "✨" },
];

const DATE_FILTERS = [
  { id: "all",   label: "Gesamt"   },
  { id: "today", label: "Heute"    },
  { id: "week",  label: "7 Tage"   },
  { id: "month", label: "30 Tage"  },
];

function inDateRange(ts, mode) {
  if (mode === "all") return true;
  const now = Date.now();
  if (mode === "today") {
    const start = new Date(); start.setHours(0,0,0,0);
    return ts >= start.getTime();
  }
  if (mode === "week")  return now - ts <= 7  * 24 * 3600_000;
  if (mode === "month") return now - ts <= 30 * 24 * 3600_000;
  return true;
}

function dayKey(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });
}

function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export default function TransactionsPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [catFilter, setCatFilter] = useState("all");
  const [dirFilter, setDirFilter] = useState("all"); // all|earn|spend
  const [dateFilter, setDateFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { if (!loading && !me) router.push("/login"); }, [me, loading, router]);

  const load = useCallback(async (off = 0) => {
    setBusy(true);
    try {
      const r = await api.creditsHistory(PAGE, off);
      setData(r);
      setOffset(off);
    } finally { setBusy(false); }
  }, []);
  useEffect(() => { if (me) load(0); }, [me, load]);

  // Klassifizieren + filtern + nach Tag gruppieren
  const { groups, stats } = useMemo(() => {
    if (!data) return { groups: [], stats: { earn: 0, spend: 0, count: 0 } };
    const q = search.trim().toLowerCase();
    const enriched = data.items.map((t) => ({ ...t, _meta: classify(t) }));
    const filtered = enriched.filter((t) => {
      if (catFilter !== "all" && t._meta.cat !== catFilter) return false;
      if (dirFilter === "earn"  && t.amount <= 0) return false;
      if (dirFilter === "spend" && t.amount >= 0) return false;
      if (!inDateRange(t.at, dateFilter)) return false;
      if (q && !t._meta.title.toLowerCase().includes(q) && !(t.refUsername || "").toLowerCase().includes(q)) return false;
      return true;
    });
    let earn = 0, spend = 0;
    const map = new Map();
    for (const t of filtered) {
      if (t.amount > 0) earn += t.amount;
      else spend += -t.amount;
      const k = dayKey(t.at);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(t);
    }
    return {
      groups: Array.from(map.entries()).map(([k, items]) => ({ day: k, items })),
      stats: { earn, spend, count: filtered.length },
    };
  }, [data, catFilter, dirFilter, dateFilter, search]);

  if (loading || !me || !data) return <div className="vv-page">Lade Transaktionen…</div>;

  return (
    <div className="vv-page">
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Header */}
        <div className="vv-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <h2 style={{ margin: 0 }}>💰 Transaktionen</h2>
              <div className="vv-muted" style={{ fontSize: 12, marginTop: 4 }}>
                Vollständiger Vibes-Verlauf — alle Quellen vereint, alles filterbar.
              </div>
            </div>
            <Link href="/profile" className="vv-btn">← Profil</Link>
          </div>

          {/* Stats-Kacheln */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
            <div style={statBox("#dcfce7", "#166534")}>
              <div style={{ fontSize: 11, opacity: 0.85 }}>↑ Eingänge</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>+{stats.earn} ✨</div>
            </div>
            <div style={statBox("#fee2e2", "#991b1b")}>
              <div style={{ fontSize: 11, opacity: 0.85 }}>↓ Ausgaben</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>−{stats.spend} ✨</div>
            </div>
            <div style={statBox("#e0e7ff", "#3730a3")}>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Σ Buchungen</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{stats.count}</div>
            </div>
          </div>
        </div>

        {/* Filter-Block */}
        <div className="vv-card">
          {/* Suche */}
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Suchen (Titel, Username…)"
            className="vv-input"
            style={{ width: "100%", marginBottom: 10, fontSize: 14 }}
          />

          {/* Richtung */}
          <div style={{ fontSize: 11, color: "var(--vv-muted,#666)", fontWeight: 700, marginBottom: 4 }}>Richtung</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {[["all","Alle"], ["earn","↑ Eingänge"], ["spend","↓ Ausgaben"]].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setDirFilter(k)} style={chip(dirFilter === k, "#ec4899")}>{l}</button>
            ))}
          </div>

          {/* Zeitraum */}
          <div style={{ fontSize: 11, color: "var(--vv-muted,#666)", fontWeight: 700, marginBottom: 4 }}>Zeitraum</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {DATE_FILTERS.map((f) => (
              <button key={f.id} type="button" onClick={() => setDateFilter(f.id)} style={chip(dateFilter === f.id, "#3b82f6")}>{f.label}</button>
            ))}
          </div>

          {/* Kategorien */}
          <div style={{ fontSize: 11, color: "var(--vv-muted,#666)", fontWeight: 700, marginBottom: 4 }}>Kategorie</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" onClick={() => setCatFilter(c.id)} style={chip(catFilter === c.id, c.color)}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Listen nach Tag gruppiert */}
        {groups.length === 0 ? (
          <div className="vv-card" style={{ textAlign: "center", color: "var(--vv-muted,#666)", padding: 28 }}>
            Keine Einträge in dieser Ansicht.
          </div>
        ) : groups.map((g) => (
          <div key={g.day} className="vv-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{
              padding: "10px 14px", background: "linear-gradient(90deg, #ec4899, #8b5cf6)",
              color: "#fff", fontWeight: 700, fontSize: 13, letterSpacing: 0.3,
            }}>
              📅 {g.day}
              <span style={{ float: "right", opacity: 0.85, fontWeight: 600 }}>
                {g.items.length} Buchungen
              </span>
            </div>
            {g.items.map((tx, i) => {
              const m = tx._meta;
              const cat = CATEGORIES.find((c) => c.id === m.cat) || CATEGORIES[0];
              const positive = tx.amount > 0;
              return (
                <div key={tx.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 14px",
                  borderBottom: i < g.items.length - 1 ? "1px solid var(--vv-border,#eee)" : "none",
                }}>
                  <div style={{ fontSize: 22, flexShrink: 0, width: 32, textAlign: "center" }}>{m.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--vv-text,#1c1c1e)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.title}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: cat.color, padding: "2px 7px", borderRadius: 999, textTransform: "uppercase" }}>
                        {cat.label}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--vv-muted,#666)" }}>
                        {timeLabel(tx.at)}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    color: positive ? "#0d8a3f" : "#c2185b",
                    fontWeight: 800, fontSize: 17, minWidth: 80, textAlign: "right",
                  }}>
                    {positive ? "+" : ""}{tx.amount} ✨
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Pagination */}
        <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "center", alignItems: "center" }}>
          <button type="button" disabled={busy || offset === 0}
            onClick={() => load(Math.max(0, offset - PAGE))}
            className="vv-btn">← Neuere</button>
          <span style={{ fontSize: 13, color: "var(--vv-muted,#666)" }}>
            {data.total === 0 ? "0" : `${offset + 1}–${Math.min(offset + PAGE, data.total)}`} von {data.total}
          </span>
          <button type="button" disabled={busy || offset + PAGE >= data.total}
            onClick={() => load(offset + PAGE)}
            className="vv-btn">Ältere →</button>
        </div>
      </div>
    </div>
  );
}

function statBox(bg, color) {
  return { background: bg, color, padding: 10, borderRadius: 10, textAlign: "center" };
}

function chip(active, activeColor) {
  return {
    padding: "5px 11px", borderRadius: 10, border: "none", cursor: "pointer",
    background: active ? activeColor : "rgba(120,120,128,0.15)",
    color: active ? "#fff" : "var(--vv-text,#1c1c1e)",
    fontSize: 12, fontWeight: 700, fontFamily: "inherit",
  };
}
