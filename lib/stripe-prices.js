// 💳 Stripe Price-IDs + Metadaten (pure Daten — Client + Server)
// Liegt bewusst NICHT in lib/stripe.js, damit der Stripe-SDK nur server-seitig
// gebundled wird.

export const STRIPE_PRICES = {
  "price_1ThxREELUv6dAFc5Hx4gCXyj": {
    kind: "vip",
    days: 30,
    label: "VIP — 30 Tage werbefrei",
    emoji: "💎",
    priceLabel: "2,99 €",
    description: "30 Tage komplett werbefrei + Diamond-Badge solange aktiv.",
  },
  "price_1ThxS3ELUv6dAFc5nF57KCSP": {
    kind: "vibes",
    amount: 350,
    label: "Vibes-Pack S",
    emoji: "✨",
    priceLabel: "1,99 €",
    description: "350 ✨ direkt aufs Konto — kein Sink, kein Cap.",
  },
  "price_1ThxSkELUv6dAFc5q5f8N7rY": {
    kind: "vibes",
    amount: 1000,
    label: "Vibes-Pack M",
    emoji: "🌟",
    priceLabel: "4,99 €",
    description: "1000 ✨ direkt aufs Konto (Mengenrabatt — 24% mehr pro Euro).",
  },
};

export function listStripePackages() {
  return Object.entries(STRIPE_PRICES).map(([priceId, meta]) => ({ priceId, ...meta }));
}
