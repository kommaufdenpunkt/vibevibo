// 🚪 Stillgelegt — Admin wurde radikal auf 3 Bereiche reduziert.
import { redirect } from "next/navigation";

export default async function StubRedirect({ searchParams }) {
  const sp = await searchParams;
  const pw = typeof sp?.pw === "string" ? sp.pw : "";
  redirect(`/admin${pw ? `?pw=${encodeURIComponent(pw)}` : ""}`);
}
