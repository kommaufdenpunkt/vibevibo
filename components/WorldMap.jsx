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

    // CSS einbinden (idempotent)
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    // Script einbinden (idempotent)
    let script = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = LEAFLET_JS;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => resolve(true));
    script.addEventListener("error", () => resolve(false));

    // Robuster Fallback: alle 150ms pruefen ob L da ist (loose race conditions abfangen).
    // Aufgrund Browser-Caching kann der "load"-Event verpasst werden, wenn das Script schon
    // beim ersten Render geladen wurde - das Polling fängt das ab.
    let tries = 0;
    const poll = setInterval(() => {
      if (window.L) { clearInterval(poll); resolve(true); }
      else if (++tries > 40) { clearInterval(poll); resolve(false); } // 6 Sek Timeout
    }, 150);
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

function merchantIcon(L, emoji, name, inRange) {
  const border = inRange ? "#22c55e" : "#f59e0b";
  const ring   = inRange ? "0 0 0 6px rgba(34,197,94,0.25)" : "0 0 0 4px rgba(245,158,11,0.18)";
  const safeName = String(name || "").replace(/[<>&"]/g, (c) => ({ "<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;" }[c]));
  return L.divIcon({
    className: "vv-merchant-icon",
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;pointer-events:none;">
        <div style="
          width:52px;height:52px;border-radius:50%;
          background:#fff;border:3px solid ${border};
          box-shadow:${ring}, 0 5px 16px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;font-size:26px;
          ${inRange ? "animation:vv-pop 1.6s ease-in-out infinite;" : ""}
          pointer-events:auto;
        ">${emoji}</div>
        <div style="
          margin-top:4px; padding:3px 8px;
          background:${inRange ? "linear-gradient(135deg,#22c55e,#16a34a)" : "rgba(255,255,255,0.95)"};
          color:${inRange ? "#fff" : "#1c1c1e"};
          font-family:Arial,sans-serif; font-size:11px; font-weight:800;
          border-radius:999px; border:1px solid ${border};
          box-shadow:0 2px 6px rgba(0,0,0,0.25);
          white-space:nowrap; line-height:1;
          pointer-events:auto;
        ">🏪 ${safeName}</div>
      </div>
      <style>@keyframes vv-pop {0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}</style>`,
    iconSize: [120, 76],
    iconAnchor: [60, 26],
  });
}

// Inhalts-HTML für das Leaflet-Popup eines Verkäufers (Basar).
function merchantPopupHtml(m, sellRadiusM) {
  const safe = (s) => String(s || "").replace(/[<>&"]/g, (c) => ({ "<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;" }[c]));
  const dist = m.distanceM != null ? `${m.distanceM} m` : "unbekannt";
  const inR  = m.inRange;
  const slot = m.slotLabel ? ` · 📅 ${safe(m.slotLabel)}` : "";
  const mult = m.mult ? `<span style="opacity:0.85">×${Number(m.mult).toFixed(2)} Preis-Multiplikator</span>` : "";
  const status = inR
    ? `<span style="color:#16a34a;font-weight:800">✅ in Reichweite</span>`
    : `<span style="color:#b45309;font-weight:800">📍 ${Math.max(0, (m.distanceM ?? 0) - (sellRadiusM || 30))} m noch laufen</span>`;
  return `
    <div style="font-family:Arial,sans-serif;min-width:200px;max-width:260px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <div style="font-size:28px">${safe(m.emoji)}</div>
        <div style="font-weight:800;font-size:15px;color:#1c1c1e">${safe(m.name)}</div>
      </div>
      <div style="font-size:12px;color:#4b5563;font-style:italic;margin-bottom:6px">
        „${safe(m.blurb || "Händler im VIBO-Basar.")}"
      </div>
      <div style="font-size:12px;color:#1c1c1e;margin-bottom:8px;line-height:1.5">
        ${status}<br>
        ${dist} entfernt${slot}<br>
        ${mult}
      </div>
      <button type="button" data-vv-merchant="${safe(m.id)}" ${inR ? "" : "disabled"}
        style="
          width:100%;padding:9px 12px;border:none;border-radius:10px;
          background:${inR ? "linear-gradient(135deg,#ec4899,#be185d)" : "#e5e5e7"};
          color:${inR ? "#fff" : "#9ca3af"};
          font-weight:800;font-size:13px;cursor:${inR ? "pointer" : "not-allowed"};
          font-family:inherit;
        ">
        🛒 ${inR ? "Verkaufen" : "Erst näher rangehen"}
      </button>
    </div>`;
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

export default function WorldMap({ onPickup, compact = false, height }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const meMarkerRef = useRef(null);
  const itemsLayerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const merchantsLayerRef = useRef(null);
  const homeMarkerRef = useRef(null);
  const poiLayerRef = useRef(null);
  const watersLayerRef = useRef(null);
  const companionMarkerRef = useRef(null);

  const [perm, setPerm] = useState("idle"); // idle | requesting | granted | denied
  const [consent, setConsent] = useState(null); // null=lädt, 1=ja, -1=nein, 0=unbestimmt
  const [pos, setPos] = useState(null);
  // Live-Referenz auf pos fuer Closures (Klick-Handler), die nach Mount-Zeit feuern.
  const posRef = useRef(null);
  useEffect(() => { posRef.current = pos; }, [pos]);
  const [items, setItems] = useState([]);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");
  const [weather, setWeather] = useState(null);
  const [market, setMarket] = useState(null);
  const [poiData, setPoiData] = useState(null); // { pois, useRadiusM, kinds }
  const [waters, setWaters] = useState([]); // [{ id, kind, name, lat, lng, radiusM }]
  const [vibo, setVibo] = useState(null);
  const [poiSheetOpen, setPoiSheetOpen] = useState(false);
  const [poiBusy, setPoiBusy] = useState(false);
  const [companionBubble, setCompanionBubble] = useState("");
  const [invSheetOpen, setInvSheetOpen] = useState(false);
  const [marketSheetOpen, setMarketSheetOpen] = useState(false);

  // Leaflet + Karte initialisieren wenn Position da
  const tileLayerRef = useRef(null);
  const [tileStyle, setTileStyle] = useState(() => {
    if (typeof window === "undefined") return "esri_streets";
    // Migration v3: Wir wechseln den Default-Provider auf Esri-Street-Map.
    // Esri-Tiles laufen auf ArcGIS-Online-CDN (US-Govt-Backbone) — extrem zuverlaessig,
    // Strassennamen + Gebaeude direkt im Tile, weltweit verfuegbar.
    // Wer schon mal bewusst gewechselt hat (v3-Marker), behaelt seine Wahl.
    const saved = window.localStorage?.getItem("vv-tile-style");
    const v3 = window.localStorage?.getItem("vv-tile-style-v3");
    if (saved && v3 && TILE_PROVIDERS_KEYS.has(saved)) return saved;
    try { window.localStorage?.setItem("vv-tile-style-v3", "1"); } catch {}
    return "esri_streets";
  });
  // Lade-Status der Karten-Tiles: "idle" | "loading" | "ok" | "fallback" | "failed"
  const [tileStatus, setTileStatus] = useState("idle");
  const [tileMsg, setTileMsg] = useState("Karte wird geladen…");

  // Esri ArcGIS World Street Map: rock-solid CDN (US-Govt/Behoerden-Niveau),
  // Strassennamen + Gebaeude direkt im Tile gerendert, keine Subdomain-Roulette.
  // Das ist die Primary, alle anderen sind Backup.
  const TILE_PROVIDERS = {
    esri_streets: {
      label: "Strassen", emoji: "🗺",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      opts: { attribution: '© Esri', maxZoom: 19, crossOrigin: true },
    },
    esri_topo: {
      label: "Topo", emoji: "⛰",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      opts: { attribution: '© Esri', maxZoom: 19, crossOrigin: true },
    },
    osmde: {
      label: "OSM Deutschland", emoji: "🇩🇪",
      url: "https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png",
      opts: { attribution: '© OpenStreetMap Deutschland', subdomains: "abc", maxZoom: 19, crossOrigin: true },
    },
    osm: {
      label: "OSM Standard", emoji: "🌍",
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      opts: { attribution: '© OpenStreetMap', maxZoom: 19, crossOrigin: true },
    },
    esri_imagery: {
      label: "Satellit", emoji: "🛰",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      opts: { attribution: '© Esri', maxZoom: 19, crossOrigin: true },
    },
  };
  const TILE_PROVIDERS_KEYS = new Set(["esri_streets","esri_topo","osmde","osm","esri_imagery"]);
  // Auto-Fallback-Reihenfolge: Esri zuerst, dann OSM-Varianten als Backup.
  const FALLBACK_ORDER = ["esri_streets", "osmde", "osm", "esri_topo"];

  function buildTileLayer(L, style) {
    const p = TILE_PROVIDERS[style] || TILE_PROVIDERS.voyager;
    const errorTile = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Crect width='256' height='256' fill='%23f5f5f7'/%3E%3C/svg%3E";
    return L.tileLayer(p.url, { ...p.opts, errorTileUrl: errorTile });
  }

  // Stil-Wechsel zur Laufzeit: alten Layer abloesen, neuen drueber legen.
  // Mit Tile-Fehler-Erkennung + Auto-Fallback: wenn der primäre Provider
  // zu viele Tile-Errors innerhalb der ersten 4 Sek liefert, schaltet wir
  // automatisch auf den nächsten in FALLBACK_ORDER um.
  const labelLayerRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  useEffect(() => {
    if (!mapRef.current) return;
    const L = window.L;
    if (!L) return;
    if (tileLayerRef.current) {
      try { tileLayerRef.current.remove(); } catch {}
    }
    if (labelLayerRef.current) {
      try { labelLayerRef.current.remove(); } catch {}
      labelLayerRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    const provider = TILE_PROVIDERS[tileStyle] || TILE_PROVIDERS.voyager;
    setTileStatus("loading");
    setTileMsg(`Lade ${provider.label}…`);

    const layer = buildTileLayer(L, tileStyle);
    let errorCount = 0;
    let firstTileOk = false;

    layer.on("tileload", () => {
      if (!firstTileOk) {
        firstTileOk = true;
        setTileStatus("ok");
        setTileMsg("");
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
      }
    });
    layer.on("tileerror", () => {
      errorCount += 1;
      // Wenn schon viele Errors UND noch kein Tile erfolgreich → sofort fallback
      if (errorCount >= 4 && !firstTileOk) {
        autoFallback();
      }
    });

    function autoFallback() {
      const idx = FALLBACK_ORDER.indexOf(tileStyle);
      const nextStyle = idx >= 0 && idx < FALLBACK_ORDER.length - 1
        ? FALLBACK_ORDER[idx + 1]
        : null;
      if (nextStyle) {
        setTileStatus("fallback");
        setTileMsg(`${provider.label} antwortet nicht — wechsle zu ${TILE_PROVIDERS[nextStyle].label}…`);
        setTimeout(() => setTileStyle(nextStyle), 600);
      } else {
        setTileStatus("failed");
        setTileMsg("⚠ Karten-Tiles können nicht geladen werden — bitte Internet/Adblocker prüfen oder oben rechts einen anderen Stil wählen.");
      }
    }

    // 5-Sek-Watchdog: wenn nach 5 Sek noch KEIN tile geladen → fallback
    fallbackTimerRef.current = setTimeout(() => {
      if (!firstTileOk) autoFallback();
    }, 5000);

    tileLayerRef.current = layer.addTo(mapRef.current);
    // Voyager + Positron haben dezente Labels — wir legen das CartoDB-Labels-Overlay
    // drueber, damit Strassennamen klar lesbar sind.
    if (provider.labels) {
      labelLayerRef.current = L.tileLayer(
        `https://cartodb-basemaps-{s}.global.ssl.fastly.net/${provider.labels}/{z}/{x}/{y}.png`,
        { subdomains: "abcd", maxZoom: 19, pane: "shadowPane" }
      ).addTo(mapRef.current);
    }
    try { window.localStorage?.setItem("vv-tile-style", tileStyle); } catch {}

    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [tileStyle]);

  useEffect(() => {
    if (!pos || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const ok = await loadLeaflet();
      if (!ok || cancelled || !containerRef.current) return;
      const L = window.L;
      const map = L.map(containerRef.current, { zoomControl: true })
        .setView([pos.lat, pos.lng], 17);
      // Primaerer Tile-Layer: CartoDB Voyager (free CDN, sehr stabil, pastell-Look).
      // User kann oben rechts auf "🗺 Stil" tappen um zu wechseln.
      // OSM-direkter Endpoint blockt seit ~2024 viele User-Agents + rate-limited heftig.
      tileLayerRef.current = buildTileLayer(L, tileStyle).addTo(map);
      meMarkerRef.current = L.marker([pos.lat, pos.lng], { icon: meIcon(L) }).addTo(map);
      radiusCircleRef.current = L.circle([pos.lat, pos.lng], {
        radius: 30, color: "#3b82f6", weight: 1, fillOpacity: 0.08,
      }).addTo(map);
      itemsLayerRef.current = L.layerGroup().addTo(map);
      merchantsLayerRef.current = L.layerGroup().addTo(map);
      poiLayerRef.current = L.layerGroup().addTo(map);
      watersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      // Kontainer-Groesse erneut messen — wenn die Karte in einem Tab oder versteckten
      // Container geladen wird, hat Leaflet die Dimensionen oft noch nicht.
      // Nach kurzem Delay + bei Resize-Events neu berechnen, sonst bleibt's grau.
      const recalcSize = () => { try { map.invalidateSize(); } catch {} };
      setTimeout(recalcSize, 50);
      setTimeout(recalcSize, 250);
      setTimeout(recalcSize, 800);
      window.addEventListener("resize", recalcSize);
      // Cleanup-Listener im teardown unten (siehe return-Funktion)
      mapRef.current._vvResizeHandler = recalcSize;
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
    const sellR = market.sellRadiusM || 30;
    for (const m of (market.week || [])) {
      const marker = L.marker([m.lat, m.lng], { icon: merchantIcon(L, m.emoji, m.name, m.inRange) });
      marker.bindPopup(merchantPopupHtml(m, sellR), {
        maxWidth: 280, autoClose: true, closeButton: true, className: "vv-merchant-popup",
      });
      marker.on("popupopen", (e) => {
        // Verkaufen-Button im Popup an React-State binden
        const root = e.popup.getElement();
        const btn = root?.querySelector?.(`button[data-vv-merchant="${m.id}"]`);
        if (btn && m.inRange) {
          btn.addEventListener("click", () => {
            marker.closePopup();
            setMarketSheetOpen(true);
          }, { once: true });
        }
      });
      merchantsLayerRef.current.addLayer(marker);
    }
  }, [market]);

  // Wasser-Zonen zeichnen — Kreise so gross wie das Gewaesser, mit 🎣-Icon im Zentrum.
  // Klick auf Zone -> wenn in Reichweite (= im Kreis), Angeln triggern. Sonst Hinweis.
  useEffect(() => {
    if (!mapRef.current || !watersLayerRef.current) return;
    const L = window.L;
    if (!L) return;
    watersLayerRef.current.clearLayers();
    if (!waters.length) return;

    function distM(lat1, lng1, lat2, lng2) {
      const R = 6371000;
      const toRad = (d) => (d * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Klick-Handler wird live ausgewertet (nutzt posRef, NICHT die Closure-pos),
    // damit eine Bewegung nach Render-Zeit erkannt wird.
    function handleWaterClick(w) {
      const p = posRef.current;
      if (!p) {
        setFlash("📍 Standort wird noch ermittelt…");
        setTimeout(() => setFlash(""), 2500);
        return;
      }
      const d = distM(p.lat, p.lng, w.lat, w.lng);
      const insideZone = d <= w.radiusM; // strikt: kein Bonus
      if (!insideZone) {
        const m = Math.ceil(d - w.radiusM);
        setFlash(`🎣 ${w.name} · komm noch ${m} m näher`);
        setTimeout(() => setFlash(""), 3500);
        return;
      }
      goFishing(w); // dem Server das angeklickte Gewaesser mitgeben
    }

    for (const w of waters) {
      // initialer Zustand fuer die Optik (Animation/Farbe)
      const inZone = pos ? distM(pos.lat, pos.lng, w.lat, w.lng) <= w.radiusM : false;

      // Wasser-Kreis (echte Grösse) — Klick auf Kreis öffnet Angel-Action
      const circle = L.circle([w.lat, w.lng], {
        radius: w.radiusM,
        color: inZone ? "#0369a1" : "#0ea5e9",
        weight: 2,
        fillColor: "#bae6fd",
        fillOpacity: inZone ? 0.35 : 0.18,
        interactive: true,
      });
      circle.on("click", () => handleWaterClick(w));
      watersLayerRef.current.addLayer(circle);

      // Angel-Icon im Zentrum, Groesse skaliert mit Radius
      const iconPx = Math.min(64, Math.max(32, Math.round(w.radiusM / 4)));
      const icon = L.divIcon({
        className: "vv-water-icon",
        html: `<div style="
          width:${iconPx}px;height:${iconPx}px;border-radius:50%;
          background:${inZone ? "linear-gradient(135deg,#0369a1,#075985)" : "rgba(255,255,255,0.9)"};
          border:3px solid ${inZone ? "#fff" : "#0369a1"};
          box-shadow:0 4px 12px rgba(2,132,199,0.4);
          display:flex;align-items:center;justify-content:center;
          font-size:${Math.round(iconPx * 0.55)}px;
          ${inZone ? "animation:vv-pop 1.4s ease-in-out infinite;" : ""}
          cursor:pointer;
          color:${inZone ? "#fff" : "#0369a1"};
        ">🎣</div>
        <style>@keyframes vv-pop {0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}</style>`,
        iconSize: [iconPx, iconPx],
        iconAnchor: [iconPx / 2, iconPx / 2],
      });
      const marker = L.marker([w.lat, w.lng], { icon, interactive: true });
      marker.bindTooltip(`🎣 ${w.name} (~${w.radiusM} m)${inZone ? " · in Reichweite" : " · zu weit weg"}`);
      marker.on("click", () => handleWaterClick(w));
      watersLayerRef.current.addLayer(marker);
    }
  }, [waters, pos]);

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

  // Gewaesser (Seen, Teiche, Fluesse) im Umkreis laden — alle 5 Min
  useEffect(() => {
    if (perm !== "granted" || !pos) return;
    let alive = true;
    const load = () => api.worldWaters(pos.lat, pos.lng, 800)
      .then((r) => { if (alive) setWaters(r.waters || []); })
      .catch(() => {});
    load();
    const t = setInterval(load, 5 * 60_000);
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
  // water (optional): { lat, lng, radiusM, name } - das angeklickte Gewaesser.
  // Wenn mitgegeben, prueft der Server zusaetzlich ob der User wirklich
  // INNERHALB dieses Gewaessers steht (nicht nur "irgendwo Wasser nah").
  async function goFishing(water) {
    const p = posRef.current || pos;
    if (!p || fishing) return;
    setFishing(true);
    setFlash("🎣 Auswerfen…");
    try {
      const r = await api.worldFish(p.lat, p.lng, p.acc, water);
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
    <div style={{
      position: "relative", width: "100%",
      height: height || (compact ? "420px" : "calc(100dvh - 80px)"),
      borderRadius: compact ? 14 : 0,
      overflow: "hidden",
    }}>
      <div ref={containerRef} style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, #e8e8ed 0%, #d8d8df 100%)",
      }} />

      {/* Lade-/Status-Overlay: deckt das weiße Loch ab solange noch nichts da ist */}
      {(tileStatus === "loading" || tileStatus === "fallback" || tileStatus === "failed") && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 500,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: tileStatus === "failed"
            ? "linear-gradient(135deg, #fef2f2, #fee2e2)"
            : "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
          pointerEvents: "none",
        }}>
          <div style={{
            background: "rgba(255,255,255,0.97)", padding: "16px 22px",
            borderRadius: 14, boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
            maxWidth: "82%", textAlign: "center", pointerEvents: "auto",
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>
              {tileStatus === "failed" ? "🗺️💔" : tileStatus === "fallback" ? "🔄" : "🗺️"}
            </div>
            <div style={{ fontSize: 13, color: "#1c1c1e", fontWeight: 700 }}>
              {tileMsg}
            </div>
            {tileStatus === "failed" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                <button type="button" onClick={() => setTileStyle("osm")}
                  style={{
                    padding: "8px 14px", borderRadius: 8, border: "none",
                    background: "#ec4899", color: "#fff", fontWeight: 700, cursor: "pointer",
                    fontSize: 12,
                  }}>
                  🌍 OSM Standard erzwingen
                </button>
                <button type="button" onClick={async () => {
                  // Karten-Komplettreset: localStorage + Service-Worker-Caches + Reload.
                  // Notausgang wenn alles haengt (z.B. wegen Adblocker oder verklemmtem SW-Cache).
                  try { localStorage.removeItem("vv-tile-style"); localStorage.removeItem("vv-tile-style-v3"); } catch {}
                  try {
                    if ("caches" in window) {
                      const keys = await caches.keys();
                      await Promise.all(keys.map((k) => caches.delete(k)));
                    }
                    if ("serviceWorker" in navigator) {
                      const regs = await navigator.serviceWorker.getRegistrations();
                      for (const r of regs) { try { await r.unregister(); } catch {} }
                    }
                  } catch {}
                  location.reload();
                }}
                  style={{
                    padding: "8px 14px", borderRadius: 8, border: "1px solid #b91c1c",
                    background: "#fff", color: "#b91c1c", fontWeight: 700, cursor: "pointer",
                    fontSize: 12,
                  }}>
                  🧹 Karte + Cache zurücksetzen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tile-Style-Picker entfernt — User wollte saubere Karte ohne UI-Symbole.
          Standard ist OSM Deutschland (gesetzt via tileStyle-State Default). */}

      {/* Wetter — kompakte Pille oben links neben dem Zoom-Control */}
      {weather && (
        <div title={`${weather.label} · ${weather.note}`}
          style={{
            position: "absolute", top: 12, left: 70, zIndex: 999,
            background: "rgba(255,255,255,0.95)", borderRadius: 999,
            padding: "5px 12px",
            display: "inline-flex", alignItems: "center", gap: 6,
            boxShadow: "0 2px 10px rgba(0,0,0,0.18)", backdropFilter: "blur(6px)",
            color: "#1c1c1e", fontSize: 13, fontWeight: 700,
          }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>{weather.emoji}</span>
          <span>{weather.temp}°C</span>
        </div>
      )}

      {/* Flash-Toast — zentriert oben */}
      {flash && (
        <div style={{
          position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
          background: flash.startsWith("⚠") ? "#fef3c7" : "#fff",
          color: flash.startsWith("⚠") ? "#92400e" : "#1c1c1e",
          padding: "10px 16px", borderRadius: 12,
          boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
          fontSize: 14, fontWeight: 700, zIndex: 1001,
          maxWidth: "90%", textAlign: "center",
        }}>{flash}</div>
      )}

      {/* Item-Zaehler — kleine Pille unten links */}
      {items.length > 0 && (
        <div style={{
          position: "absolute", bottom: 16, left: 12, zIndex: 999,
          background: "rgba(255,255,255,0.95)", borderRadius: 999,
          padding: "5px 12px", fontSize: 13, fontWeight: 700,
          boxShadow: "0 2px 10px rgba(0,0,0,0.18)", backdropFilter: "blur(6px)",
          color: "#1c1c1e",
        }}>
          🎯 {items.length} in der Nähe
        </div>
      )}

      {/* Action-Bar: schwebende Icon-Buttons unten rechts.
          🏪 Basar wurde entfernt — Haendler-Marker liegen direkt auf der Karte.
          Klick auf einen Haendler oeffnet Popup -> "Verkaufen" oeffnet das Basar-Sheet. */}
      <div style={{
        position: "absolute", right: 12, bottom: 16, zIndex: 1000,
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <ActionBtn emoji="🏪" title="Alle 3 Händler zeigen" color="#15803d"
          badge={(market?.week?.length || 0) > 0 ? market.week.length : null}
          badgeColor="#16a34a"
          onClick={() => {
            if (!mapRef.current || !market?.week?.length) return;
            const L = window.L;
            if (!L) return;
            const points = market.week.map((m) => [m.lat, m.lng]);
            if (pos) points.push([pos.lat, pos.lng]);
            try {
              mapRef.current.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 17 });
            } catch {}
          }} />
        <ActionBtn emoji="🎒" title="Rucksack" color="#b45309"
          badge={(() => {
            const n = market?.items?.length || 0;
            return n > 0 ? n : null;
          })()}
          badgeColor="#b45309"
          onClick={() => setInvSheetOpen(true)} />
        <ActionBtn emoji="💊" title="Pflege" color="#be185d"
          badge={(() => {
            const n = (poiData?.pois || []).filter((p) => p.inRange && p.cooldownLeftMs === 0).length;
            return n > 0 ? n : null;
          })()}
          badgeColor="#be185d"
          onClick={() => setPoiSheetOpen(true)} />
        {/* 🎣 Floating-Button entfernt — Angel-Marker liegen direkt auf den Gewaessern */}
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

function ActionBtn({ emoji, title, color, badge, badgeColor, disabled, onClick }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} title={title}
      aria-label={title}
      style={{
        position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 52, height: 52, borderRadius: "50%", border: "none",
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        color: "#fff", fontFamily: "inherit", cursor: "pointer",
        opacity: disabled ? 0.5 : 1,
        boxShadow: "0 4px 14px rgba(0,0,0,0.28), 0 0 0 3px rgba(255,255,255,0.95)",
        transition: "transform 0.12s",
      }}>
      <span style={{ fontSize: 26, lineHeight: 1 }}>{emoji}</span>
      {badge != null && (
        <span style={{
          position: "absolute", top: -4, right: -4,
          background: badgeColor || "#22c55e", color: "#fff",
          fontSize: 11, fontWeight: 800,
          minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          border: "2px solid #fff",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          lineHeight: 1,
        }}>{badge}</span>
      )}
    </button>
  );
}
