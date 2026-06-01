"use client";

import { useState } from "react";
import { GIFTS, findGift } from "@/lib/gifts";
import { relTime } from "@/lib/format";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";

export default function GiftShelf({ profile, gifts, onChange }) {
  const { me } = useMe();
  const [showPicker, setShowPicker] = useState(false);
  const [toast, setToast] = useState(null);

  async function pick(giftId) {
    if (!me) { alert("Bitte einloggen."); return; }
    if (me.username === profile.username) { alert("Du kannst dir nicht selbst was schenken 😄"); return; }
    try {
      await api.sendGift(profile.username, giftId);
      const g = findGift(giftId);
      setToast(`${g.icon} ${g.name} an ${profile.displayName} verschickt!`);
      setShowPicker(false);
      onChange?.();
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="vv-card">
      <h3>🎁 Geschenke-Vitrine</h3>
      {gifts.length === 0 ? (
        <div className="vv-muted vv-center" style={{ padding: "14px 0" }}>
          Noch keine Geschenke. Sei der/die Erste!
        </div>
      ) : (
        <div className="vv-gift-grid">
          {gifts.map((g) => {
            const def = findGift(g.gift_id);
            if (!def) return null;
            return (
              <div className="vv-gift" key={g.id} title={`von ${g.from_display_name} · ${relTime(g.at)}`}>
                <span className="vv-gift-icon">{def.icon}</span>
                <span className="vv-gift-name">{def.name}</span>
                <span className="vv-gift-from">von {g.from_display_name}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="vv-row vv-mt-12">
        <div className="vv-spacer" />
        <button type="button" className="vv-btn vv-btn-pink" onClick={() => setShowPicker((s) => !s)}>
          🎀 Geschenk schicken
        </button>
      </div>

      {showPicker && (
        <div className="vv-mt-12">
          <div className="vv-muted">Wähle ein Geschenk:</div>
          <div className="vv-gift-grid vv-mt-8">
            {GIFTS.map((g) => (
              <div key={g.id} className="vv-gift" onClick={() => pick(g.id)} title={`${g.name} (${g.price} Coins)`}>
                <span className="vv-gift-icon">{g.icon}</span>
                <span className="vv-gift-name">{g.name}</span>
                <span className="vv-gift-from">{g.price} ♥</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && <div className="vv-toast">{toast}</div>}
    </div>
  );
}
