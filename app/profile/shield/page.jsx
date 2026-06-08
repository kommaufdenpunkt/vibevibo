"use client";

import { useEffect, useState } from "react";
import { useMe } from "@/lib/useMe";
import { useRouter } from "next/navigation";

export default function ShieldPage() {
  const router = useRouter();
  const { me, loading } = useMe();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(function () { if (!loading && !me) router.push("/login"); }, [loading, me, router]);
  useEffect(function () {
    if (!me) return;
    fetch("/api/me/shield").then(function (r) { return r.json(); }).then(setS).catch(function () {});
  }, [me]);

  async function save(next) {
    setBusy(true);
    try {
      const r = await fetch("/api/me/shield", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const d = await r.json();
      setS(d);
      setFlash("✓ gespeichert");
      setTimeout(function () { setFlash(""); }, 2000);
    } catch (e) { setFlash("⚠ Fehler"); }
    finally { setBusy(false); }
  }

  if (!s) return <div className="vv-card">Laedt...</div>;

  return (
    <div className="vv-shield-page">
      <div className="vv-card vv-shield-hero">
        <div style={{ fontSize: 40, textAlign: "center" }}>🛡</div>
        <h1 style={{ textAlign: "center", margin: "8px 0" }}>Schutz-Modus</h1>
        <div style={{ textAlign: "center", fontSize: 13, opacity: 0.85, marginBottom: 12 }}>
          Schutz vor unerwuenschten Nachrichten, Belaestigung und Anmachen.
          Du entscheidest wer dich kontaktieren darf.
        </div>
        <label className="vv-shield-toggle">
          <input type="checkbox" checked={!!s.enabled} disabled={busy}
            onChange={function (e) { save(Object.assign({}, s, { enabled: e.target.checked })); }} />
          <span><b>Schutz aktivieren</b> {s.enabled ? <span style={{color:"#16a34a"}}>● AN</span> : <span style={{opacity:0.6}}>○ AUS</span>}</span>
        </label>
      </div>

      {s.enabled && (
        <>
          <div className="vv-card">
            <h3>Wer darf mir Nachrichten/Komplimente/Gruschels schicken?</h3>
            {[
              ["all", "Alle (kein Filter)"],
              ["friends", "Nur Freunde"],
              ["women", "Nur Frauen"],
              ["none", "Niemand (komplett still)"]
            ].map(function (opt) {
              return (
                <label key={opt[0]} className="vv-shield-radio">
                  <input type="radio" name="policy" value={opt[0]} checked={s.msgPolicy === opt[0]} disabled={busy}
                    onChange={function () { save(Object.assign({}, s, { msgPolicy: opt[0] })); }} />
                  <span>{opt[1]}</span>
                </label>
              );
            })}
          </div>

          <div className="vv-card">
            <h3>Cooldown fuer neue Mitglieder</h3>
            <p style={{ fontSize: 13, opacity: 0.85 }}>
              User, die weniger als X Tage Mitglied sind, koennen dir nicht schreiben.
              Schuetzt vor Wegwerf-Accounts.
            </p>
            <div className="vv-shield-cooldown">
              {[0, 3, 7, 14, 30].map(function (d) {
                return (
                  <button key={d} type="button" disabled={busy}
                    className={"vv-btn" + (s.minAgeDays === d ? " vv-shield-active" : "")}
                    onClick={function () { save(Object.assign({}, s, { minAgeDays: d })); }}>
                    {d === 0 ? "Aus" : d + " Tage"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="vv-card">
            <h3>Wort-Filter (Quarantaene)</h3>
            <label className="vv-shield-toggle">
              <input type="checkbox" checked={!!s.wordFilter} disabled={busy}
                onChange={function (e) { save(Object.assign({}, s, { wordFilter: e.target.checked })); }} />
              <span>Nachrichten mit problematischen Begriffen landen in Quarantaene-Inbox</span>
            </label>
            <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
              Du entscheidest selbst, ob du sie lesen oder direkt loeschen willst.
            </p>
          </div>
        </>
      )}

      {flash && <div className="vv-card" style={{ textAlign: "center", color: "#16a34a", fontWeight: 800 }}>{flash}</div>}
    </div>
  );
}
