"use client";

// VibeVibo Realitätskarte. Leaflet wird per CDN geladen — kein npm-Build-Impact.
// OpenStreetMap-Tiles (gratis). Nur DEIN Standort wird angezeigt, niemand sonst.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ITEMS } from "@/lib/world";
import WorldInventory from "./WorldInventory";
import MarketPanel from "./MarketPanel";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS  = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadLeaflet() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.L) return resolve(true);
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    let script = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = LEAFLET_JS;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => resolve(true));
    script.addEventListener("error", () => resolve(false));
    // Falls schon geladen
    if (window.L) resolve(true);
  });
}

function itemEmojiDiv(L, kind) {
  const def = ITEMS[kind] || { emoji: "📦", color: "#666" };
  return L.divIcon({
    className: "vv-world-item",
    html: `<div style="
      width:40px;height:40px;border-radius:50%;
      background:${def.color};border:3px solid #fff;
      box-shadow:0 4px 10px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      font-size:22px;
      animation:vv-pop 1.6s ease-in-out infinite;
    ">${def.emoji}</div>
    <style>@keyframes vv-pop {0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}</style>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function meIcon(L) {
  return L.divIcon({
    className: "vv-me-icon",
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:#3b82f6;border:3px solid #fff;
      box-shadow:0 0 0 4px rgba(59,130,246,0.3), 0 4px 8px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function homeIcon(L) {
  return L.divIcon({
    className: "vv-home-icon",
    html: `<div style="
      width:30px;height:30px;border-radius:8px;
      background:#ec4899;border:2px solid #fff;
      box-shadow:0 4px 10px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;font-size:16px;
    ">🏠</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function merchantIcon(L, emoji, inRange) {
  const border = inRange ? "#22c55e" : "#f59e0b";
  return L.divIcon({
    className: "vv-merchant-icon",
    html: `<div style="
      width:46px;height:46px;border-radius:50%;
      background:#fff;border:3px solid ${border};
      box-shadow:0 4px 14px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;font-size:24px;
      ${inRange ? "animation:vv-pop 1.6s ease-in-out infinite;" : ""}
    ">${emoji}</div>
    <style>@keyframes vv-pop {0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}</style>`,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  });
}

function poiIcon(L, emoji, color, inRange, cooldownLeftMs) {
  const cd = cooldownLeftMs > 0;
  const border = cd ? "#9ca3af" : (inRange ? "#16a34a" : color);
  const bg = cd ? "rgba(255,255,255,0.7)" : "#fff";
  return L.divIcon({
    className: "vv-poi-icon",
    html: `<div style="
      width:34px;height:34px;border-radius:50%;
      background:${bg};border:2px solid ${border};
      box-shadow:0 3px 8px rgba(0,0,0,0.25);
      display:flex;align-items:center;justify-content:center;font-size:18px;
      ${cd ? "opacity:0.55;filter:grayscale(0.6);" : ""}
    ">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function companionIcon(L, emoji) {
  return L.divIcon({
    className: "vv-companion-icon",
    html: `<div style="
      width:34px;height:34px;border-radius:50%;
      background:linear-gradient(135deg,#fff,#fce7f3);
      border:2px solid #ec4899;
      box-shadow:0 3px 10px rgba(236,72,153,0.4);
      display:flex;align-items:center;justify-content:center;font-size:20px;
      animation:vv-walk 2.2s ease-in-out infinite;
    ">${emoji}</div>
    <style>@keyframes vv-walk {0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-3px) rotate(3deg)}}</style>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

// Kleiner Versatz (in Grad) für den Companion neben dem User-Pin.
function offsetForCompanion(lat) {
  // ~10 m östlich, ~5 m südlich
  const dLat = -5 / 111000;
  const dLng = 10 / (111000 * Math.cos((lat * Math.PI) / 180));
  return { dLat, dLng };
}

export default function WorldMap({ onPickup }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const meMarkerRef = useRef(null);
  const itemsLayerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const merchantsLayerRef = useRef(null);
  const homeMarkerRef = useRef(null);
  const poiLayerRef = useRef(null);
  const companionMarkerRef = useRef(null);

  const [perm, setPerm] = useState("idle"); // idle | requesting | granted | denied
  const [consent, setConsent] = useState(null); // null=lädt, 1=ja, -1=nein, 0=unbestimmt
  const [pos, setPos] = useState(null);
  const [items, setItems] = useState([]);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");
  const [weather, setWeather] = useState(null);
  const [market, setMarket] = useState(null);
  const [poiData, setPoiData] = useState(null); // { pois, useRadiusM, kinds }
  const [vibo, setVibo] = useState(null);
  const [poiSheetOpen, setPoiSheetOpen] = useState(false);
  const [poiBusy, setPoiBusy] = useState(false);
  const [companionBubble, setCompanionBubble] = useState("");
  const [invSheetOpen, setInvSheetOpen] = useState(false);
  const [marketSheetOpen, setMarketSheetOpen] = useState(false);

  // Leaflet + Karte initialisieren wenn Position da
  useEffect(() => {
    if (!pos || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const ok = await loadLeaflet();
      if (!ok || cancelled || !containerRef.current) return;
      const L = window.L;
      const map = L.map(containerRef.current, { zoomControl: true })
        .setView([pos.lat, pos.lng], 17);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      meMarkerRef.current = L.marker([pos.lat, pos.lng], { icon: meIcon(L) }).addTo(map);
      radiusCircleRef.current = L.circle([pos.lat, pos.lng], {
        radius: 30, color: "#3b82f6", weight: 1, fillOpacity: 0.08,
      }).addTo(map);
      itemsLayerRef.current = L.layerGroup().addTo(map);
      merchantsLayerRef.current = L.layerGroup().addTo(map);
      poiLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    })();
    return () => { cancelled = true; };
  }, [pos]);

  // Position aktualisieren auf Karte (User-Pin, Reichweiten-Kreis, Companion)
  useEffect(() => {
    if (!pos || !mapRef.current) return;
    const L = window.L;
    if (!L) return;
    meMarkerRef.current?.setLatLng([pos.lat, pos.lng]);
    radiusCircleRef.current?.setLatLng([pos.lat, pos.lng]);
    // Companion-Marker folgt mit kleinem Versatz
    if (companionMarkerRef.current) {
      const { dLat, dLng } = offsetForCompanion(pos.lat);
      companionMarkerRef.current.setLatLng([pos.lat + dLat, pos.lng + dLng]);
    }
  }, [pos]);

  // Items neu zeichnen
  useEffect(() => {
    if (!items.length || !mapRef.current || !itemsLayerRef.current) return;
    const L = window.L;
    if (!L) return;
    itemsLayerRef.current.clearLayers();
    for (const it of items) {
      const m = L.marker([it.lat, it.lng], { icon: itemEmojiDiv(L, it.kind) });
      m.on("click", () => pickup(it));
      itemsLayerRef.current.addLayer(m);
    }
  }, [items]);

  // Händler-Marker + Zuhause-Pin
  useEffect(() => {
    if (!mapRef.current || !merchantsLayerRef.current) return;
    const L = window.L;
    if (!L) return;
    merchantsLayerRef.current.clearLayers();
    if (homeMarkerRef.current) {
      try { homeMarkerRef.current.remove(); } catch {}
      homeMarkerRef.current = null;
    }
    if (!market) return;
    if (market.home) {
      homeMarkerRef.current = L.marker([market.home.lat, market.home.lng], {
        icon: homeIcon(L), zIndexOffset: -500,
      }).addTo(mapRef.current).bindTooltip("Dein Zuhause-Anker");
    }
    for (const m of (market.week || [])) {
      const marker = L.marker([m.lat, m.lng], { icon: merchantIcon(L, m.emoji, m.inRange) });
      const distLbl = m.distanceM != null ? `${m.distanceM} m entfernt` : "";
      marker.bindTooltip(`${m.emoji} ${m.name}${distLbl ? " · " + distLbl : ""}`);
      marker.on("click", () => {
        if (m.inRange) {
          // Direkt Basar öffnen — Verkaufen-Knopf für genau diesen Händler
          setMarketSheetOpen(true);
        } else {
          setFlash(`${m.emoji} ${m.name} · noch ${Math.max(0, (m.distanceM ?? 0) - (market.sellRadiusM || 30))} m`);
          setTimeout(() => setFlash(""), 3500);
        }
      });
      merchantsLayerRef.current.addLayer(marker);
    }
  }, [market]);

  // POI-Marker zeichnen
  useEffect(() => {
    if (!mapRef.current || !poiLayerRef.current) return;
    const L = window.L;
    if (!L) return;
    poiLayerRef.current.clearLayers();
    if (!poiData?.pois?.length) return;
    for (const p of poiData.pois) {
      const marker = L.marker([p.lat, p.lng], {
        icon: poiIcon(L, p.emoji, p.color, p.inRange, p.cooldownLeftMs),
        zIndexOffset: -200,
      });
      const cdLbl = p.cooldownLeftMs > 0
        ? ` · Cooldown ${Math.ceil(p.cooldownLeftMs / 60000)} min`
        : "";
      marker.bindTooltip(
        `${p.emoji} ${p.label}${p.name ? " — " + p.name : ""} · ${p.distanceM} m${cdLbl}`
      );
      marker.on("click", () => usePoi(p));
      poiLayerRef.current.addLayer(marker);
    }
  }, [poiData]);

  // Companion-Sprite anlegen, sobald VIBO geladen ist
  useEffect(() => {
    if (!mapRef.current || !pos || !vibo) return;
    const L = window.L;
    if (!L) return;
    // hatch-noch-nicht oder gestorben → keinen Companion
    if (!vibo.species || vibo.diedAt || vibo.stage === "egg") {
      if (companionMarkerRef.current) {
        try { companionMarkerRef.current.remove(); } catch {}
        companionMarkerRef.current = null;
      }
      return;
    }
    const speciesEmoji = {
      sprout: "🌱", kitsune: "🦊", drago: "🐉", knuddi: "🫧",
      stella: "⭐", maunzi: "🐱", boo: "👻", robi: "🤖",
    }[vibo.species] || "🐾";
    const { dLat, dLng } = offsetForCompanion(pos.lat);
    if (!companionMarkerRef.current) {
      companionMarkerRef.current = L.marker([pos.lat + dLat, pos.lng + dLng], {
        icon: companionIcon(L, speciesEmoji),
        zIndexOffset: 500,
      }).addTo(mapRef.current);
      companionMarkerRef.current.on("click", () => {
        setCompanionBubble(vibo.thought || `${vibo.name || "VIBO"}: Hi! 🐾`);
        setTimeout(() => setCompanionBubble(""), 4500);
      });
    } else {
      companionMarkerRef.current.setIcon(companionIcon(L, speciesEmoji));
    }
  }, [pos, vibo]);

  // In-App-Einverständnis laden
  useEffect(() => {
    api.locationConsentGet().then((r) => setConsent(r.value)).catch(() => setConsent(0));
  }, []);

  // Wenn beide Einverständnisse vorhanden (Server + Browser), sofort starten
  // — ohne nochmal auf „Karte freischalten" zu warten.
  useEffect(() => {
    if (consent !== 1 || perm !== "idle") return;
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    let cancelled = false;
    navigator.permissions.query({ name: "geolocation" }).then((p) => {
      if (cancelled) return;
      if (p.state === "granted") requestLocation();
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consent, perm]);

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Dein Browser unterstützt keine Geo-Lokation.");
      setPerm("denied");
      return;
    }
    // In-App-Einverständnis setzen, falls noch unbestimmt
    if (consent !== 1) {
      try {
        await api.locationConsent(1);
        setConsent(1);
      } catch {}
    }
    setPerm("requesting");
    navigator.geolocation.watchPosition(
      (p) => {
        setPerm("granted");
        const next = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
        setPos(next);
        // sofort Items aus dem Server holen
        loadItems(next);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPerm("denied");
        setError(err.message || "Standort nicht verfügbar.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15_000 }
    );
  }, [consent]);

  const loadItems = useCallback(async (p) => {
    if (!p) return;
    try {
      const r = await api.worldItems(p.lat, p.lng, p.acc);
      setItems(r.items || []);
    } catch (e) { setError(e.message); }
  }, []);

  // Periodisch neue Items polen
  useEffect(() => {
    if (perm !== "granted" || !pos) return;
    const t = setInterval(() => loadItems(pos), 30_000);
    return () => clearInterval(t);
  }, [perm, pos, loadItems]);

  // Wetter laden (alle 10 Min) — beeinflusst welche Wild-VIBOs auftauchen
  useEffect(() => {
    if (perm !== "granted" || !pos) return;
    let alive = true;
    const load = () => api.worldWeather(pos.lat, pos.lng).then((r) => { if (alive) setWeather(r.weather || null); }).catch(() => {});
    load();
    const t = setInterval(load, 10 * 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [perm, pos]);

  // Händler-Stände laden — beim ersten Map-Besuch wird die aktuelle Position als
  // „Zuhause"-Anker gesetzt. Danach periodisch neu, um Distanzen aktuell zu halten.
  useEffect(() => {
    if (perm !== "granted" || !pos) return;
    let alive = true;
    const load = () => api.market(pos.lat, pos.lng).then((r) => { if (alive) setMarket(r); }).catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, [perm, pos]);

  // POIs (Apotheke, Park, Hotel, …) im Umkreis laden
  useEffect(() => {
    if (perm !== "granted" || !pos) return;
    let alive = true;
    const load = () => api.poiNearby(pos.lat, pos.lng, 600)
      .then((r) => { if (alive) setPoiData(r); })
      .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [perm, pos]);

  // VIBO laden (für Companion-Sprite + Sprechblase) — alle 60s aktualisieren
  useEffect(() => {
    if (perm !== "granted") return;
    let alive = true;
    const load = () => api.viboGet().then((v) => { if (alive) setVibo(v); }).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [perm]);

  // Sprechblase wenn POI in Reichweite (alle 30s prüfen)
  useEffect(() => {
    if (!poiData?.pois?.length || !vibo || vibo.diedAt) return;
    const nearby = poiData.pois.find((p) => p.inRange && p.cooldownLeftMs === 0);
    if (!nearby) return;
    // Nur Hint zeigen, wenn der POI VIBO auch hilft
    let hint = null;
    if (nearby.kind === "pharmacy" && vibo.sick) hint = "💊 Geh schnell rein — die heilen mich!";
    else if (nearby.kind === "hospital" && vibo.sick) hint = "🏥 Hier kriegen wir jede Krankheit weg.";
    else if (nearby.kind === "veterinary") hint = "🐾 Voll-Check beim Tierarzt — top!";
    else if (nearby.kind === "park" && vibo.fun < 60) hint = "🌳 Spielen im Park! Bitteee!";
    else if (nearby.kind === "playground" && vibo.fun < 60) hint = "🎢 Spielplatz! Auf geht's!";
    else if (nearby.kind === "hotel" && vibo.health < 60) hint = "🏨 Bissi ausschlafen wäre schön…";
    else if (nearby.kind === "cafe" && vibo.hunger < 60) hint = "☕ Snack-Pause? 🥺";
    else if (nearby.kind === "fountain" && vibo.hunger < 80) hint = "💧 Durstig! Brunnen!";
    if (hint) {
      setCompanionBubble(hint);
      const t = setTimeout(() => setCompanionBubble(""), 5000);
      return () => clearTimeout(t);
    }
  }, [poiData, vibo]);

  async function usePoi(p) {
    if (!pos || poiBusy) return;
    if (p.cooldownLeftMs > 0) {
      const min = Math.ceil(p.cooldownLeftMs / 60000);
      const lbl = min >= 60 ? `${Math.ceil(min / 60)} h` : `${min} min`;
      setFlash(`⌛ ${p.label} erst in ${lbl} wieder.`);
      setTimeout(() => setFlash(""), 3000);
      return;
    }
    if (!p.inRange) {
      setFlash(`🚶 ${p.label} · noch ${Math.max(0, p.distanceM - (poiData.useRadiusM || 30))} m bis zur Reichweite`);
      setTimeout(() => setFlash(""), 3000);
      return;
    }
    setPoiBusy(true);
    try {
      const r = await api.poiUse(p.kind, p.osmId, pos.lat, pos.lng);
      setFlash(r.message || `${p.emoji} ${p.label} genutzt!`);
      setTimeout(() => setFlash(""), 4200);
      // POI-Liste + VIBO neu laden
      api.poiNearby(pos.lat, pos.lng, 600).then(setPoiData).catch(() => {});
      api.viboGet().then(setVibo).catch(() => {});
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 4000);
    } finally { setPoiBusy(false); }
  }

  const [fishing, setFishing] = useState(false);
  async function goFishing() {
    if (!pos || fishing) return;
    setFishing(true);
    setFlash("🎣 Auswerfen…");
    try {
      const r = await api.worldFish(pos.lat, pos.lng, pos.acc);
      const f = r.fish;
      setFlash(`${f.emoji} ${f.msg}${f.vibes ? ` (+${f.vibes} ✨)` : ""}${r.viboFed ? " · VIBO gefüttert 🍽️" : ""}`);
      setTimeout(() => setFlash(""), 4200);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 4200);
    } finally { setFishing(false); }
  }

  async function pickup(item) {
    if (!pos) return;
    try {
      const r = await api.worldPickup(item.id, pos.lat, pos.lng, pos.acc, weather?.favored);
      if (r.caught) {
        setFlash(r.caught.firstTime
          ? `🎉 NEU gefangen: ${r.caught.emoji} ${r.caught.name}! (+5 ✨)`
          : `🐾 ${r.caught.emoji} ${r.caught.name} gefangen (×${r.caught.count})`);
      } else {
        setFlash(`${r.emoji} ${r.name}! ${r.description || ""}`);
      }
      setTimeout(() => setFlash(""), 3800);
      // sofort neu laden, Item ist weg
      loadItems(pos);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 3500);
    }
  }

  if (perm === "idle") {
    if (consent === -1) {
      return (
        <div style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 50, marginBottom: 10 }}>🔒</div>
          <h3 style={{ marginTop: 0 }}>Standort ist ausgeschaltet</h3>
          <p style={{ color: "var(--vv-muted,#666)", fontSize: 13, maxWidth: 380, margin: "0 auto 12px" }}>
            Du hast den Standort in deinem Profil deaktiviert. Schalte ihn wieder ein,
            um die Karte, das Angeln und den Basar zu nutzen.
          </p>
          <Link href="/profile/edit" className="vv-btn vv-btn-pink" style={{ padding: "10px 18px" }}>
            ⚙️ Zu den Standort-Einstellungen
          </Link>
        </div>
      );
    }
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 10 }}>🗺️</div>
        <h2 style={{ marginTop: 0 }}>VibeVibo Realitätskarte</h2>
        <p style={{ color: "var(--vv-muted,#666)", lineHeight: 1.5, maxWidth: 460, margin: "0 auto" }}>
          Lauf durch die echte Welt, finde Items, sammle sie für dein VIBO + Vibes.
          Wir nutzen <strong>OpenStreetMap</strong> (kostenlos, kein Google), und
          dein Standort verlässt nie unseren Server.
        </p>
        <div style={{ background: "#fff5fb", border: "1px solid #ffd6e7", padding: 12, borderRadius: 10, marginTop: 16, maxWidth: 460, marginLeft: "auto", marginRight: "auto", fontSize: 12, color: "#7a0e3a", textAlign: "left" }}>
          <strong>Datenschutz:</strong> Wir speichern nur deinen letzten Standort
          (für Anti-Cheat beim Einsammeln). Andere User sehen dich NICHT.
          Du kannst die Erlaubnis jederzeit in deinem Profil oder im Browser widerrufen.
        </div>
        <button type="button" onClick={requestLocation}
          className="vv-btn-big vv-btn-big-pink"
          style={{ marginTop: 18, padding: "14px 28px", fontSize: 16 }}>
          📍 {consent === 1 ? "Karte starten" : "Karte freischalten"}
        </button>
      </div>
    );
  }

  if (perm === "denied") {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "var(--vv-muted,#666)" }}>
        <div style={{ fontSize: 50 }}>📵</div>
        Standort wurde abgelehnt.<br />
        In deinen Browser-Einstellungen kannst du es nachträglich freigeben.
        {error && <div style={{ marginTop: 8, fontSize: 12 }}>{error}</div>}
      </div>
    );
  }

  if (perm === "requesting" || !pos) {
    return (
      <div style={{ padding: 30, textAlign: "center" }}>
        <div style={{ fontSize: 50, animation: "vv-pulse 1.4s ease-in-out infinite" }}>📡</div>
        Standort wird ermittelt…
        <style>{`@keyframes vv-pulse {0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "calc(100dvh - 80px)" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {/* Wetter-Banner: beeinflusst welche Wild-VIBOs auftauchen */}
      {weather && (
        <div style={{
          position: "absolute", top: 12, left: 12, right: 12,
          background: "rgba(255,255,255,0.95)", borderRadius: 12,
          padding: "8px 12px", zIndex: 999, display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)", backdropFilter: "blur(8px)", color: "#1c1c1e",
        }}>
          <span style={{ fontSize: 26 }}>{weather.emoji}</span>
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{weather.label} · {weather.temp}°C</div>
            <div style={{ fontSize: 11, color: "#555" }}>{weather.note}</div>
          </div>
        </div>
      )}
      {flash && (
        <div style={{
          position: "absolute", top: weather ? 70 : 16, left: "50%", transform: "translateX(-50%)",
          background: flash.startsWith("⚠") ? "#fef3c7" : "#fff",
          color: flash.startsWith("⚠") ? "#92400e" : "#1c1c1e",
          padding: "10px 16px", borderRadius: 12,
          boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
          fontSize: 14, fontWeight: 700, zIndex: 1000,
          maxWidth: "90%", textAlign: "center",
        }}>{flash}</div>
      )}
      <div style={{
        position: "absolute", bottom: 16, left: 12, right: 12,
        background: "rgba(255,255,255,0.95)", borderRadius: 12,
        padding: "10px 14px", fontSize: 13,
        boxShadow: "0 -4px 16px rgba(0,0,0,0.15)",
        zIndex: 1000, textAlign: "center", color: "#1c1c1e",
        backdropFilter: "blur(10px)",
      }}>
        🎯 <strong>{items.length}</strong> Items in deiner Nähe ·
        komm bis auf <strong>30 m</strong> heran und tippe zum Einsammeln.
      </div>

      {/* 🎮 Action-Bar unten — Animal Crossing-Style mit 4 großen Buttons + Labels */}
      <div style={{
        position: "absolute", left: 8, right: 8, bottom: 8, zIndex: 1000,
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6,
        padding: 6, borderRadius: 16,
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 -4px 18px rgba(0,0,0,0.18)",
        backdropFilter: "blur(8px)",
      }}>
        <ActionBtn emoji="🏪" label="Basar" color="#15803d"
          badge={market?.week?.some((m) => m.inRange) ? "in Reichweite" : null}
          onClick={() => setMarketSheetOpen(true)} />
        <ActionBtn emoji="🎒" label="Rucksack" color="#b45309"
          onClick={() => setInvSheetOpen(true)} />
        <ActionBtn emoji="💊" label="Pflege" color="#be185d"
          badge={poiData?.pois?.some((p) => p.inRange && p.cooldownLeftMs === 0) ? "in Reichweite" : null}
          onClick={() => setPoiSheetOpen(true)} />
        <ActionBtn emoji="🎣" label="Angeln" color="#0369a1"
          disabled={fishing} onClick={goFishing} />
      </div>

      {/* Bottom-Sheet: Rucksack */}
      {invSheetOpen && (
        <div onClick={() => setInvSheetOpen(false)}
          style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 2000, display: "flex", alignItems: "flex-end",
          }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxHeight: "85%", overflowY: "auto",
              background: "var(--vv-card,#fff)", color: "var(--vv-text,#1c1c1e)",
              borderTopLeftRadius: 18, borderTopRightRadius: 18,
              boxShadow: "0 -8px 30px rgba(0,0,0,0.3)",
            }}>
            <div style={{ width: 44, height: 4, background: "#d4d4d8", borderRadius: 2, margin: "12px auto 6px" }} />
            <div style={{ display: "flex", alignItems: "center", padding: "0 14px 6px" }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>🎒 Rucksack</h3>
              <button type="button" onClick={() => setInvSheetOpen(false)}
                style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "inherit" }}>✕</button>
            </div>
            <WorldInventory />
          </div>
        </div>
      )}

      {/* Bottom-Sheet: Basar */}
      {marketSheetOpen && (
        <div onClick={() => setMarketSheetOpen(false)}
          style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 2000, display: "flex", alignItems: "flex-end",
          }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxHeight: "85%", overflowY: "auto",
              background: "var(--vv-card,#fff)", color: "var(--vv-text,#1c1c1e)",
              borderTopLeftRadius: 18, borderTopRightRadius: 18,
              boxShadow: "0 -8px 30px rgba(0,0,0,0.3)",
            }}>
            <div style={{ width: 44, height: 4, background: "#d4d4d8", borderRadius: 2, margin: "12px auto 6px" }} />
            <div style={{ display: "flex", alignItems: "center", padding: "0 14px 6px" }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>🏪 VIBO-Basar</h3>
              <button type="button" onClick={() => setMarketSheetOpen(false)}
                style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "inherit" }}>✕</button>
            </div>
            <MarketPanel />
          </div>
        </div>
      )}

      {/* Companion-Sprechblase */}
      {companionBubble && (
        <div style={{
          position: "absolute", bottom: 220, left: "50%", transform: "translateX(-50%)",
          background: "#fff", border: "2px solid #ec4899", borderRadius: 14,
          padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#1c1c1e",
          boxShadow: "0 6px 18px rgba(236,72,153,0.4)",
          zIndex: 1001, maxWidth: "85%", textAlign: "center",
        }}>
          🐾 {companionBubble}
        </div>
      )}

      {/* Bottom-Sheet: Pflege-Orte */}
      {poiSheetOpen && (
        <div onClick={() => setPoiSheetOpen(false)}
          style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
            zIndex: 2000, display: "flex", alignItems: "flex-end",
          }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxHeight: "75%", overflowY: "auto",
              background: "var(--vv-card,#fff)", color: "var(--vv-text,#1c1c1e)",
              borderTopLeftRadius: 18, borderTopRightRadius: 18,
              padding: 14, boxShadow: "0 -8px 30px rgba(0,0,0,0.3)",
            }}>
            <div style={{ width: 44, height: 4, background: "#d4d4d8", borderRadius: 2, margin: "0 auto 12px" }} />
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>💊 Pflege-Orte in der Nähe</h3>
              <button type="button" onClick={() => setPoiSheetOpen(false)}
                style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "inherit" }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: "var(--vv-muted,#666)", marginBottom: 10 }}>
              Lauf hin (≤ {poiData?.useRadiusM || 30} m) und tippe — VIBO bekommt einen Boost.
              Jede Kategorie hat einen Cooldown (kein Farmen).
            </div>
            {!poiData?.pois?.length ? (
              <div style={{ textAlign: "center", padding: 16, color: "var(--vv-muted,#666)", fontSize: 13 }}>
                Lade Pflege-Orte… (oder wir finden gerade keine im Umkreis)
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {poiData.pois.slice(0, 30).map((p) => {
                  const cd = p.cooldownLeftMs > 0;
                  const cdMin = Math.ceil(p.cooldownLeftMs / 60000);
                  const cdLbl = cdMin >= 60 ? `${Math.ceil(cdMin / 60)} h` : `${cdMin} min`;
                  return (
                    <button key={p.osmId} type="button" disabled={poiBusy}
                      onClick={() => usePoi(p)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: 10, borderRadius: 10, cursor: "pointer",
                        background: "var(--vv-surface,#f5f5f7)",
                        border: `2px solid ${p.inRange && !cd ? "#22c55e" : "var(--vv-border,#e5e7eb)"}`,
                        opacity: cd ? 0.6 : 1, fontFamily: "inherit", textAlign: "left",
                        color: "var(--vv-text,#1c1c1e)",
                      }}>
                      <span style={{ fontSize: 26 }}>{p.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>
                          {p.label}{p.name ? <span style={{ fontWeight: 500, color: "var(--vv-muted,#666)" }}> — {p.name}</span> : null}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--vv-muted,#666)" }}>{p.desc}</div>
                        <div style={{ fontSize: 11, color: "var(--vv-muted,#888)", marginTop: 2 }}>
                          📍 {p.distanceM} m · {p.inRange ? (cd ? `⌛ ${cdLbl}` : "✅ in Reichweite") : "🚶 zu weit"}
                          {cd && p.inRange ? "" : (cd ? ` · ⌛ ${cdLbl}` : "")}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ emoji, label, color, badge, disabled, onClick }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      style={{
        position: "relative",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "8px 4px", borderRadius: 12, border: "none",
        background: `linear-gradient(135deg, ${color}22, ${color}11)`,
        color: "#1c1c1e", fontFamily: "inherit", cursor: "pointer",
        opacity: disabled ? 0.6 : 1,
      }}>
      <span style={{ fontSize: 24, lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontSize: 11, fontWeight: 700, marginTop: 2, color }}>{label}</span>
      {badge && (
        <span style={{
          position: "absolute", top: 2, right: 4,
          background: "#22c55e", color: "#fff",
          fontSize: 8, fontWeight: 700,
          padding: "1px 4px", borderRadius: 999,
        }}>● {badge}</span>
      )}
    </button>
  );
}
