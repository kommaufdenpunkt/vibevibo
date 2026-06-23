// 🔐 Admin-Endpoint: MCP-Passwort für einen User setzen.
//
// SCHUTZ:
//   • Funktioniert NUR wenn env var MCP_SETUP_SECRET gesetzt ist (min 16 Zeichen).
//     Ohne env var → 503. Nach Setup → env var im Coolify entfernen, dann ist
//     der Endpoint disabled.
//   • Body muss { secret, username, password } enthalten.
//   • secret wird timing-safe verglichen.
//   • Rate-Limit: max 6 Versuche / 10 Min pro IP.
//   • Jeder Erfolg + Fehler wird in Coolify Logs geschrieben (console.log).
//
// VERWENDUNG (vom Mac aus):
//   curl -X POST https://mcp.vibevibo.de/api/mcp/_setup \
//     -H "Content-Type: application/json" \
//     -d '{"secret":"<MCP_SETUP_SECRET>","username":"eyfahrlehrer","password":"<min12chars>"}'
//
// Erfolgreiche Antwort: { ok: true, username, schemaAdded: ["..."] }
// Fehler:               { error: "..." }

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  ensureMcpCredentialsSchema,
  setMcpPassword,
  getMcpPasswordInfo,
} from "@/lib/mcpCredentials";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIN_SECRET_LEN = 16;
const MIN_RESPONSE_MS = 400;

// In-Memory Rate-Limit (pro Worker — reicht weil low-traffic)
const _attempts = new Map(); // ip → { count, resetAt }
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 6;

function rateLimitOk(ip) {
  const now = Date.now();
  const entry = _attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    _attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count += 1;
  return true;
}

function getIp(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(req) {
  const t0 = Date.now();
  const ip = getIp(req);

  async function respond(status, body) {
    const elapsed = Date.now() - t0;
    if (elapsed < MIN_RESPONSE_MS) {
      await new Promise((r) => setTimeout(r, MIN_RESPONSE_MS - elapsed));
    }
    return NextResponse.json(body, { status });
  }

  const SECRET = process.env.MCP_SETUP_SECRET || "";

  // 1) Endpoint nur aktiv wenn Secret konfiguriert
  if (!SECRET || SECRET.length < MIN_SECRET_LEN) {
    console.log(`[MCP-SETUP] ${new Date().toISOString()} ip=${ip} ERROR=endpoint_disabled (no MCP_SETUP_SECRET env var, oder zu kurz < ${MIN_SECRET_LEN})`);
    return respond(503, {
      error: `Setup-Endpoint nicht konfiguriert. Setze env var MCP_SETUP_SECRET (mindestens ${MIN_SECRET_LEN} Zeichen) in Coolify und restarte den Service.`,
    });
  }

  // 2) Rate-Limit
  if (!rateLimitOk(ip)) {
    console.log(`[MCP-SETUP] ${new Date().toISOString()} ip=${ip} ERROR=rate_limit`);
    return respond(429, { error: "Zu viele Versuche. Bitte in ~10 Min erneut." });
  }

  // 3) Body parsen
  let body = {};
  try { body = await req.json(); } catch {}
  const secret = String(body?.secret || "");
  const username = String(body?.username || "").trim().toLowerCase().slice(0, 64);
  const password = String(body?.password || "");

  // 4) Secret prüfen (timing-safe)
  if (!safeEqual(secret, SECRET)) {
    console.log(`[MCP-SETUP] ${new Date().toISOString()} ip=${ip} username=${username || "(empty)"} ERROR=wrong_secret`);
    return respond(401, { error: "Zugriff verweigert." });
  }

  // 5) Validierung
  if (!username) {
    return respond(400, { error: "username fehlt." });
  }
  if (!password) {
    return respond(400, { error: "password fehlt." });
  }
  if (password.length < 12) {
    return respond(400, { error: "Passwort muss mindestens 12 Zeichen lang sein." });
  }

  // 6) Schema sicherstellen (idempotent)
  let schemaAdded = [];
  try {
    schemaAdded = ensureMcpCredentialsSchema();
    if (schemaAdded.length) {
      console.log(`[MCP-SETUP] ${new Date().toISOString()} ip=${ip} schema_added=${schemaAdded.join(",")}`);
    }
  } catch (e) {
    console.log(`[MCP-SETUP] ${new Date().toISOString()} ip=${ip} ERROR=schema_failed: ${e.message}`);
    return respond(500, { error: `Schema-Patch fehlgeschlagen: ${e.message}` });
  }

  // 7) Passwort setzen
  let ok = false;
  try {
    ok = setMcpPassword(username, password);
  } catch (e) {
    console.log(`[MCP-SETUP] ${new Date().toISOString()} ip=${ip} username=${username} ERROR=${e.message}`);
    return respond(500, { error: e.message });
  }

  if (!ok) {
    console.log(`[MCP-SETUP] ${new Date().toISOString()} ip=${ip} username=${username} ERROR=user_not_found`);
    return respond(404, {
      error: `User '${username}' existiert nicht in der DB. Erst auf vibevibo.de registrieren.`,
    });
  }

  const info = getMcpPasswordInfo(username);
  console.log(`[MCP-SETUP] ${new Date().toISOString()} ip=${ip} username=${username} userId=${info?.userId} SUCCESS`);

  return respond(200, {
    ok: true,
    username: info?.username || username,
    userId: info?.userId || null,
    schemaAdded,
    hint: "Phase B ist noch nicht aktiv — der Auth-Endpoint nutzt aktuell noch das normale vibevibo.de-Passwort. Sobald Phase B deployed ist, gilt dieses MCP-Passwort.",
  });
}

// Optional: GET zeigt Status (kein Geheimnis nötig — zeigt nur ob Endpoint aktiv ist)
export async function GET() {
  const enabled = !!(process.env.MCP_SETUP_SECRET && process.env.MCP_SETUP_SECRET.length >= MIN_SECRET_LEN);
  return NextResponse.json({
    enabled,
    hint: enabled
      ? "Endpoint aktiv. POST mit { secret, username, password } um MCP-Passwort zu setzen."
      : "Endpoint disabled. Setze env var MCP_SETUP_SECRET in Coolify (mindestens 16 Zeichen).",
  });
}
