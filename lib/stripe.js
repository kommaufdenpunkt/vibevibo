// 💳 Stripe Server-Helper (NUR Server-Routen importieren!)
// Client-seitig nur lib/stripe-prices.js verwenden, sonst landet der Stripe-SDK
// im Browser-Bundle.

export { STRIPE_PRICES, listStripePackages } from "@/lib/stripe-prices";

let _stripe = null;
export function getStripe() {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY nicht gesetzt");
  const Stripe = require("stripe");
  _stripe = new Stripe(key);
  return _stripe;
}

export function publicBaseUrl() {
  return process.env.STRIPE_PUBLIC_URL || "https://vibevibo.de";
}
