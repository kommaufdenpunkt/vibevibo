import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { autoApproveStalePics, purgeOldFailedLogins, listVibosNeedingBrief, markBriefSent } from "@/lib/db";
import { maybeScanForFarming } from "@/lib/vibesAi";
import { sendPushToUser } from "@/lib/push";

// Leichter Heartbeat-Endpoint + Hintergrund-Sweep.
let _lastSweepAt = 0;
let _lastBriefAt = 0;

export async function POST() {
  const user = await getSessionUser();
  const now = Date.now();

  if (now - _lastSweepAt > 5 * 60_000) {
    _lastSweepAt = now;
    try {
      autoApproveStalePics(30 * 60_000);
      purgeOldFailedLogins(7 * 24 * 3600_000);
      maybeScanForFarming();
    } catch {}
  }

  // Vibo-Brief: nur einmal pro Stunde scannen (genug)
  if (now - _lastBriefAt > 60 * 60_000) {
    _lastBriefAt = now;
    try {
      for (const v of listVibosNeedingBrief()) {
        const msgs = [
          `🥺 Mir geht's nicht so gut, hast du mich vergessen?`,
          `🍔 Ich hab ganz schön Hunger! Schau mal bei mir vorbei.`,
          `💧 Bitte kümmer dich um mich – ich vermisse dich!`,
          `🌧 Ohne dich wird's traurig hier…`,
        ];
        const body = msgs[Math.floor(Math.random() * msgs.length)];
        sendPushToUser(v.userId, {
          title: `${v.name} (dein VIBO)`,
          body,
          url: "/messenger?tab=vibo",
          tag: `vv-vibo-brief-${v.userId}`,
          fromUserId: 0,
          kind: "vibo-brief",
        }).catch(() => {});
        markBriefSent(v.userId);
      }
    } catch {}
  }

  return NextResponse.json({ online: !!user });
}
