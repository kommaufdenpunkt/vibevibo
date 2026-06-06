"use client";

// 🎁 Geschenke-Shop — Jappy-Style komplett:
//  - Kategorie-Tabs · Suche · Empfänger-Autocomplete
//  - Verpackungs-Picker · persönliche Nachricht · Anonym
//  - Live-Vorschau · Total-Preis · Vibes-Sink (70/30)
//  - Direkt-Verschicken vom fremden Profil via ?to=username

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GIFTS, GIFT_CATEGORIES, WRAPPINGS, WRAPPING_MAP, findGift } from "@/lib/gifts";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import Avatar from "@/components/Avatar";
import { ColoredName } from "@/components/GenderAge";

const PINK = "#ec4899";

export default function GeschenkePageWrapper() {
  return (
    <Suspense fallback={<div className="vv-card">Lädt Geschenke-Shop…</div>}>
      <GeschenkePage />
    </Suspense>
  );
}

function GeschenkePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { me } = useMe();
  const [users, setUsers] = useState([]);
  const [target, setTarget] = useState("");
  const [targetSearch, setTargetSearch] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [cat, setCat] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedGift, setSelectedGift] = useState(null);
  const [wrap, setWrap] = useState("plain");
  const [note, setNote] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [visibility, setVisibility] = useState("public");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    api.listUsers().then((d) => {
      const list = (d.users || []).filter((u) => u.username !== me?.username);
      setUsers(list);
      // Pre-Select Empfänger aus ?to=username (z.B. vom fremden Profil)
      const pre = searchParams.get("to");
      if (pre && !target) {
        const u = list.find((x) => x.username.toLowerCase() === pre.toLowerCase());
        if (u) {
          setTarget(u.username);
          setTargetSearch(u.displayName || u.username);
        }
      }
    }).catch(() => {});
  }, [me, searchParams]);

  const filteredUsers = useMemo(() => {
    const q = targetSearch.trim().toLowerCase();
    if (!q) return users.slice(0, 8);
    return users.filter((u) =>
      (u.displayName || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q)
    ).slice(0, 8);
  }, [users, targetSearch]);

  const filteredGifts = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = GIFTS;
    if (cat === "popular") arr = GIFTS.filter((g) => g.price <= 10 || ["rose","heart","kiss","ring","cake","beer","champagne"].includes(g.id));
    else if (cat !== "all") arr = arr.filter((g) => g.cat === cat);
    if (q) arr = arr.filter((g) => g.name.toLowerCase().includes(q) || g.icon.includes(q));
    return arr;
  }, [cat, search]);

  const gift = selectedGift ? findGift(selectedGift) : null;
  const wrapData = WRAPPING_MAP[wrap] || WRAPPINGS[0];
  const total = (gift?.price || 0) + (wrapData.surcharge || 0);
  const recipient = users.find((u) => u.username === target);

  function pickRecipient(u) {
    setTarget(u.username);
    setTargetSearch(u.displayName || u.username);
    setSearchFocus(false);
  }

  async function send() {
    if (!me) { router.push("/login"); return; }
    if (!target) { setFlash("⚠ Bitte einen Empfänger wählen"); return; }
    if (!selectedGift) { setFlash("⚠ Bitte ein Geschenk auswählen"); return; }
    setBusy(true);
    try {
      await api.sendGift(target, selectedGift, note.slice(0, 300), visibility, wrap === "plain" ? "" : wrap);
      const g = findGift(selectedGift);
      setFlash(`✅ ${g.icon} ${g.name} an @${target} verschickt!`);
      setRecent((r) => [{ gift: g, target, at: Date.now(), note, wrap }, ...r].slice(0, 5));
      setSelectedGift(null);
      setNote("");
      setWrap("plain");
      setAnonymous(false);
      setTimeout(() => setFlash(""), 4000);
    } catch (e) {
      setFlash(`⚠ ${e.message}`);
      setTimeout(() => setFlash(""), 5000);
    } finally { setBusy(false); }
  }

  return (
    <div className="vv-gift-page">
      {/* ★ HERO ★ */}
      <div className="vv-gift-hero">
        <div className="vv-gift-hero-stars">
          <span>🎀</span><span>★</span><span>💝</span><span>♡</span>
          <span>🎁</span><span>★</span><span>✨</span><span>♥</span>
        </div>
        <div className="vv-gift-hero-emoji">🎁</div>
        <h1 className="vv-gift-hero-title">★ GESCHENKE-SHOP ★</h1>
        <div className="vv-gift-hero-sub">
          ✿ {GIFTS.length} virtuelle Geschenke · bleiben für immer in der Vitrine · Verpackung & persönliche Nachricht ✿
        </div>
      </div>

      {/* Flash */}
      {flash && (
        <div className="vv-gift-flash" data-tone={flash.startsWith("⚠") ? "warn" : "ok"}>{flash}</div>
      )}

      {/* === LAYOUT: links Auswahl, rechts Vorschau/Send === */}
      <div className="vv-gift-grid">
        <div className="vv-gift-col-left">

          {/* 1. Empfänger */}
          <div className="vv-gift-step" data-tone="pink">
            <div className="vv-gift-step-title">① 👤 Empfänger wählen</div>
            <div className="vv-gift-step-body">
              <div className="vv-gift-recipient-search">
                <input
                  type="text"
                  className="vv-gift-input"
                  placeholder="🔍 Name oder @username suchen…"
                  value={targetSearch}
                  onChange={(e) => { setTargetSearch(e.target.value); setSearchFocus(true); setTarget(""); }}
                  onFocus={() => setSearchFocus(true)}
                  onBlur={() => setTimeout(() => setSearchFocus(false), 200)}
                />
                {searchFocus && filteredUsers.length > 0 && (
                  <div className="vv-gift-recipient-dropdown">
                    {filteredUsers.map((u) => (
                      <button key={u.username} type="button" onClick={() => pickRecipient(u)}
                        className="vv-gift-recipient-row">
                        <Avatar url={u.avatarUrl} name={u.displayName} className="vv-avatar vv-avatar-sm" />
                        <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                          <span style={{ display: "block", fontSize: 13, fontWeight: 700 }}>
                            <ColoredName gender={u.gender} age={u.age} name={u.displayName} />
                          </span>
                          <span style={{ display: "block", fontSize: 10.5, opacity: 0.7 }}>@{u.username}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {recipient && (
                <div className="vv-gift-recipient-chip">
                  <Avatar url={recipient.avatarUrl} name={recipient.displayName} className="vv-avatar vv-avatar-sm" />
                  <span style={{ flex: 1 }}>
                    <ColoredName gender={recipient.gender} age={recipient.age} name={recipient.displayName} />
                  </span>
                  <button type="button" onClick={() => { setTarget(""); setTargetSearch(""); }}>×</button>
                </div>
              )}
            </div>
          </div>

          {/* 2. Geschenk-Auswahl */}
          <div className="vv-gift-step" data-tone="violet">
            <div className="vv-gift-step-title">② 🎁 Geschenk aussuchen</div>
            <div className="vv-gift-step-body">
              <input
                type="text"
                className="vv-gift-input"
                placeholder="🔍 Geschenk suchen (z.B. Rose, Bier, Teddy)…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginBottom: 8 }}
              />

              {/* Kategorie-Tabs */}
              <div className="vv-gift-cat-row">
                <button type="button" onClick={() => setCat("all")}
                  className={`vv-gift-cat${cat === "all" ? " active" : ""}`}>
                  📋 Alle ({GIFTS.length})
                </button>
                <button type="button" onClick={() => setCat("popular")}
                  className={`vv-gift-cat${cat === "popular" ? " active" : ""}`}>
                  🔥 Beliebt
                </button>
                {GIFT_CATEGORIES.map((c) => (
                  <button key={c.id} type="button" onClick={() => setCat(c.id)}
                    className={`vv-gift-cat${cat === c.id ? " active" : ""}`}>
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Geschenk-Grid */}
              <div className="vv-gift-grid-list">
                {filteredGifts.map((g) => (
                  <button key={g.id} type="button"
                    onClick={() => setSelectedGift(g.id)}
                    className={`vv-gift-tile${selectedGift === g.id ? " selected" : ""}`}
                    title={`${g.name} · ${g.price} ✨`}>
                    <span className="vv-gift-tile-icon">{g.icon}</span>
                    <span className="vv-gift-tile-name">{g.name}</span>
                    <span className="vv-gift-tile-price">✨ {g.price}</span>
                  </button>
                ))}
                {filteredGifts.length === 0 && (
                  <div className="vv-gift-empty">Nichts gefunden — andere Kategorie?</div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Verpackung */}
          {gift && (
            <div className="vv-gift-step" data-tone="gold">
              <div className="vv-gift-step-title">③ 🎀 Verpackung wählen</div>
              <div className="vv-gift-step-body">
                <div className="vv-gift-wrap-row">
                  {WRAPPINGS.map((w) => (
                    <button key={w.id} type="button" onClick={() => setWrap(w.id)}
                      className={`vv-gift-wrap${wrap === w.id ? " selected" : ""}`}
                      style={{ background: w.bg }}>
                      <span style={{ fontSize: 24 }}>{w.emoji || "📦"}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 800 }}>{w.label}</span>
                      <span style={{ fontSize: 10, opacity: 0.85 }}>+{w.surcharge} ✨</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. Nachricht + Optionen */}
          {gift && (
            <div className="vv-gift-step" data-tone="cyan">
              <div className="vv-gift-step-title">④ ✏ Nachricht & Optionen</div>
              <div className="vv-gift-step-body">
                <label className="vv-gift-label">💌 Persönliche Nachricht (max 300)</label>
                <textarea
                  className="vv-gift-input vv-gift-textarea"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 300))}
                  placeholder="Schreib was Süßes dazu… 🌸"
                  rows={3}
                />
                <div className="vv-gift-counter">{note.length} / 300</div>

                <div className="vv-gift-toggles">
                  <label className={`vv-gift-toggle${visibility === "private" ? " active" : ""}`}>
                    <input type="checkbox" checked={visibility === "private"}
                      onChange={(e) => setVisibility(e.target.checked ? "private" : "public")} />
                    🔒 Privat (nur Empfänger sieht's)
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RECHTS: Vorschau + Total + Send */}
        <div className="vv-gift-col-right">
          <div className="vv-gift-preview" style={{ background: wrapData.bg || "linear-gradient(135deg,#fce7f3,#fbcfe8)" }}>
            <div className="vv-gift-preview-title">👁 VORSCHAU</div>
            {gift ? (
              <>
                <div className="vv-gift-preview-icon">
                  {wrapData.id !== "plain" && (
                    <span style={{ position: "absolute", top: -6, right: -6, fontSize: 28 }}>{wrapData.emoji}</span>
                  )}
                  <span style={{ fontSize: 80, lineHeight: 1 }}>{gift.icon}</span>
                </div>
                <div className="vv-gift-preview-name">{gift.name}</div>
                {recipient && (
                  <div className="vv-gift-preview-target">
                    an <Link href={`/u/${recipient.username}`} style={{ color: "inherit", fontWeight: 800 }}>
                      {recipient.displayName}
                    </Link>
                  </div>
                )}
                {note && (
                  <div className="vv-gift-preview-note">„{note}"</div>
                )}
                <div className="vv-gift-preview-total">
                  <span>Gesamt:</span>
                  <strong>✨ {total}</strong>
                </div>
                <div className="vv-gift-preview-sub">
                  ({gift.price} Geschenk{wrapData.surcharge ? ` + ${wrapData.surcharge} Verpackung` : ""})
                </div>
                <button type="button" onClick={send} disabled={busy || !target}
                  className="vv-gift-send">
                  {busy ? "Verschickt…" : `🎀 ${total} ✨ verschenken`}
                </button>
                <div className="vv-gift-payout-hint">
                  Empfänger bekommt 70% zurück · 30% verschwinden (Anti-Inflation)
                </div>
              </>
            ) : (
              <div className="vv-gift-preview-empty">
                <div style={{ fontSize: 60, opacity: 0.4 }}>🎁</div>
                <div>Wähl ein Geschenk aus,<br/>dann erscheint die Vorschau hier.</div>
              </div>
            )}
          </div>

          {/* Recent — last sent in this session */}
          {recent.length > 0 && (
            <div className="vv-gift-recent">
              <div className="vv-gift-recent-title">📜 Zuletzt verschickt</div>
              {recent.map((r, i) => (
                <div key={i} className="vv-gift-recent-row">
                  <span style={{ fontSize: 20 }}>{r.gift.icon}</span>
                  <span style={{ flex: 1, fontSize: 12 }}>
                    <b>{r.gift.name}</b> an @{r.target}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="vv-gift-footer">
        <span>★</span>
        <span>{GIFTS.length} Geschenke · {GIFT_CATEGORIES.length} Kategorien · 6 Verpackungen · landet für immer in der Vitrine ✿</span>
        <span>★</span>
      </div>
    </div>
  );
}
