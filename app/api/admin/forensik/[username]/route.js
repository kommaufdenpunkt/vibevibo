// 🔒 Forensik-Daten-Export — Owner kann komplette User-Akte als JSON für Polizei abrufen.
// Enthält: Personalien, IPs, Geräte, Sanktionen, Mod-Log, verwandte Accounts.

import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import {
  getUserByUsername, getFullUserAkte, findRelatedAccounts, audit,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin-Auth nötig." }, { status: 401 });
  }
  const { username } = await params;
  const target = getUserByUsername(String(username).toLowerCase());
  if (!target) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });

  const akte = getFullUserAkte(target.id);
  if (!akte) return NextResponse.json({ error: "Keine Akte" }, { status: 404 });

  let related = [];
  try { related = findRelatedAccounts(target.id, { limit: 30 }); } catch {}

  // Audit-Log: Forensik-Export wurde durchgeführt (DSGVO-relevant)
  try {
    audit({ userId: target.id, action: "owner.forensik_export", detail: `username=${username}` });
  } catch {}

  const exportData = {
    generatedAt: new Date().toISOString(),
    coverNote: `
═══════════════════════════════════════════════════════
🔒 FORENSIK-EXPORT für POLIZEI / BEHÖRDEN
═══════════════════════════════════════════════════════

Empfänger: Strafverfolgungsbehörde
Anbieter:  VibeVibo (siehe Impressum)
User:      @${target.username} (ID: ${target.id})
Erstellt:  ${new Date().toLocaleString("de-DE")}

Relevante Paragraphen (Auswahl):
 • § 211 StGB    — Mord
 • § 216 StGB    — Tötung auf Verlangen
 • § 217 StGB    — Geschäftsmäßige Förderung der Selbsttötung
 • § 238 StGB    — Nachstellung (Stalking)
 • § 241 StGB    — Bedrohung
 • § 111 StGB    — Öffentliche Aufforderung zu Straftaten
 • § 184 StGB    — Verbreitung pornographischer Inhalte
 • § 202a StGB   — Ausspähen von Daten

Rechtsgrundlage Weitergabe:
 • Art. 6 Abs. 1 lit. d DSGVO — lebenswichtige Interessen
 • § 24 BDSG — Übermittlung an öffentliche Stellen
 • Auskunftsersuchen nach § 100j StPO

Dieser Export enthält IP-Adressen, Geräte-Fingerprints und
inhaltliche Posts/DMs. Bitte gemäß DSGVO behandeln.
═══════════════════════════════════════════════════════
    `.trim(),
    user: {
      id: akte.user.id,
      username: akte.user.username,
      displayName: akte.user.displayName,
      status: akte.user.status,
      role: akte.user.role,
      gender: akte.user.gender,
      birthdate: akte.user.birthdate,
      realName: akte.user.realName || "(nicht erfasst)",
      address: {
        street: akte.user.addrStreet || "(nicht erfasst)",
        zip: akte.user.addrZip || "(nicht erfasst)",
        city: akte.user.addrCity || "(nicht erfasst)",
        country: akte.user.addrCountry || "DE",
      },
      idVerified: akte.user.idVerified === 1,
      idDocUrl: akte.user.idDocUrl || null,
      registeredAt: new Date(akte.user.createdAt).toISOString(),
      lastSeen: akte.user.lastSeen ? new Date(akte.user.lastSeen).toISOString() : null,
      registrationIp: akte.user.regIp,
      adminNotes: akte.user.adminNotes,
    },
    devices: akte.devices.map((d) => ({
      id: d.id, userAgent: d.userAgent, ip: d.ip,
      firstSeen: new Date(d.createdAt).toISOString(),
      lastSeen: new Date(d.lastSeen).toISOString(),
    })),
    ipHistory: akte.ips.map((i) => ({
      ip: i.ip, uses: i.uses,
      lastSeen: new Date(i.lastSeen).toISOString(),
    })),
    sanctions: akte.sanctions.map((s) => ({
      type: s.type, reason: s.reason, by: s.by,
      from: new Date(s.createdAt).toISOString(),
      until: s.until ? new Date(s.until).toISOString() : "permanent",
      liftedAt: s.liftedAt ? new Date(s.liftedAt).toISOString() : null,
    })),
    modLog: akte.modLog.map((m) => ({
      kind: m.kind, note: m.note, by: m.by,
      at: new Date(m.createdAt).toISOString(),
    })),
    reportsAgainst: akte.reportsAgainst,
    relatedAccounts: related.map((r) => ({
      id: r.id, username: r.username, displayName: r.displayName,
      sharedIp: r.sharedIp, lastSeenShared: r.sharedLastSeen
        ? new Date(r.sharedLastSeen).toISOString() : null,
      registeredAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    })),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="vibevibo-forensik-${target.username}-${Date.now()}.json"`,
    },
  });
}
