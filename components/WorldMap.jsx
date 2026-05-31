"use client";

// VibeVibo Realitätskarte. Leaflet wird per CDN geladen — kein npm-Build-Impact.
// OpenStreetMap-Tiles (gratis). Nur DEIN Standort wird angezeigt, niemand sonst.

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { ITEMS } from "@/lib/world";

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

export default function WorldMap({ onPickup }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const meMarkerRef = useRef(null);
  const itemsLayerRef = useRef(null);
  const radiusCircleRef = useRef(null);

  const [perm, setPerm] = useState("idle"); // idle | requesting | granted | denied
  const [pos, setPos] = useState(null);
  const [items, setItems] = useState([]);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");

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
      mapRef.current = map;
    })();
    return () => { cancelled = true; };
  }, [pos]);

  // Position aktualisieren auf Karte
  useEffect(() => {
    if (!pos || !mapRef.current) return;
    const L = window.L;
    if (!L) return;
    meMarkerRef.current?.setLatLng([pos.lat, pos.lng]);
    radiusCircleRef.current?.setLatLng([pos.lat, pos.lng]);
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

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Dein Browser unterstützt keine Geo-Lokation.");
      setPerm("denied");
      return;
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
  }, []);

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

  async function pickup(item) {
    if (!pos) return;
    try {
      const r = await api.worldPickup(item.id, pos.lat, pos.lng, pos.acc);
      setFlash(`${r.emoji} ${r.name}! ${r.description || ""}`);
      setTimeout(() => setFlash(""), 3500);
      // sofort neu laden, Item ist weg
      loadItems(pos);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 3500);
    }
  }

  if (perm === "idle") {
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
          Du kannst die Erlaubnis jederzeit im Browser widerrufen.
        </div>
        <button type="button" onClick={requestLocation}
          className="vv-btn-big vv-btn-big-pink"
          style={{ marginTop: 18, padding: "14px 28px", fontSize: 16 }}>
          📍 Karte freischalten
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
      {flash && (
        <div style={{
          position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
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
    </div>
  );
}
