"use client";

export default function AdminLogoutButton() {
  async function handleLogout() {
    try {
      await fetch("/api/adminpanel/auth", {
        method: "DELETE",
        credentials: "include",
      });
    } catch {}
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        padding: "10px 20px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        color: "rgba(241,241,245,0.7)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      Abmelden
    </button>
  );
}
