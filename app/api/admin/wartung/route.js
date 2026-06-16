import { NextResponse } from "next/server";
import { isAdminRequest, adminEnabled } from "@/lib/admin";
import {
  dbIntegrityCheck, dbStats, expiredSessionCount, countOrphanPhotos,
  countOrphanGroupMembers, countPermabans, getAttackStats,
  listRecentAttacks, listPermabans, listMaintenanceLog,
} from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — laufe alle READ-ONLY-Checks und gib Health-Report zurück
export async function GET(req) {
  if (!adminEnabled()) return NextResponse.json({ error: "admin disabled" }, { status: 503 });
  if (!isAdminRequest(req)) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const t0 = Date.now();

  // System
  const integrity = dbIntegrityCheck();
  const stats = dbStats();
  const expiredSessions = expiredSessionCount();
  const orphanPhotos = countOrphanPhotos();
  const orphanGroupMembers = countOrphanGroupMembers();

  // Sicherheit
  const permabanCount = countPermabans();
  const attackStats24h = getAttackStats({ sinceMs: Date.now() - 86400_000 });
  const attackStats7d = getAttackStats({ sinceMs: Date.now() - 7 * 86400_000 });
  const recentAttacks = listRecentAttacks({ limit: 20 });
  const recentPermabans = listPermabans({ limit: 20 });

  // ENV-Status (verrät keine Werte, nur ob gesetzt)
  const envStatus = checkEnvVars();

  // Maintenance-Log
  const maintenanceLog = listMaintenanceLog({ limit: 20 });

  const durationMs = Date.now() - t0;

  return NextResponse.json({
    durationMs,
    system: {
      integrity,
      stats,
      expiredSessions,
      orphanPhotos,
      orphanGroupMembers,
    },
    security: {
      permabanCount,
      attackStats24h,
      attackStats7d,
      recentAttacks,
      recentPermabans,
    },
    env: envStatus,
    maintenanceLog,
  });
}

function checkEnvVars() {
  const critical = [
    "VV_ADMIN_PASSWORD",
    "VV_TOKEN_KEY",
    "VV_INTERNAL_TOKEN",
  ];
  const optional = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "GEMINI_API_KEY",
    "VAPID_PRIVATE_KEY",
    "GOOGLE_CLIENT_SECRET",
    "FACEBOOK_CLIENT_SECRET",
    "CRON_SECRET",
    "VV_ADMIN_IPS",
  ];
  const checkOne = (key) => {
    const v = process.env[key] || "";
    return {
      key,
      set: v.length > 0,
      length: v.length,
    };
  };
  return {
    critical: critical.map(checkOne),
    optional: optional.map(checkOne),
  };
}
