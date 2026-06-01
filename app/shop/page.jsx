"use client";

import PremiumPanel from "@/components/PremiumPanel";
import { useMe } from "@/lib/useMe";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ShopPage() {
  const { me, loading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me) router.push("/login");
  }, [me, loading, router]);

  if (loading || !me) return null;
  return <PremiumPanel />;
}
