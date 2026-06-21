// 📣 Buschfunk-Route — leitet auf die Startseite weiter (Buschfunk = Startseite).
import { redirect } from "next/navigation";

export default function BuschfunkPage() {
  redirect("/");
}
