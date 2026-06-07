"use client";

// ✨ Onboarding-Modal — Fidolin führt neue User durch 3 Quick-Steps.
// Trigger: bei /profile, wenn localStorage Flag `vv-onboarded-{userId}` fehlt.
// Idee: User soll in 60 Sek auf der Plattform aktiv sein statt verloren wirken.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useMe } from "@/lib/useMe";

const EMOJIS = ["🙂","😎","🌸","🛹","👑","🎮","💅","🎧","🦄","🌈","🔥","🌟","💖","🎀","🍀","⚡","🦋","☕"];

const NEXT_STEPS = [
  { emoji: "📌", title: "Pinnwand entdecken", desc: "Fidolin hat dir schon was gepostet", href: (u) => `/u/${u}` },
  { emoji: "🎁", title: "Geschenk verschicken", desc: "Rose, Bier, Glücksklee — wie früher", href: () => "/geschenke" },
  { emoji: "📣", title: "Buschfunk lesen", desc: "Schau wer was schreibt", href: () => "/messenger?tab=vibo" },
  { emoji: "📷", title: "Fotos hochladen", desc: "Foto-Alben starten", href: () => "/fotos" },
];

export default function OnboardingModal({ user, onClose }) {
  const router = useRouter();
  const { refresh } = useMe();
  const [step, setStep] = useState(1);
  const [emoji, setEmoji] = useState(user?.emoji || "🙂");
  const [aboutMe, setAboutMe] = useState("");
  const [busy, setBusy] = useState(false);

  function markDone() {
    try { localStorage.setItem(`vv-onboarded-${user.id}`, String(Date.now())); } catch {}
  }

  function dismiss() {
    markDone();
    onClose?.();
  }

  async function saveAndNext() {
    setBusy(true);
    try {
      const patch = { emoji };
      if (aboutMe.trim()) patch.aboutMe = aboutMe.trim().slice(0, 400);
      await api.updateMe(user.username, patch);
      await refresh();
    } catch {}
    finally { setBusy(false); }
    setStep(3);
  }

  function jumpTo(href) {
    markDone();
    onClose?.();
    router.push(typeof href === "function" ? href(user.username) : href);
  }

  const name = user?.displayName || user?.username || "du";

  return (
    <div className="vv-onb-backdrop" onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <div className="vv-onb-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="vv-onb-close" onClick={dismiss} aria-label="Schließen">×</button>

        <div className="vv-onb-progress">
          <span className={step >= 1 ? "active" : ""} />
          <span className={step >= 2 ? "active" : ""} />
          <span className={step >= 3 ? "active" : ""} />
        </div>

        {step === 1 && (
          <>
            <div className="vv-onb-fidolin"><span>🤖</span></div>
            <h2 className="vv-onb-title">Heyhey {name}! 💖</h2>
            <p className="vv-onb-text">
              Ich bin <strong>Fidolin</strong> — die KI-Begleitung hier bei VibeVibo.
              Schön dass du da bist! Lass uns dein Profil in <strong>60 Sek</strong> einrichten,
              dann bist du startklar.
            </p>
            <div className="vv-onb-actions">
              <button type="button" className="vv-onb-btn vv-onb-btn-primary" onClick={() => setStep(2)}>
                ▶ Los geht's
              </button>
              <button type="button" className="vv-onb-btn vv-onb-btn-ghost" onClick={dismiss}>
                Überspringen
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="vv-onb-title">✨ Schmück dein Profil</h2>
            <p className="vv-onb-text-s">Wähl dein Avatar-Emoji & schreib was über dich:</p>

            <label className="vv-onb-label">😎 Avatar-Emoji</label>
            <div className="vv-onb-emoji-row">
              {EMOJIS.map((e) => (
                <button key={e} type="button"
                  className={`vv-onb-emoji${emoji === e ? " active" : ""}`}
                  onClick={() => setEmoji(e)}
                  aria-label={e}>{e}</button>
              ))}
            </div>

            <label className="vv-onb-label">✏ Über dich (optional, max. 200)</label>
            <textarea
              className="vv-onb-input"
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value.slice(0, 200))}
              placeholder="z.B. Hör Tokio Hotel auf Repeat & such alte Schulfreunde aus Köln 🌸"
              rows={3}
              maxLength={200}
            />
            <div className="vv-onb-counter">{aboutMe.length}/200</div>

            <div className="vv-onb-actions">
              <button type="button" className="vv-onb-btn vv-onb-btn-primary" onClick={saveAndNext} disabled={busy}>
                {busy ? "..." : "✓ Speichern & weiter"}
              </button>
              <button type="button" className="vv-onb-btn vv-onb-btn-ghost" onClick={() => setStep(3)}>
                später →
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="vv-onb-celebrate"><span>🎉</span></div>
            <h2 className="vv-onb-title">Du bist drin!</h2>
            <p className="vv-onb-text-s">
              Such dir aus wo's losgehen soll:
            </p>
            <div className="vv-onb-tour">
              {NEXT_STEPS.map((s) => (
                <button key={s.title} type="button"
                  className="vv-onb-tour-card"
                  onClick={() => jumpTo(s.href)}>
                  <span className="vv-onb-tour-emoji">{s.emoji}</span>
                  <span className="vv-onb-tour-text">
                    <strong>{s.title}</strong>
                    <span>{s.desc}</span>
                  </span>
                  <span className="vv-onb-tour-arrow">→</span>
                </button>
              ))}
            </div>
            <div className="vv-onb-actions">
              <button type="button" className="vv-onb-btn vv-onb-btn-primary" onClick={dismiss}>
                💖 Erstmal hier bleiben
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
