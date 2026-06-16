import { NextResponse } from "next/server";
import { adminEnabled, checkAdminPassword } from "@/lib/admin";

export const dynamic = "force-dynamic";

// GET — Diagnose: ist VV_ADMIN_PASSWORD gesetzt? Stimmt mein PW?
// Verraet KEINE Passwort-Werte — nur Länge + Match-Status.
export async function GET(req) {
  const enabled = adminEnabled();
  const envLength = process.env.VV_ADMIN_PASSWORD ? process.env.VV_ADMIN_PASSWORD.length : 0;

  // Optional: PW prüfen wenn als Header oder Query mitgegeben
  const headerPw = req.headers.get("x-admin-password") || "";
  const url = new URL(req.url);
  const queryPw = url.searchParams.get("pw") || "";
  const tryPw = headerPw || queryPw;

  const result = {
    enabled,
    envLength,
    minLengthRequired: 6,
  };

  if (tryPw) {
    result.testedLength = tryPw.length;
    result.matches = checkAdminPassword(tryPw);
    result.hint = result.matches
      ? "Passwort stimmt — Admin-Zugang funktioniert."
      : envLength === 0
        ? "VV_ADMIN_PASSWORD ist nicht gesetzt in Coolify-ENV!"
        : envLength < 6
          ? `VV_ADMIN_PASSWORD ist gesetzt aber nur ${envLength} Zeichen lang — mindestens 6 nötig.`
          : tryPw.length !== envLength
            ? `Längen unterschiedlich: dein PW hat ${tryPw.length}, ENV hat ${envLength}. Tippfehler? Leerzeichen?`
            : "Längen stimmen, Inhalt nicht. Achte auf Sonderzeichen / Groß-Klein.";
  } else if (!enabled) {
    result.hint = envLength === 0
      ? "VV_ADMIN_PASSWORD ist nicht in Coolify-ENV gesetzt. → Coolify → vibevibo → Configuration → Environment Variables → neue Var anlegen."
      : `VV_ADMIN_PASSWORD ist nur ${envLength} Zeichen — mindestens 6 nötig.`;
  } else {
    result.hint = "ENV ist gesetzt. Sende ?pw=… oder Header x-admin-password um zu testen.";
  }

  return NextResponse.json(result);
}
