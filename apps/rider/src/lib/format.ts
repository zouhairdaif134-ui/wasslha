import { Alert, Linking } from "react-native";
import type { Pos } from "./types";

export const money = (v?: number | string | null) => (Number(v ?? 0) / 100).toFixed(2) + " DH";

export function toPhone(raw: string): string {
  const d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d;
  if (d.startsWith("00")) return "+" + d.slice(2);
  if (d.startsWith("0")) return "+212" + d.slice(1);
  if (d.startsWith("212")) return "+" + d;
  return "+212" + d;
}

export const STATUS_LABEL: Record<string, string> = {
  offered: "عرض جديد", accepted: "مقبول", rejected: "مرفوض", assigned: "مُعيّن", at_pickup: "وصلتي للمتجر",
  picked_up: "تم الاستلام", in_transit: "فالطريق للزبون", delivered: "تسلّم", failed: "ما تسلّمش",
  cancelled: "ملغى", completed: "مكتمل", expired: "انتهى",
};
export const statusLabel = (v?: string | null) => STATUS_LABEL[v ?? ""] ?? v ?? "—";
export const FINISHED = ["delivered", "failed", "cancelled"];

export function pointOf(lat: unknown, lon: unknown): Pos | null {
  if (lat == null || lon == null) return null;
  const latitude = Number(lat);
  const longitude = Number(lon);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

// Straight-line distance (haversine). Road distance needs a routing key, so this is shown as "~".
export function distanceKm(a: Pos, b: Pos): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const kmLabel = (km: number) => (km < 1 ? `${Math.round(km * 1000)} م` : `${km.toFixed(1)} كم`);
export const orderCode = (id: string) => "#" + id.replace(/-/g, "").slice(0, 5).toUpperCase();

export function openNavigation(target: Pos | null, label: string) {
  if (!target) { Alert.alert("الموقع", "الإحداثيات ديال هاد البلاصة ما متوفراش."); return; }
  const { latitude, longitude } = target;
  Alert.alert("الملاحة", label, [
    { text: "Google Maps", onPress: () => void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`) },
    { text: "Waze", onPress: () => void Linking.openURL(`https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`) },
    { text: "إلغاء", style: "cancel" },
  ]);
}
