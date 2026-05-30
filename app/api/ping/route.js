import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { autoApproveStalePics, purgeOldFailedLogins } from "@/lib/db";

// Leichter Heartbeat-Endpoint: getSessionUser ruft intern touchUser auf,
// hält damit den last_seen / Online-Status aktuell.
// Trittbrettfahrer: räumt im Hintergrund alte pending-Profilbilder (30 Min)
// und uralte Failed-Logins (>7 Tage) auf.
let _lastSweepAt = 0;
export async function POST() {
  const user = await getSessionUser();
  const now = Date.now();
  if (now - _lastSweepAt > 5 * 60_000) {
    _lastSweepAt = now;
    try {
      autoApproveStalePics(30 * 60_000); // Pending-Profilbilder älter als 30 Min freigeben
      purgeOldFailedLogins(7 * 24 * 3600_000);
    } catch {}
  }
  return NextResponse.json({ online: !!user });
}
