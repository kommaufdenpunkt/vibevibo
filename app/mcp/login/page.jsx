// 🚨 NUCLEAR DEBUG — bypasst ALLE parent CSS via position:fixed + z-index:99999.
// Wenn das NICHT sichtbar ist, läuft der Page-Code gar nicht.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function McpLoginPage() {
  // Erstmal KEIN auth-call — wir wollen nur sehen ob die Page überhaupt rendert.
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 99999,
      background: "linear-gradient(135deg, #ff006e, #fb5607, #ffbe0b, #8338ec, #3a86ff)",
      backgroundSize: "400% 400%",
      animation: "rainbow 4s ease infinite",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <style>{`
        @keyframes rainbow {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
      `}</style>
      <div style={{
        background: "white",
        color: "#1c1c1e",
        padding: "48px 40px",
        borderRadius: 20,
        maxWidth: 540,
        textAlign: "center",
        boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        border: "8px solid lime",
      }}>
        <div style={{ fontSize: 72, marginBottom: 12 }}>🚨</div>
        <h1 style={{
          fontSize: 36,
          fontWeight: 900,
          margin: "0 0 12px",
          background: "linear-gradient(135deg, #ff006e, #8338ec)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          NUCLEAR DEBUG
        </h1>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#1c1c1e", marginBottom: 8 }}>
          Wenn du das hier siehst:
        </p>
        <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 16 }}>
          ✅ Deine MCP-Login-Page <strong>RENDERT korrekt</strong>.<br/>
          ➜ Das vorherige Problem war: Parent-Layout-CSS hat unsere Inline-Styles überschrieben/versteckt.<br/>
          ➜ Lösung: <strong>Route-Group-Refactor</strong> (saubere Architektur).
        </p>
        <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 20 }}>
          Wenn du das hier <strong>NICHT</strong> siehst (immer noch leer):<br/>
          ➜ Page-Code wird <strong>gar nicht ausgeführt</strong>.<br/>
          ➜ Tieferes Problem (Server-Error, Build-Issue, Cache).
        </p>
        <div style={{
          background: "#fef3c7",
          padding: 14,
          borderRadius: 10,
          fontSize: 12,
          color: "#78350f",
          fontWeight: 700,
          border: "2px solid #f59e0b",
        }}>
          📸 Screenshot machen und schicken — dann weiß ich was zu tun ist.
        </div>
      </div>
    </div>
  );
}
