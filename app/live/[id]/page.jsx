"use client";

import { use } from "react";
import Link from "next/link";
import { useMe } from "@/lib/useMe";
import LiveRoom from "@/components/LiveRoom";

export default function LiveStreamPage({ params }) {
  const { id } = use(params);
  const { me, loading } = useMe();
  if (loading) return null;
  if (!me) return (
    <div className="vv-card" style={{ textAlign: "center", padding: 30 }}>
      <p>Login nötig.</p>
      <Link href="/login" className="vv-btn-big vv-btn-big-pink">Zum Login</Link>
    </div>
  );
  return <LiveRoom streamId={Number(id)} meId={me.id} />;
}
