"use client";

// 📷 MediaPermissionNotice — Aufklärung über Kamera/Mikrofon-Erlaubnis.
// Erscheint immer wo getUserMedia genutzt wird (Live-Stream, Live-Call).

export default function MediaPermissionNotice({ compact = false }) {
  if (compact) {
    return (
      <div style={{
        background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(236,72,153,0.1))",
        border: "1px solid #f59e0b",
        borderRadius: 10, padding: "8px 10px",
        margin: "8px 0",
        fontSize: 12, color: "#78350f",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 18 }}>📷</span>
        <span>
          Beim Beitritt fragt dein Browser nach <b>Kamera & Mikrofon</b> — bitte erlauben.
          Funktioniert am besten in <b>Chrome</b>, <b>Edge</b> oder <b>Safari</b>.
        </span>
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #fef3c7, #fde68a)",
      border: "1px solid #f59e0b",
      borderRadius: 12, padding: 12,
      margin: "10px 0",
      color: "#78350f",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>📷</span>
        <b style={{ fontSize: 14 }}>Browser-Erlaubnis nötig</b>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5 }}>
        Beim Beitritt fragt dein Browser nach <b>Kamera & Mikrofon</b> — bitte <b>„Erlauben"</b> klicken.
        Sonst kannst du nicht senden und nichts hören.
        <br />
        Funktioniert am besten in <b>Chrome</b>, <b>Edge</b> oder <b>Safari</b>.
        Firefox geht meist auch, ältere Browser nicht.
      </div>
      <div style={{
        marginTop: 8, fontSize: 11, color: "#92400e",
        background: "rgba(255,255,255,0.6)", padding: "5px 8px", borderRadius: 6,
      }}>
        💡 Tipp: Wenn der Browser nichts fragt, prüfe das 🔒-Schloss-Icon links neben der URL —
        dort kannst du Berechtigungen manuell zulassen.
      </div>
    </div>
  );
}
