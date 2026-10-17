import type { CartLine, Category, Order, Product, Variant } from "./types";

export const money = (minor: number) => `${(minor / 100).toFixed(2)} DH`;
export const toPhone = (value: string) => {
  const clean = value.replace(/\s/g, "");
  return /^0[67]\d{8}$/.test(clean) ? `+212${clean.slice(1)}` : clean;
};
export const lineKey = (product: Product, variant?: Variant) => product.id + ":" + (variant?.id ?? "base");
export const lineUnit = (line: CartLine) => line.variant?.price_minor ?? line.product.price_minor;

export const distanceLabel = (meters?: number | null) =>
  meters == null ? "" : meters < 1000 ? `${Math.round(meters)} م` : `${(meters / 1000).toFixed(1)} كم`;

// Estimated delivery time derived from the real distance (15 min base + ~4 min per km).
export const etaLabel = (meters?: number | null) => {
  if (meters == null) return "";
  const minutes = Math.round(15 + (meters / 1000) * 4);
  return `${minutes}-${minutes + 10} د`;
};

const CATEGORY_EMOJI: Record<string, string> = {
  restaurants: "🍔", epicerie: "🛒", boulangerie: "🥐", pharmacie: "💊", "fruits-legumes": "🥬", viandes: "🥩", boissons: "🥤", autres: "🏪",
};
export const categoryEmoji = (category?: Category | null) => CATEGORY_EMOJI[category?.slug ?? ""] ?? "🛍️";

// Outline icon names (Ionicons) per category slug.
const CATEGORY_ICON: Record<string, string> = {
  "fruits-legumes": "nutrition-outline", restaurants: "restaurant-outline", epicerie: "basket-outline", boulangerie: "cafe-outline",
  viandes: "flame-outline", boissons: "water-outline", autres: "storefront-outline", pharmacie: "medkit-outline",
};
export const categoryIcon = (category?: Category | null) => CATEGORY_ICON[category?.slug ?? ""] ?? "pricetag-outline";

export const ORDER_STEPS = ["تم الطلب", "مؤكد", "كيتحضر", "فالطريق", "وصل"];
export function orderStep(status: string): number {
  switch (status) {
    case "pending": return 0;
    case "confirmed": return 1;
    case "preparing":
    case "ready_for_pickup":
    case "assigned": return 2;
    case "picked_up":
    case "out_for_delivery": return 3;
    case "delivered": return 4;
    default: return 0;
  }
}
export const orderStatusLabel = (status: string) =>
  ({
    pending: "قيد التأكيد", confirmed: "تم التأكيد", preparing: "قيد التحضير", ready_for_pickup: "واجد للاستلام",
    assigned: "سائق تعيّن", picked_up: "السائق استلمو", out_for_delivery: "فالطريق",
    delivered: "تم التوصيل", cancelled: "ملغى", failed: "تعذر التوصيل",
  } as Record<string, string>)[status] ?? status;
export const awaitingPayment = (order: Order) =>
  order.payment_method === "online" && order.payment_status !== "paid" && order.status === "pending";
export const ACTIVE_DELIVERY = ["assigned", "accepted", "at_pickup", "picked_up", "in_transit"];

export const discountPercent = (p: Product) =>
  p.compare_at_price_minor && p.compare_at_price_minor > p.price_minor
    ? Math.round((1 - p.price_minor / p.compare_at_price_minor) * 100)
    : 0;
