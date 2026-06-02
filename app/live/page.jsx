"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";
import { ColoredName } from "@/components/GenderAge";
import OnlineName from "@/components/OnlineName";
import PremiumBadges from "@/components/PremiumBadges";
import LiveSetup from "@/components/LiveSetup";
import HelpCard from "@/components/HelpCard";
import InstallNow from "@/components/InstallNow";

function timeAgo(ms) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  return `${Math.floor(m / 60)}h ${m % 60}min`;
}

export default function LivePage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [streams, setStreams] = useState([]);
  const [setupOpen, setSetupOpen] = useState(false);

  const load = useCallback(() => api.liveList().then((r) => setStreams(r.streams || [])).catch(() => {}), []);
  useEffect(() => { load(); const t = setInterval(load, 15_000); return () => clearInterval(t); }, [load]);

  if (loading) return null;
  if (!me) return (
    <div className="vv-card" style={{ textAlign: "center", padding: 30 }}>
      <h2>🎥 Live</h2>
      <p>Login nötig.</p>
      <Link href="/login" className="vv-btn-big vv-btn-big-pink">Zum Login</Link>
    </div>
  );

  return (
    <div>
      <div className="vv-card" style={{
        background: "linear-gradient(135deg, #fce7f3, #f5d0fe)",
        border: "1px solid #ec4899",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 36 }}>🎥</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Live!</h2>
            <div style={{ fontSize: 12, color: "#831843" }}>
              Solo oder Multi-Couch — Video, Audio, Emotes fliegen ✨
            </div>
          </div>
          <button type="button" onClick={() => setSetupOpen(true)}
            className="vv-btn-big vv-btn-big-pink" style={{ padding: "10px 16px", fontSize: 14 }}>
            🔴 Live gehen
          </button>
        </div>
      </div>

      <InstallNow appName="VV Live" appEmoji="🎥" appColor="#ec4899" />

      <HelpCard id="live-viewer-rules" title="Spielregeln im Live" emoji="📋" color="#0ea5e9">
        <b>Sei nett, sei fair.</b> Beleidigungen, Hate-Speech und Spam → 🛡-Tap im Chat
        → Owner oder Mod kann muten, kicken, bannen.
        <br/><br/>
        <b>Etwas Unangemessenes gesehen?</b> Tap auf das 🚩-Symbol im Stream — Reports landen
        sofort bei den Admins und werden manuell geprüft.
        <br/><br/>
        <b>Was zählt als Verstoß:</b> Nackte Tatsachen, sexuelle Handlungen, Minderjährige in
        unpassender Form, Drogen, Gewalt, Hass. <i>BH/Slip im sportlichen Kontext gilt nicht.</i>
        <br/><br/>
        <b>Emotes</b> sind kostenpflichtig (Vibes-Sink). 70% gehen an die Hosts.
      </HelpCard>

      <div className="vv-card">
        <h3 style={{ margin: "0 0 10px" }}>🔴 Gerade live ({streams.length})</h3>
        {streams.length === 0 ? (
          <div className="vv-muted vv-center" style={{ padding: 20, fontSize: 13 }}>
            Niemand live. Sei der/die Erste! 🎙
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {streams.map((s) => (
              <Link key={s.id} href={`/live/${s.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  border: "2px solid #ec4899", borderRadius: 12, overflow: "hidden",
                  background: "var(--vv-card,#fff)", cursor: "pointer", color: "var(--vv-text,#1c1c1e)",
                }}>
                  <div style={{
                    aspectRatio: "16/9",
                    background: s.owner.avatarUrl
                      ? `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.55)), url(${s.owner.avatarUrl}) center/cover`
                      : "linear-gradient(135deg,#831843,#ec4899)",
                    position: "relative", color: "#fff",
                    display: "flex", alignItems: "flex-end", padding: 8,
                  }}>
                    <div style={{
                      position: "absolute", top: 6, left: 6,
                      background: "#ef4444", color: "#fff", padding: "2px 8px",
                      borderRadius: 4, fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                    }}>🔴 LIVE</div>
                    <div style={{
                      position: "absolute", top: 6, right: 6,
                      background: "rgba(0,0,0,0.55)", padding: "2px 7px",
                      borderRadius: 999, fontSize: 11, fontWeight: 700,
                    }}>👁 {s.viewerCount}</div>
                    <div style={{
                      position: "absolute", bottom: 6, right: 6,
                      background: "rgba(0,0,0,0.55)", padding: "2px 7px",
                      borderRadius: 999, fontSize: 10,
                    }}>{s.mode === "multi" ? `🛋 ${s.hostCount}/${s.maxHosts}` : "🎙 Solo"}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2, textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>
                      {s.title}
                    </div>
                  </div>
                  <div style={{ padding: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                      <OnlineName lastSeen={s.owner.lastSeen}>
                        <ColoredName gender={s.owner.gender} age={s.owner.age} name={s.owner.displayName} />
                      </OnlineName>
                      <PremiumBadges badges={s.owner.premiumBadges} size={12} />
                    </div>
                    <div style={{ fontSize: 10, color: "var(--vv-muted,#888)", marginTop: 2 }}>
                      seit {timeAgo(s.startedAt)} {!s.hasVideo && "· 🎧 Audio only"}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {setupOpen && (
        <LiveSetup onClose={() => setSetupOpen(false)}
          onCreated={(id) => { setSetupOpen(false); router.push(`/live/${id}`); }} />
      )}
    </div>
  );
}
