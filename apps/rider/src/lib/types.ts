export type Rider = { id: string; status?: string | null; vehicle_type?: string | null; vehicle_plate?: string | null; is_online?: boolean };
export type Assignment = { id: string; delivery_id: string; rider_id: string; status?: string | null; offered_at?: string | null };
export type Delivery = {
  id: string;
  master_order_id: string;
  delivery_address_text: string;
  delivery_latitude?: number | string | null;
  delivery_longitude?: number | string | null;
  status?: string | null;
  eta_seconds?: number | null;
  payment_method?: string | null;
  collect_minor?: number | string;
  // added client-side from the deliveries table (RLS-protected, same rows the API reads)
  pickup_address_text?: string | null;
  pickup_latitude?: number | string | null;
  pickup_longitude?: number | string | null;
  customer_note?: string | null;
};
export type Slot = { id: string; slot_date: string; start_time: string; end_time: string; capacity: number; status: string };
export type Earnings = { total_minor: number | string; pending_minor: number | string; paid_minor: number | string; currency?: string } | null;
export type Wallet = { id: string; balance_minor: number | string; currency: string; status: string } | null;
export type Cash = { balance_minor: number | string; limit_minor: number | string; remaining_minor: number | string; status: string; blocked: boolean } | null;
export type Performance = {
  period_start: string; period_end: string; completed_deliveries: number; cancelled_deliveries: number; late_deliveries: number;
  acceptance_rate: number | null; completion_rate: number | null; average_delivery_minutes: number | null; customer_rating: number | null;
};
export type Pos = { latitude: number; longitude: number };
export type Tab = "home" | "orders" | "slots" | "earnings" | "profile";
export type DeliveryStatus = "at_pickup" | "picked_up" | "in_transit" | "delivered" | "failed" | "cancelled";
