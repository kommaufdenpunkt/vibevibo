"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";

export default function Navbar() {
  const router = useRouter();
  const { me, logout } = useMe();

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="vv-nav">
      <Link href="/">🏠 Start</Link>
      <Link href="/profile">👤 Mein Profil</Link>
      <Link href="/freunde">👯 Freunde</Link>
      <Link href="/messenger">✉️ Nachrichten</Link>
      <Link href="/fotos">📸 Fotos</Link>
      <Link href="/gruppen">🏘️ Gruppen</Link>
      <Link href="/geschenke">🎁 Geschenke</Link>
      {me ? (
        <>
          <span className="vv-nav-user">
            <span className="vv-online-dot" />
            Hi {me.displayName} {me.emoji}
          </span>
          <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>↩ Logout</a>
        </>
      ) : (
        <Link href="/login">🔑 Einloggen</Link>
      )}
    </nav>
  );
}
