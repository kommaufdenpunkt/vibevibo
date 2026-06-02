"use client";

// VIBO-Basar: 3 lokale Händler in deiner Nachbarschaft.
// Standorte rotieren täglich. Verkaufen nur, wenn du physisch hingelaufen bist (≤ 30m).
// Vibes gedeckelt (Anti-Inflation).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import HelpCard from "./HelpCard";

function fmtDist(m) {
  if (m == null) return "?";
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

const CAT_FILTERS = [
  { key: "all",       label: "Alle" },
  { key: "fish",      label: "🐟 Fisch" },
  { key: "treasure",  label: "💎 Wertvoll" },
  { key: "junk",      label: "🗑️ Müll" },
  { key: "legendary", label: "🐉 Legendär" },
];

export default function MarketPanel() {
  const [data, setData] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [geo, setGeo] = useState(null);
  const [geoErr, setGeoErr] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const watchRef = useRef(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoErr("Geolocation nicht verfügbar.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setGeo({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) => setGeoErr(err.message || "Position nicht abrufbar"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => setGeo({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000 },
    );
    return () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  const load = useCallback(async () => {
    try {
      const lat = geo?.lat, lng = geo?.lng;
      setData(await api.market(lat, lng));
    } catch (e) { setFlash(`⚠ ${e.message}`); }
  }, [geo?.lat, geo?.lng]);
  useEffect(() => { load(); }, [load]);

  function toggle(id) {
    setSel((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  // Auswahl-Helfer
  const visibleItems = useMemo(() => {
    if (!data) return [];
    const list = data.items.filter((i) => !i.kept);
    if (catFilter === "all") return list;
    return list.filter((i) => i.category === catFilter);
  }, [data, catFilter]);

  function selectAllVisible() { setSel(new Set(visibleItems.map((i) => i.id))); }
  function selectNone() { setSel(new Set()); }
  function selectTop5() {
    const sorted = [...visibleItems].sort((a, b) => (b.best?.price || b.baseValue) - (a.best?.price || a.baseValue));
    setSel(new Set(sorted.slice(0, 5).map((i) => i.id)));
  }
  function selectCategory(cat) {
    const ids = data.items.filter((i) => !i.kept && i.category === cat).map((i) => i.id);
    setSel(new Set(ids));
  }
  function selectJunk() { selectCategory("junk"); }

  async function sellTo(merchantId) {
    const ids = [...sel];
    if (!ids.length) { setFlash("⚠ Wähle erst Fänge zum Verkaufen aus."); setTimeout(() => setFlash(""), 2500); return; }
    setBusy(true);
    try {
      const r = await api.marketSell(merchantId, ids, geo?.lat, geo?.lng);
      setFlash(`💰 ${r.sold} verkauft für +${r.vibes} ✨${r.cappedSome ? " (Tageslimit erreicht)" : ""}`);
      setTimeout(() => setFlash(""), 4000);
      setSel(new Set());
      await load();
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 4000);
    } finally { setBusy(false); }
  }

  async function setHomeHere() {
    if (!geo) { setFlash("⚠ Erst Position freigeben."); setTimeout(() => setFlash(""), 2500); return; }
    setBusy(true);
    try {
      await api.marketSetHome(geo.lat, geo.lng);
      setFlash("🏠 Zuhause-Anker gesetzt!");
      setTimeout(() => setFlash(""), 2500);
      await load();
    } catch (e) { setFlash(`⚠ ${e.message}`); }
    finally { setBusy(false); }
  }

  async function toggleKeep(item) {
    setBusy(true);
    try {
      await api.marketKeep(item.id, !item.kept);
      setSel((prev) => { const n = new Set(prev); n.delete(item.id); return n; });
      await load();
    } catch (e) { setFlash(`⚠ ${e.message}`); }
    finally { setBusy(false); }
  }

  if (!data) return <div style={{ padding: 20, textAlign: "center" }}>Lade Basar…</div>;

  if (data.needsHome) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>🏠</div>
        <h3 style={{ margin: "0 0 8px" }}>Wo bist du zu Hause?</h3>
        <p style={{ color: "var(--vv-muted,#666)", fontSize: 13, marginBottom: 16 }}>
          Die 3 Händler ziehen in deine Nachbarschaft. Ihre Stände wandern jeden Tag — du läufst hin, um zu verkaufen.
        </p>
        {geoErr && <div style={{ color: "#b91c1c", fontSize: 12, marginBottom: 10 }}>⚠ {geoErr}</div>}
        <button type="button" disabled={!geo || busy} onClick={setHomeHere}
          className="vv-btn-big vv-btn-big-pink" style={{ padding: "12px 20px" }}>
          {geo ? "🏠 Hier ist mein Zuhause" : "📍 Warte auf Position…"}
        </button>
      </div>
    );
  }

  const selItems = data.items.filter((i) => sel.has(i.id));
  const selValue = (mId) => selItems.reduce((sum, i) => sum + (i.best?.merchantId === mId ? i.best.price : 0), 0);
  const inRangeMerchants = data.week.filter((m) => m.inRange);
  const keptItems = data.items.filter((i) => i.kept);

  return (
    <div style={{ padding: 14 }}>
      <HelpCard id="market-intro" title="Wie funktioniert der VIBO-Basar?" emoji="🏪" color="#f59e0b">
        Hier verkaufst du deine <b>Angel-Fänge</b> gegen Vibes ✨.
        <br/><br/>
        • <b>3 Händler diese Woche</b> in deiner Nachbarschaft<br/>
        • <b>Stände wandern täglich</b> — gleich um die Ecke / nächste Straße / paar Straßen weiter<br/>
        • <b>Hingehen</b> (≤ {data.sellRadiusM} m) zum Verkaufen<br/>
        • <b>Preise schwanken täglich</b><br/>
        • 🔥 <b>Tagesgesuch</b>: doppelter Preis<br/>
        • <b>★ Behalten:</b> ein Fang bleibt im Aquarium und wird nie verkauft<br/>
        • <b>Fair-Limit:</b> max {data.sellCap.max} ✨ pro Tag
      </HelpCard>

      {data.hot && (
        <div style={{
          background: "linear-gradient(135deg, #fef08a, #f59e0b)", color: "#1c1c1e",
          borderRadius: 12, padding: 12, marginBottom: 12, textAlign: "center", fontWeight: 700,
        }}>
          🔥 Heute gesucht: {data.hot.emoji} <b>{data.hot.name}</b> — doppelter Preis!
        </div>
      )}

      {flash && (
        <div style={{
          background: flash.startsWith("⚠") ? "#fef3c7" : "#dcfce7",
          color: flash.startsWith("⚠") ? "#92400e" : "#166534",
          padding: 10, borderRadius: 10, marginBottom: 12, fontWeight: 700, textAlign: "center",
        }}>{flash}</div>
      )}

      <div style={{ fontSize: 11, color: "var(--vv-muted,#666)", marginBottom: 8, textAlign: "center" }}>
        🏠 Zuhause-Anker gesetzt · {geo ? "📡 Position aktiv" : (geoErr ? `📵 ${geoErr}` : "📡 Warte…")}
        {" · "}
        <button type="button" onClick={setHomeHere} disabled={!geo || busy}
          style={{ background: "none", border: "none", color: "#ec4899", cursor: "pointer", padding: 0, fontSize: 11, fontFamily: "inherit", textDecoration: "underline" }}>
          Anker zurücksetzen
        </button>
      </div>

      <div style={{ fontSize: 12, color: "var(--vv-muted,#666)", marginBottom: 12, textAlign: "center" }}>
        Heute verkauft: <b>{data.sellCap.earnedToday}</b> / {data.sellCap.max} ✨
        · {data.sellCap.salesToday} Verkäufe
      </div>

      <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>🧑‍🌾 Händler in deiner Nachbarschaft</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {data.week.map((m) => {
          const distLbl = m.distanceM != null ? fmtDist(m.distanceM) : "—";
          const canSell = m.inRange;
          return (
            <div key={m.id} style={{
              background: "var(--vv-card,#fff)",
              border: `2px solid ${canSell ? "#22c55e" : "var(--vv-border,#e5e7eb)"}`,
              borderRadius: 12, padding: 12, opacity: canSell ? 1 : 0.85,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 30 }}>{m.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>
                    {m.name}
                    {canSell
                      ? <span style={{ marginLeft: 8, fontSize: 11, color: "#16a34a", fontWeight: 700 }}>● IN REICHWEITE</span>
                      : <span style={{ marginLeft: 8, fontSize: 11, color: "var(--vv-muted,#888)" }}>{distLbl} entfernt</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--vv-muted,#666)" }}>{m.blurb}</div>
                  <div style={{ fontSize: 11, color: "var(--vv-muted,#888)", marginTop: 2 }}>
                    📍 {m.slotLabel} ({m.anchorDistM} m von Zuhause)
                  </div>
                  <div style={{ fontSize: 10, color: "var(--vv-muted,#888)", marginTop: 3 }}>
                    🐟 ×{(m.mult.fish * m.factors.fish).toFixed(1)} · 💎 ×{(m.mult.treasure * m.factors.treasure).toFixed(1)} · 🗑️ ×{(m.mult.junk * m.factors.junk).toFixed(1)} · 🐉 ×{(m.mult.legendary * m.factors.legendary).toFixed(1)}
                  </div>
                </div>
              </div>
              {canSell ? (
                <button type="button" disabled={busy || sel.size === 0}
                  onClick={() => sellTo(m.id)}
                  className={sel.size > 0 ? "vv-btn-big vv-btn-big-green" : "vv-btn-big vv-btn-big-ghost"}
                  style={{ width: "100%", marginTop: 10, padding: "10px", fontSize: 13 }}>
                  {sel.size > 0 ? `${sel.size} Fänge an ${m.name} verkaufen (~${selValue(m.id)} ✨)` : "Erst Fänge unten auswählen"}
                </button>
              ) : (
                <div style={{ marginTop: 10, padding: 8, background: "var(--vv-surface,#f5f5f7)", borderRadius: 8, fontSize: 12, color: "var(--vv-muted,#666)", textAlign: "center" }}>
                  🚶 Geh näher ran — noch {Math.max(0, (m.distanceM ?? 0) - data.sellRadiusM)} m bis du verkaufen kannst.
                </div>
              )}
            </div>
          );
        })}
        {inRangeMerchants.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--vv-muted,#666)", fontSize: 13, padding: 8 }}>
            Niemand in Reichweite. Lauf zu einem der Stände — Standorte siehst du auf der Karte!
          </div>
        )}
      </div>

      <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>
        🎣 Deine Fänge ({visibleItems.length}{keptItems.length ? ` · ${keptItems.length} ★ behalten` : ""})
      </h3>

      {/* Kategorie-Filter-Chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {CAT_FILTERS.map((f) => {
          const active = catFilter === f.key;
          return (
            <button key={f.key} type="button" onClick={() => setCatFilter(f.key)}
              style={{
                padding: "5px 10px", borderRadius: 999,
                border: active ? "1px solid #ec4899" : "1px solid var(--vv-border,#ddd)",
                background: active ? "linear-gradient(135deg,#fdf2f8,#fce7f3)" : "var(--vv-card,#fff)",
                color: "var(--vv-text,#1c1c1e)",
                fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
              }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Smart-Auswahl */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <button type="button" onClick={selectAllVisible} className="vv-btn" style={{ fontSize: 12, padding: "4px 10px" }}>✅ Alle</button>
        <button type="button" onClick={selectNone} className="vv-btn" style={{ fontSize: 12, padding: "4px 10px" }}>⬜ Nichts</button>
        <button type="button" onClick={selectTop5} className="vv-btn" style={{ fontSize: 12, padding: "4px 10px" }}>⭐ Top 5</button>
        <button type="button" onClick={selectJunk} className="vv-btn" style={{ fontSize: 12, padding: "4px 10px" }}>🗑️ Nur Müll</button>
        {sel.size > 0 && (
          <span style={{ marginLeft: "auto", alignSelf: "center", fontSize: 12, color: "var(--vv-muted,#666)" }}>
            {sel.size} ausgewählt
          </span>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--vv-muted,#666)", padding: 16, fontSize: 13 }}>
          {data.items.filter((i) => !i.kept).length === 0
            ? "Noch nichts gefangen. Geh ans Wasser und wirf die Angel aus! 🎣"
            : "Keine Fänge in dieser Kategorie."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
          {visibleItems.map((it) => {
            const selected = sel.has(it.id);
            return (
              <div key={it.id} style={{ position: "relative" }}>
                <button type="button" onClick={() => toggle(it.id)}
                  style={{
                    width: "100%",
                    background: selected ? "linear-gradient(135deg,#bbf7d0,#86efac)" : "var(--vv-card,#fff)",
                    border: `2px solid ${selected ? "#16a34a" : (it.isHot ? "#f59e0b" : "var(--vv-border,#e5e7eb)")}`,
                    borderRadius: 12, padding: "10px 6px", textAlign: "center", cursor: "pointer",
                    fontFamily: "inherit",
                  }}>
                  {it.isHot && <span style={{ position: "absolute", top: 3, right: 4, fontSize: 11 }}>🔥</span>}
                  <div style={{ fontSize: 26 }}>{it.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--vv-text,#1c1c1e)" }}>{it.label}</div>
                  {it.sizeCm > 0 && <div style={{ fontSize: 10, color: "var(--vv-muted,#888)" }}>{it.sizeCm} cm</div>}
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#16a34a", marginTop: 2 }}>
                    {it.best ? `${it.best.price} ✨` : `~${it.baseValue} ✨`}
                  </div>
                </button>
                {/* ★-Behalten-Button — verhindert versehentlichen Verkauf von Lieblings-Fang */}
                <button type="button" title="Behalten / freigeben"
                  disabled={busy}
                  onClick={() => toggleKeep(it)}
                  style={{
                    position: "absolute", top: 2, left: 2, width: 22, height: 22, borderRadius: "50%",
                    border: "none", background: it.kept ? "#fbbf24" : "rgba(255,255,255,0.7)",
                    color: it.kept ? "#fff" : "#888",
                    fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}>★</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Aquarium / Behalten */}
      {keptItems.length > 0 && (
        <>
          <h3 style={{ margin: "16px 0 8px", fontSize: 15 }}>⭐ Aquarium ({keptItems.length})</h3>
          <div style={{ fontSize: 11, color: "var(--vv-muted,#666)", marginBottom: 8 }}>
            Diese Fänge werden nie verkauft. Tippe auf ★, um sie wieder freizugeben.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 6 }}>
            {keptItems.map((it) => (
              <div key={it.id} style={{ position: "relative" }}>
                <div style={{
                  background: "linear-gradient(135deg,#fef3c7,#fde68a)",
                  border: "2px solid #f59e0b", borderRadius: 10, padding: "8px 4px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 22 }}>{it.emoji}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#7c2d12" }}>{it.label}</div>
                  {it.sizeCm > 0 && <div style={{ fontSize: 9, color: "#92400e" }}>{it.sizeCm} cm</div>}
                </div>
                <button type="button" disabled={busy} onClick={() => toggleKeep(it)}
                  style={{
                    position: "absolute", top: 2, left: 2, width: 20, height: 20, borderRadius: "50%",
                    border: "none", background: "#f59e0b", color: "#fff",
                    fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                  }} title="Freigeben">★</button>
              </div>
            ))}
          </div>
        </>
      )}

      {data.records.length > 0 && (
        <>
          <h3 style={{ margin: "16px 0 8px", fontSize: 15 }}>🏅 Deine Angel-Rekorde</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 6 }}>
            {data.records.map((r) => (
              <div key={r.itemId} style={{
                background: "var(--vv-card,#fff)", border: "1px solid var(--vv-border,#eee)",
                borderRadius: 10, padding: "8px 6px", textAlign: "center", fontSize: 11,
              }}>
                <div style={{ fontSize: 20 }}>{r.emoji}</div>
                <div style={{ fontWeight: 700 }}>{r.label}</div>
                <div style={{ color: "var(--vv-muted,#666)" }}>{r.bestSizeCm} cm</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
