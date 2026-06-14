"use client";

// Vollständiger Vibes-Verlauf — vereint alle Buchungen (VIBO-Shop, Shop,
// Geschenke, Quests, Daily, Karte, Mini-Game …) mit Kategorie- und
// Datums-Filter, gruppiert nach Tag, mit ausführlichen Labels.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import CreditsPanel from "@/components/CreditsPanel";

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
  if (r === "stripe_purchase")    return { cat: "echtgeld",emoji: "💳",  title: "Vibes-Pack gekauft (Stripe)" };
  if (r === "stripe_vip")         return { cat: "echtgeld",emoji: "💎",  title: "VIP-Zugang gekauft (Stripe)" };
  if (r.startsWith("ad_reward:")) return { cat: "werbung", emoji: "📺",  title: `Werbung geguckt · ${prettyAdSlot(r.slice(10))}` };
  if (r === "ad_view")            return { cat: "werbung", emoji: "📺",  title: "Werbung geguckt" };
  if (r === "survey_complete")    return { cat: "werbung", emoji: "📋",  title: "Umfrage abgeschlossen" };
  if (r === "offer_complete")     return { cat: "werbung", emoji: "🎁",  title: "Offer-Wall Belohnung" };
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

// Ad-Slot-IDs in lesbare Namen umwandeln
function prettyAdSlot(slot) {
  const map = {
    "hub-simulator":   "Test-Werbung",
    "hub-cpx":         "CPX Umfrage",
    "hub-bitlabs":     "BitLabs Umfrage",
    "hub-ayetstudios": "AyetStudios Offer",
    "hub-pollfish":    "Pollfish Umfrage",
    "hub-adgate":      "AdGate Offer",
    "shop_lowbal":     "Shop Notfall-Vibes",
    "buschfunk_boost": "Buschfunk-Boost",
    "profile_visit":   "Profil-Besuch",
    "home_banner":     "Home-Banner",
  };
  return map[slot] || slot;
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
  { id: "echtgeld", label: "Echtgeld",    color: "#f59e0b", emoji: "💳" },
  { id: "werbung",  label: "Werbung",     color: "#22c55e", emoji: "📺" },
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
  // Standardmaessig zugeklappt — Suche reicht meist.
  // Wenn ein Filter aktiv ist (nicht "all"), bleibt es aufgeklappt damit der User sieht warum.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasActiveFilter = catFilter !== "all" || dirFilter !== "all" || dateFilter !== "all";

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

  if (loading || !me || !data) return (
    <div className="vv-tx-page">
      <div className="vv-tx-hero"><div className="vv-tx-hero-title">💰 Lade Transaktionen…</div></div>
    </div>
  );

  return (
    <div className="vv-tx-page">
      {/* ★ HERO ★ */}
      <div className="vv-tx-hero">
        <div className="vv-tx-hero-stars">
          <span>✨</span><span>★</span><span>✿</span><span>♡</span><span>♥</span><span>★</span><span>✿</span><span>✩</span>
        </div>
        <div className="vv-tx-hero-coin">💰</div>
        <h1 className="vv-tx-hero-title">★ VIBES-VERLAUF ★</h1>
        <div className="vv-tx-hero-sub">
          ✿ Alle deine Buchungen · auf einen Blick · filterbar ✿
        </div>
        <div className="vv-tx-hero-stats">
          <div className="vv-tx-hero-stat" data-tone="green">
            <div className="vv-tx-stat-label">↑ Eingänge</div>
            <div className="vv-tx-stat-val">+{stats.earn} ✨</div>
          </div>
          <div className="vv-tx-hero-stat" data-tone="red">
            <div className="vv-tx-stat-label">↓ Ausgaben</div>
            <div className="vv-tx-stat-val">−{stats.spend} ✨</div>
          </div>
          <div className="vv-tx-hero-stat" data-tone="violet">
            <div className="vv-tx-stat-label">Σ Buchungen</div>
            <div className="vv-tx-stat-val">{stats.count}</div>
          </div>
        </div>
        <Link href="/profile" className="vv-tx-back-btn">↩ Zurück zum Profil</Link>
      </div>

      {/* Credits-Saldo + Daily Bonus */}
      <CreditsPanel embedded />

      {/* Filter Card — ausklappbar. Suchfeld immer sichtbar. */}
      <div style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 16, padding: 12, marginBottom: 12,
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}>
        {/* Suchzeile + Filter-Toggle */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              fontSize: 14, pointerEvents: "none",
            }}>🔍</span>
            <input
              type="search" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen (Titel, Username…)"
              style={{
                width: "100%", padding: "10px 12px 10px 34px",
                borderRadius: 999, fontSize: 14,
                background: "rgba(248,250,252,0.9)",
                border: "1px solid rgba(0,0,0,0.08)", outline: "none",
              }}
            />
          </div>
          <button type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-label="Filter öffnen"
            style={{
              background: filtersOpen || hasActiveFilter
                ? "linear-gradient(135deg, #ec4899, #be185d)"
                : "rgba(248,250,252,0.9)",
              color: filtersOpen || hasActiveFilter ? "#fff" : "#475569",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 999, padding: "10px 14px",
              fontSize: 13, fontWeight: 800, cursor: "pointer",
              whiteSpace: "nowrap", flexShrink: 0,
              boxShadow: filtersOpen || hasActiveFilter ? "0 2px 8px rgba(236,72,153,0.35)" : "none",
              transition: "all 0.15s",
            }}>
            {filtersOpen ? "▴ Filter" : "▾ Filter"}
            {hasActiveFilter && (
              <span style={{
                background: "rgba(255,255,255,0.3)", marginLeft: 6,
                padding: "1px 6px", borderRadius: 999, fontSize: 10,
              }}>aktiv</span>
            )}
          </button>
        </div>

        {/* Ausgeklappte Filter */}
        {filtersOpen && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <FilterGroup label="⇅ Richtung">
              {[["all","Alle"], ["earn","↑ Eingänge"], ["spend","↓ Ausgaben"]].map(([k, l]) => (
                <Chip key={k} active={dirFilter === k} color="#ec4899"
                  onClick={() => setDirFilter(k)}>{l}</Chip>
              ))}
            </FilterGroup>

            <FilterGroup label="📅 Zeitraum">
              {DATE_FILTERS.map((f) => (
                <Chip key={f.id} active={dateFilter === f.id} color="#3b82f6"
                  onClick={() => setDateFilter(f.id)}>{f.label}</Chip>
              ))}
            </FilterGroup>

            <FilterGroup label="📂 Kategorie">
              {CATEGORIES.map((c) => (
                <Chip key={c.id} active={catFilter === c.id} color={c.color}
                  onClick={() => setCatFilter(c.id)}>
                  {c.emoji} {c.label}
                </Chip>
              ))}
            </FilterGroup>

            {hasActiveFilter && (
              <div style={{ textAlign: "right" }}>
                <button type="button" onClick={() => {
                  setCatFilter("all"); setDirFilter("all"); setDateFilter("all");
                }} style={{
                  background: "transparent", border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: 999, padding: "5px 12px", fontSize: 12,
                  color: "#64748b", cursor: "pointer", fontWeight: 700,
                }}>↻ Filter zurücksetzen</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Listen nach Tag gruppiert */}
      {groups.length === 0 ? (
        <div className="vv-tx-card" data-tone="violet">
          <div className="vv-tx-card-title">📭 NICHTS GEFUNDEN</div>
          <div className="vv-tx-card-body" style={{ textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 6 }}>🥺</div>
            Keine Buchungen in dieser Ansicht — probier andere Filter.
          </div>
        </div>
      ) : groups.map((g) => (
        <div key={g.day} className="vv-tx-day">
          <div className="vv-tx-day-header">
            <span>📅 {g.day}</span>
            <span className="vv-tx-day-count">{g.items.length} Buchungen</span>
          </div>
          <div className="vv-tx-day-list">
            {g.items.map((tx) => {
              const m = tx._meta;
              const cat = CATEGORIES.find((c) => c.id === m.cat) || CATEGORIES[0];
              const positive = tx.amount > 0;
              return (
                <div key={tx.id} className={`vv-tx-row${positive ? " positive" : " negative"}`}>
                  <div className="vv-tx-row-emoji">{m.emoji}</div>
                  <div className="vv-tx-row-main">
                    <div className="vv-tx-row-title">{m.title}</div>
                    <div className="vv-tx-row-meta">
                      <span className="vv-tx-cat" style={{ background: cat.color }}>
                        {cat.label}
                      </span>
                      <span className="vv-tx-time">⏰ {timeLabel(tx.at)}</span>
                    </div>
                  </div>
                  <div className={`vv-tx-amount${positive ? " positive" : " negative"}`}>
                    {positive ? "+" : ""}{tx.amount} ✨
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Pagination */}
      <div className="vv-tx-pagination">
        <button type="button" disabled={busy || offset === 0}
          onClick={() => load(Math.max(0, offset - PAGE))}
          className="vv-tx-page-btn">← Neuere</button>
        <span className="vv-tx-page-info">
          {data.total === 0 ? "0" : `${offset + 1}–${Math.min(offset + PAGE, data.total)}`} von {data.total}
        </span>
        <button type="button" disabled={busy || offset + PAGE >= data.total}
          onClick={() => load(offset + PAGE)}
          className="vv-tx-page-btn">Ältere →</button>
      </div>

      {/* Footer */}
      <div className="vv-tx-footer">
        <span>★</span>
        <span>Vibes ✨ verdienst du durch Pinnwand-Einträge, Geschenke, Quests, Tages-Bonus und mehr</span>
        <span>★</span>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div>
      <div style={{
        fontSize: 10.5, fontWeight: 900, color: "#9d174d",
        letterSpacing: 0.5, textTransform: "uppercase",
        marginBottom: 5,
      }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
    </div>
  );
}

function Chip({ active, color, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        background: active ? color : "rgba(248,250,252,0.9)",
        color: active ? "#fff" : "#475569",
        border: active ? "none" : "1px solid rgba(0,0,0,0.08)",
        borderRadius: 999, padding: "5px 12px",
        fontSize: 12, fontWeight: 800, cursor: "pointer",
        whiteSpace: "nowrap",
        boxShadow: active ? `0 2px 6px ${color}66` : "none",
        textShadow: active ? "0 1px 2px rgba(0,0,0,0.2)" : "none",
        transition: "all 0.12s",
      }}>{children}</button>
  );
}
