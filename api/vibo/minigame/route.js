import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { awardCredits, buffVibo, tickAndPersistVibo } from "@/lib/db";

const ROUND_MS = 30_000;
const MAX_SCORE_PER_ROUND = 30;       // physikalisch realistisches Max
const VIBES_PER_ROUND_CAP = 10;       // max 10 Vibes pro Runde

// POST { score, durationMs, started, ended }
// Server validiert: nicht zu kurz, nicht zu viele Treffer pro Sekunde.
export async function POST(req) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  // Ei-Phase aktuell deaktiviert (lib/vibo.js EGG_HATCH_HOURS=0). Falls
  // jemand sie wieder einschaltet, blockt der Check wie vorher.
  const v = tickAndPersistVibo(me.id);

  const score = Math.max(0, Math.min(MAX_SCORE_PER_ROUND, Number(body?.score) || 0));
  const dur = Math.max(0, Number(body?.durationMs) || 0);

  // Anti-Cheat: Runde muss mindestens 20s gedauert haben
  if (dur < ROUND_MS * 0.66) {
    return NextResponse.json({ error: "Runde war zu kurz, versuch's nochmal." }, { status: 400 });
  }
  // Max 1 Treffer / 0.8s (sonst Bot-Verdacht)
  const maxPlausible = Math.floor(dur / 800);
  const realScore = Math.min(score, maxPlausible);

  // Vibes-Belohnung: score/3, gedeckelt auf 10
  const reward = Math.min(VIBES_PER_ROUND_CAP, Math.floor(realScore / 3));

  let credit = { amount: 0, balance: 0 };
  if (reward > 0) {
    credit = awardCredits(me.id, reward, "vibo_minigame", { type: "minigame", id: Date.now() });
  }

  // Bonus: dem VIBO Fun + Hunger geben (es hat ja gegessen)
  try {
    if (v && !v.died_at) {
      buffVibo(me.id, { fun: Math.min(10, realScore), hunger: Math.min(15, realScore) });
    }
  } catch {}

  return NextResponse.json({
    ok: true,
    score: realScore,
    reward,
    balance: credit.balance,
    blocked: credit.blocked || null,
  });
}
