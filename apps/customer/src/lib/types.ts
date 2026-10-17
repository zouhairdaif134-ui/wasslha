export type Variant = { id: string; name_ar: string; name_fr: string; price_minor: number; stock_quantity: number; is_available: boolean };
export type Product = {
  id: string; store_id: string; name_ar: string; name_fr: string;
  description_ar?: string | null; description_fr?: string | null;
  price_minor: number; compare_at_price_minor?: number | null; is_available: boolean;
  store_name?: string | null; category_id?: string | null; image_url?: string | null; variants?: Variant[];
};
export type Store = {
  id: string; name: string; address_text: string; is_accepting_orders: boolean;
  rating?: number; distance_meters?: number | null; image_url?: string | null;
};
export type Category = { id: string; name_ar: string; name_fr: string; slug?: string };
export type Address = { id: string; label?: string | null; address_text: string; latitude: number; longitude: number; is_default: boolean };
export type Delivery = {
  id: string; status: string | null; eta_seconds: number | null; delivery_address_text: string;
  delivery_latitude: number | null; delivery_longitude: number | null;
};
export type Order = {
  id: string; order_number?: string; master_order_number?: string; status: string; total_minor?: number;
  payment_method?: string; payment_status?: string; created_at: string; deliveries?: Delivery[];
};
export type GetRequest = { id: string; request_title: string; status: string; created_at: string };
export type CartLine = { product: Product; quantity: number; variant?: Variant };
export type Quote = {
  subtotal_minor: number; delivery_fee_minor: number; service_fee_minor: number; discount_minor: number;
  tip_minor: number; total_minor: number; distance_meters: number; eta_seconds: number; currency: "MAD"; route_count: number;
};
export type Tracking = {
  latitude: number; longitude: number; recorded_at: string; status: string;
  eta_seconds: number | null; distance_meters: number | null;
};
export type Tab = "home" | "explore" | "cart" | "orders" | "profile";
// Screens pushed on top of a tab (the bottom bar is hidden while one is open).
export type Screen =
  | { name: "category"; category: Category }
  | { name: "store"; store: Store }
  | { name: "search" }
  | { name: "get" };
