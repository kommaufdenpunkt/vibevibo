"use client";

// 🌟 Top-5-Freunde — MySpace „Top 8"-Nostalgie. 5 Slots, pin/unpin auf eigenem Profil.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ColoredName } from "./GenderAge";
import OnlineName from "./OnlineName";

export default function TopFriends({ username, isOwner = false }) {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [pinUsername, setPinUsername] = useState("");
  const [pinSlot, setPinSlot] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { setData(await api.topFriends(username)); } catch {}
  }, [username]);
  useEffect(() => { load(); }, [load]);

  if (!data) return null;

  const slots = Array.from({ length: data.max }, (_, i) => {
    const s = i + 1;
    return data.friends.find((f) => f.slot === s) || { slot: s, empty: true };
  });

  async function pin() {
    setBusy(true); setErr("");
    try {
      await api.topFriendsPin(pinUsername.trim(), Number(pinSlot));
      setPinUsername("");
      await load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }
  async function unpin(slot) {
    setBusy(true);
    try { await api.topFriendsUnpin(slot); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="vv-card">
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>🌟 Top-5-Buddies</h3>
        {isOwner && (
          <button type="button" onClick={() => setEditing((v) => !v)}
            style={{ marginLeft: "auto", background: "none", border: "none",
              color: "#ec4899", cursor: "pointer", fontFamily: "inherit", fontSize: 12,
              textDecoration: "underline" }}>
            {editing ? "fertig" : "bearbeiten"}
          </button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
        {slots.map((s) => {
          if (s.empty) {
            return (
              <div key={s.slot} style={{
                aspectRatio: "1", border: "2px dashed var(--vv-border,#e5e7eb)",
                borderRadius: 10, display: "flex", alignItems: "center",
                justifyContent: "center", color: "var(--vv-muted,#aaa)", fontSize: 22,
              }}>{isOwner ? "+" : "·"}</div>
            );
          }
          return (
            <div key={s.slot} style={{ position: "relative" }}>
              <Link href={`/u/${s.username}`} style={{ textDecoration: "none" }}>
                <div style={{
                  aspectRatio: "1", border: "2px solid var(--vv-border,#e5e7eb)",
                  borderRadius: 10, overflow: "hidden", background: "#fafafa",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                }}>
                  {s.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.avatarUrl} alt="" style={{ width: "100%", height: "70%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ fontSize: 26 }}>👤</div>
                  )}
                  <div style={{ fontSize: 10, fontWeight: 700, textAlign: "center",
                    padding: "2px 3px", width: "100%", lineHeight: 1.1,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <OnlineName lastSeen={s.lastSeen}>
                      <ColoredName gender={s.gender} age={s.age} name={s.displayName} />
                    </OnlineName>
                  </div>
                </div>
              </Link>
              {editing && isOwner && (
                <button type="button" disabled={busy} onClick={() => unpin(s.slot)}
                  style={{ position: "absolute", top: -6, right: -6,
                    width: 22, height: 22, borderRadius: "50%", border: "none",
                    background: "#ef4444", color: "#fff", cursor: "pointer",
                    fontSize: 12, fontFamily: "inherit", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>×</button>
              )}
            </div>
          );
        })}
      </div>

      {editing && isOwner && (
        <div style={{ marginTop: 10, padding: 10, background: "var(--vv-surface,#f5f5f7)", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "var(--vv-muted,#666)", marginBottom: 6 }}>
            Username eintragen + Slot wählen:
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input className="vv-input" placeholder="@username"
              value={pinUsername} onChange={(e) => setPinUsername(e.target.value)}
              style={{ flex: 1, fontSize: 13 }} maxLength={20} />
            <select value={pinSlot} onChange={(e) => setPinSlot(e.target.value)}
              className="vv-input" style={{ width: 60, fontSize: 13 }}>
              {[1,2,3,4,5].map((n) => <option key={n} value={n}>#{n}</option>)}
            </select>
            <button type="button" disabled={busy || !pinUsername.trim()}
              onClick={pin} className="vv-btn vv-btn-pink" style={{ fontSize: 13 }}>
              Pinnen
            </button>
          </div>
          {err && <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>⚠ {err}</div>}
        </div>
      )}
    </div>
  );
}
