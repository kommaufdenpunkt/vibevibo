"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GIFTS, findGift } from "@/lib/gifts";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";

export default function GeschenkePage() {
  const router = useRouter();
  const { me } = useMe();
  const [users, setUsers] = useState([]);
  const [target, setTarget] = useState("");
  const [selectedGift, setSelectedGift] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.listUsers().then((d) => setUsers(d.users.filter((u) => u.username !== me?.username))).catch(() => {});
  }, [me]);

  async function send() {
    if (!me) { router.push("/login"); return; }
    if (!target) { alert("Bitte einen Empfänger wählen."); return; }
    if (!selectedGift) { alert("Bitte ein Geschenk auswählen."); return; }
    try {
      await api.sendGift(target, selectedGift);
      const g = findGift(selectedGift);
      setToast(`${g.icon} ${g.name} an @${target} verschickt!`);
      setSelectedGift(null);
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="vv-card">
      <h2>🎁 Geschenke-Shop</h2>
      <p className="vv-muted">
        Verschick deinen Freunden virtuelle Geschenke - landen direkt in deren Vitrine. ♥
      </p>

      <div className="vv-grid-2">
        <div>
          <h3>1. Empfänger wählen</h3>
          <select className="vv-input" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">— Wähle eine/n Freund/in —</option>
            {users.map((u) => (
              <option key={u.username} value={u.username}>
                {u.emoji} {u.displayName} (@{u.username})
              </option>
            ))}
          </select>

          <h3 className="vv-mt-12">2. Geschenk aussuchen</h3>
          <div className="vv-gift-grid">
            {GIFTS.map((g) => (
              <div
                key={g.id}
                className="vv-gift"
                style={selectedGift === g.id ? { outline: "3px solid #ff3e9d", transform: "scale(1.06)" } : null}
                onClick={() => setSelectedGift(g.id)}
              >
                <span className="vv-gift-icon">{g.icon}</span>
                <span className="vv-gift-name">{g.name}</span>
                <span className="vv-gift-from">{g.price} ♥</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3>3. Abschicken</h3>
          <div className="vv-card" style={{ background: "#fff7d6", textAlign: "center" }}>
            {selectedGift ? (
              <>
                <div style={{ fontSize: 72, lineHeight: 1 }}>{findGift(selectedGift)?.icon}</div>
                <div><strong>{findGift(selectedGift)?.name}</strong></div>
                <div className="vv-muted">{findGift(selectedGift)?.price} ♥</div>
              </>
            ) : <div className="vv-muted">Noch nichts ausgewählt.</div>}
            <div className="vv-mt-12">
              {target ? <div>An: <strong>@{target}</strong></div> : <div className="vv-muted">Kein Empfänger gewählt.</div>}
            </div>
            <button type="button" className="vv-btn vv-btn-pink vv-mt-12" onClick={send}>🎀 Jetzt verschenken</button>
            {!me && (
              <div className="vv-muted vv-mt-8">
                Du bist nicht eingeloggt - <Link href="/login">einloggen</Link>.
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <div className="vv-toast">{toast}</div>}
    </div>
  );
}
