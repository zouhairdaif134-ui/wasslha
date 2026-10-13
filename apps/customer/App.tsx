import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  I18nManager,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./src/lib/supabase";

/* ───────────────────────── config & types ───────────────────────── */

const API = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
const ONLINE_PAYMENTS_ENABLED = process.env.EXPO_PUBLIC_ONLINE_PAYMENTS_ENABLED === "true";
const ROW = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);
const idempotencyKey = () => Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 14);

type Variant = { id: string; name_ar: string; name_fr: string; price_minor: number; stock_quantity: number; is_available: boolean };
type Product = { id: string; store_id: string; name_ar: string; name_fr: string; description_ar?: string | null; description_fr?: string | null; price_minor: number; is_available: boolean; store_name?: string | null; variants?: Variant[] };
type Store = { id: string; name: string; address_text: string; is_accepting_orders: boolean; rating?: number; distance_meters?: number | null };
type Category = { id: string; name_ar: string; name_fr: string; slug?: string };
type Address = { id: string; label?: string | null; address_text: string; latitude: number; longitude: number; is_default: boolean };
type Delivery = { id: string; status: string | null; eta_seconds: number | null; delivery_address_text: string; delivery_latitude: number | null; delivery_longitude: number | null };
type Order = { id: string; order_number?: string; master_order_number?: string; status: string; total_minor?: number; payment_method?: string; payment_status?: string; created_at: string; deliveries?: Delivery[] };
type GetRequest = { id: string; request_title: string; status: string; created_at: string };
type CartLine = { product: Product; quantity: number; variant?: Variant };
type Quote = { subtotal_minor: number; delivery_fee_minor: number; service_fee_minor: number; discount_minor: number; tip_minor: number; total_minor: number; distance_meters: number; eta_seconds: number; currency: "MAD"; route_count: number };
type Tracking = { latitude: number; longitude: number; recorded_at: string; status: string; eta_seconds: number | null; distance_meters: number | null };
type Tab = "home" | "search" | "orders" | "profile";
type Screen = { name: "tabs" } | { name: "store"; store: Store } | { name: "cart" } | { name: "get" };

/* ───────────────────────── theme ───────────────────────── */

const C = {
  primary: "#F26B21",
  primaryDark: "#D9560F",
  primarySoft: "#FFF1E8",
  bg: "#F7F4EF",
  card: "#FFFFFF",
  ink: "#1B1B1F",
  muted: "#6B7280",
  line: "#ECE7DF",
  ok: "#12A150",
  okSoft: "#E6F6EC",
  danger: "#C62828",
  dangerSoft: "#FDECEC",
};

/* ───────────────────────── helpers ───────────────────────── */

function unwrap<T>(value: unknown): T {
  // Some routes answer { success, data: { success, data, error } }: unwrap the nested result.
  if (value && typeof value === "object" && !Array.isArray(value) && "success" in value && "data" in value) {
    const inner = value as { success: boolean; data: T; error?: string | null };
    if (!inner.success) throw new Error(inner.error ?? "تعذر الاتصال بالخدمة");
    return inner.data;
  }
  return value as T;
}

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function api<T>(path: string, session: Session, options: RequestInit = {}): Promise<T> {
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${session.access_token}`,
    ...(options.headers ?? {}),
  };
  const response = await fetch(`${API}/api/v1/${path}`, { ...options, headers });
  const payload = (await response.json()) as { success?: boolean; data?: unknown; error?: { message?: string } };
  if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "تعذر الاتصال بالخدمة");
  return unwrap<T>(payload.data);
}

const money = (minor: number) => `${(minor / 100).toFixed(2)} DH`;
const toPhone = (value: string) => {
  const clean = value.replace(/\s/g, "");
  return /^0[67]\d{8}$/.test(clean) ? `+212${clean.slice(1)}` : clean;
};
const lineKey = (product: Product, variant?: Variant) => product.id + ":" + (variant?.id ?? "base");
const lineUnit = (line: CartLine) => line.variant?.price_minor ?? line.product.price_minor;

const CATEGORY_EMOJI: Record<string, string> = {
  restaurants: "🍔",
  epicerie: "🛒",
  boulangerie: "🥐",
  pharmacie: "💊",
  "fruits-legumes": "🥬",
  autres: "✨",
};
const categoryEmoji = (category: Category) => CATEGORY_EMOJI[category.slug ?? ""] ?? "🛍️";

const TILE_COLORS = ["#FFE9D6", "#E3F1FF", "#E9F7E4", "#F6E8FF", "#FFF4CC", "#FFE3E3"];
const tileColor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return TILE_COLORS[hash % TILE_COLORS.length];
};

const ORDER_STEPS = ["تم الطلب", "مؤكد", "كيتحضر", "فالطريق", "وصل"];
function orderStep(status: string): number {
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
const orderStatusLabel = (status: string) =>
  ({ pending: "في انتظار التأكيد", confirmed: "مؤكد", preparing: "كيتحضر", ready_for_pickup: "واجد للاستلام", assigned: "سائق تعيّن", picked_up: "السائق استلمو", out_for_delivery: "فالطريق ليك", delivered: "تم التوصيل", cancelled: "ملغى", failed: "تعذر التوصيل" } as Record<string, string>)[status] ?? status;
const awaitingPayment = (order: Order) => order.payment_method === "online" && order.payment_status !== "paid" && order.status === "pending";
const ACTIVE_DELIVERY = ["assigned", "accepted", "at_pickup", "picked_up", "in_transit"];

/* ───────────────────────── small UI pieces ───────────────────────── */

function Button({ title, onPress, variant = "primary", disabled = false, small = false }: { title: string; onPress: () => void; variant?: "primary" | "ghost" | "danger"; disabled?: boolean; small?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        variant === "ghost" && styles.buttonGhost,
        variant === "danger" && styles.buttonDanger,
        (disabled || pressed) && { opacity: disabled ? 0.45 : 0.85 },
      ]}
    >
      <Text style={[styles.buttonText, variant === "ghost" && { color: C.ink }, variant === "danger" && { color: C.danger }]}>{title}</Text>
    </Pressable>
  );
}

function Pill({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "ok" | "warn" | "danger" }) {
  const palette = tone === "ok" ? { bg: C.okSoft, fg: C.ok } : tone === "danger" ? { bg: C.dangerSoft, fg: C.danger } : tone === "warn" ? { bg: C.primarySoft, fg: C.primaryDark } : { bg: "#EFEBE4", fg: C.muted };
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.pillText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

function Empty({ emoji, title, hint }: { emoji: string; title: string; hint?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 44 }}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

function Stepper({ quantity, onMinus, onPlus }: { quantity: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onMinus} hitSlop={8} style={styles.stepperBtn}><Text style={styles.stepperGlyph}>−</Text></Pressable>
      <Text style={styles.stepperQty}>{quantity}</Text>
      <Pressable onPress={onPlus} hitSlop={8} style={styles.stepperBtn}><Text style={styles.stepperGlyph}>+</Text></Pressable>
    </View>
  );
}

function ProductRow({ product, cart, onAdd, onRemove }: { product: Product; cart: CartLine[]; onAdd: (product: Product, variant?: Variant) => void; onRemove: (product: Product, variant?: Variant) => void }) {
  const [variantId, setVariantId] = useState<string | undefined>();
  const variants = product.variants ?? [];
  const selected = variants.find((variant) => variant.id === variantId);
  const price = selected?.price_minor ?? product.price_minor;
  const line = cart.find((entry) => lineKey(entry.product, entry.variant) === lineKey(product, selected));
  const needVariant = variants.length > 0 && !selected;
  return (
    <View style={styles.productCard}>
      <View style={[styles.productTile, { backgroundColor: tileColor(product.name_fr || product.name_ar) }]}>
        <Text style={{ fontSize: 30 }}>🍽️</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.productName} numberOfLines={2}>{product.name_ar}</Text>
        {product.name_fr ? <Text style={styles.productSub} numberOfLines={1}>{product.name_fr}</Text> : null}
        {product.store_name ? <Text style={styles.productSub} numberOfLines={1}>{product.store_name}</Text> : null}
        <Text style={styles.productPrice}>{money(price)}</Text>
        {variants.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            {variants.map((variant) => (
              <Pressable key={variant.id} onPress={() => setVariantId(variant.id)} style={[styles.chip, variantId === variant.id && styles.chipActive]}>
                <Text style={[styles.chipText, variantId === variant.id && styles.chipTextActive]}>{variant.name_ar}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>
      {line ? (
        <Stepper quantity={line.quantity} onMinus={() => onRemove(product, selected)} onPlus={() => onAdd(product, selected)} />
      ) : (
        <Pressable
          disabled={!product.is_available}
          onPress={() => (needVariant ? Alert.alert("اختار الحجم", "اختار واحد من الاختيارات تحت المنتج.") : onAdd(product, selected))}
          style={[styles.addButton, !product.is_available && { opacity: 0.4 }]}
        >
          <Text style={styles.addGlyph}>+</Text>
        </Pressable>
      )}
    </View>
  );
}

function StoreCard({ store, onPress }: { store: Store; onPress: () => void }) {
  const km = store.distance_meters != null ? `${(store.distance_meters / 1000).toFixed(1)} km` : null;
  return (
    <Pressable onPress={onPress} style={styles.storeCard}>
      <View style={[styles.storeCover, { backgroundColor: tileColor(store.name) }]}>
        <Text style={{ fontSize: 40 }}>🏪</Text>
        <View style={styles.storeBadge}>
          <Pill text={store.is_accepting_orders ? "مفتوح" : "مغلق"} tone={store.is_accepting_orders ? "ok" : "danger"} />
        </View>
      </View>
      <View style={{ padding: 12 }}>
        <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
        <Text style={styles.storeMeta} numberOfLines={1}>
          {store.address_text}
        </Text>
        <View style={[styles.rowGap, { marginTop: 6 }]}>
          {store.rating ? <Text style={styles.storeMeta}>⭐ {store.rating.toFixed(1)}</Text> : null}
          {km ? <Text style={styles.storeMeta}>📍 {km}</Text> : null}
          <Text style={styles.storeMeta}>🛵 20-35 د</Text>
        </View>
      </View>
    </Pressable>
  );
}

function OrderCard({ order, tracking, onRefund }: { order: Order; tracking: Record<string, Tracking>; onRefund: (orderId: string, amount: number) => void }) {
  const delivery = order.deliveries?.[0];
  const live = delivery ? tracking[delivery.id] : undefined;
  const active = !!delivery && ACTIVE_DELIVERY.includes(delivery.status ?? "");
  const closed = order.status === "cancelled" || order.status === "failed";
  const step = orderStep(order.status);
  const waiting = awaitingPayment(order);

  async function openMap() {
    const latitude = live?.latitude ?? delivery?.delivery_latitude;
    const longitude = live?.longitude ?? delivery?.delivery_longitude;
    if (latitude == null || longitude == null) return;
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
  }

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>طلب #{order.master_order_number ?? order.order_number ?? order.id.slice(0, 6)}</Text>
        <Pill text={waiting ? "في انتظار الدفع" : orderStatusLabel(order.status)} tone={closed ? "danger" : order.status === "delivered" ? "ok" : "warn"} />
      </View>
      <Text style={styles.orderTotal}>{money(order.total_minor ?? 0)}</Text>

      {!closed ? (
        <View style={styles.timeline}>
          {ORDER_STEPS.map((label, index) => (
            <View key={label} style={styles.timelineItem}>
              <View style={[styles.dot, index <= step && styles.dotActive]} />
              <Text style={[styles.timelineLabel, index <= step && { color: C.ink, fontWeight: "800" }]}>{label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {delivery ? (
        <View style={styles.trackBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.trackTitle}>{active ? "السائق فالطريق" : "التوصيل"}</Text>
            <Text style={styles.trackSub}>
              {delivery.eta_seconds ? `الوصول بعد ${Math.max(1, Math.round(delivery.eta_seconds / 60))} د` : delivery.delivery_address_text}
            </Text>
            {live && live.recorded_at ? <Text style={styles.live}>● مباشر</Text> : null}
          </View>
          {active ? <Button title={live ? "تتبع مباشر" : "الموقع"} onPress={() => void openMap()} small /> : null}
        </View>
      ) : null}

      {order.status === "cancelled" && order.payment_status === "paid" ? (
        <Button title="طلب استرجاع" variant="ghost" small onPress={() => onRefund(order.id, order.total_minor ?? 0)} />
      ) : null}
    </View>
  );
}

function AddressSheet({ visible, addresses, selected, onSelect, onLocate, onClose, busy }: { visible: boolean; addresses: Address[]; selected: string | null; onSelect: (id: string) => void; onLocate: () => void; onClose: () => void; busy: boolean }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>عنوان التوصيل</Text>
        <ScrollView style={{ maxHeight: 280 }}>
          {addresses.length === 0 ? <Text style={styles.emptyHint}>ما عندك حتى عنوان. استعمل موقعك الحالي.</Text> : null}
          {addresses.map((address) => (
            <Pressable key={address.id} onPress={() => { onSelect(address.id); onClose(); }} style={[styles.addressRow, selected === address.id && styles.addressRowActive]}>
              <Text style={{ fontSize: 20 }}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.addressTitle}>{address.label || "العنوان"}</Text>
                <Text style={styles.addressText} numberOfLines={1}>{address.address_text}</Text>
              </View>
              <Text style={{ color: C.primary, fontSize: 18 }}>{selected === address.id ? "●" : "○"}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Button title={busy ? "..." : "📍 استعمل موقعي الحالي"} onPress={onLocate} disabled={busy} />
      </View>
    </Modal>
  );
}

/* ───────────────────────── auth ───────────────────────── */

function Auth({ onDone }: { onDone: (session: Session) => void }) {
  const [phoneValue, setPhoneValue] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setBusy(true);
    const result = await supabase.auth.signInWithOtp({ phone: toPhone(phoneValue) });
    setError(result.error?.message ?? "");
    if (!result.error) setSent(true);
    setBusy(false);
  }

  async function verify() {
    setBusy(true);
    const result = await supabase.auth.verifyOtp({ phone: toPhone(phoneValue), token: code.trim(), type: "sms" });
    setError(result.error?.message ?? "");
    if (result.data.session) onDone(result.data.session);
    setBusy(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.authWrap}>
        <View style={styles.logoBox}><Text style={styles.logoGlyph}>W</Text></View>
        <Text style={styles.brand}>WASSLHA</Text>
        <Text style={styles.brandSub}>كل ما تحتاج، يوصلك فبرشيد</Text>
        <Text style={styles.authTitle}>{sent ? "دخل الكود اللي توصلك" : "دخل رقم تيليفونك"}</Text>
        <TextInput
          keyboardType={sent ? "number-pad" : "phone-pad"}
          placeholder={sent ? "123456" : "06 00 00 00 00"}
          placeholderTextColor="#9CA3AF"
          value={sent ? code : phoneValue}
          onChangeText={sent ? setCode : setPhoneValue}
          style={styles.input}
          textAlign="center"
        />
        {error ? <Text style={styles.errorBox}>{error}</Text> : null}
        <Button title={busy ? "..." : sent ? "تأكيد" : "إرسال الكود"} onPress={() => void (sent ? verify() : send())} disabled={busy || (sent ? code.length < 4 : phoneValue.length < 9)} />
      </View>
    </SafeAreaView>
  );
}

/* ───────────────────────── root ───────────────────────── */

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!supabaseConfigured || !API) { setReady(true); return; }
      const result = await supabase.auth.getSession();
      if (mounted) { setSession(result.data.session); setReady(true); }
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  if (!ready) return <SafeAreaView style={styles.safe}><ActivityIndicator style={{ marginTop: 80 }} color={C.primary} /></SafeAreaView>;
  if (!supabaseConfigured || !API) return <SafeAreaView style={styles.safe}><Text style={styles.errorBox}>خص إعداد Supabase و API URL.</Text></SafeAreaView>;
  return session ? <Home session={session} /> : <Auth onDone={setSession} />;
}

/* ───────────────────────── home (all screens) ───────────────────────── */

function Home({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>("home");
  const [screen, setScreen] = useState<Screen>({ name: "tabs" });
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<GetRequest[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [tip, setTip] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [getTitle, setGetTitle] = useState("");
  const [getPlace, setGetPlace] = useState("");
  const [getItem, setGetItem] = useState("");
  const [tracking, setTracking] = useState<Record<string, Tracking>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + lineUnit(line) * line.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);
  const currentAddress = addresses.find((address) => address.id === addressId) ?? null;

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }, []);

  const load = useCallback(async () => {
    try {
      const [c, st, p, a, o, r] = await Promise.all([
        api<unknown>("categories", session),
        api<unknown>("catalog/stores?limit=30", session),
        api<unknown>("catalog/products?limit=60", session),
        api<unknown>("customer/me/addresses", session),
        api<unknown>("customer/me/orders", session),
        api<unknown>("get-requests", session),
      ]);
      const addrs = list<Address>(a);
      setCategories(list<Category>(c));
      setStores(list<Store>(st));
      setProducts(list<Product>(p));
      setAddresses(addrs);
      setOrders(list<Order>(o));
      setRequests(list<GetRequest>(r));
      setError("");
      setAddressId((current) => current ?? addrs.find((x) => x.is_default)?.id ?? addrs[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر التحميل");
    }
  }, [session]);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Android back button follows the in-app navigation.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (sheet) { setSheet(false); return true; }
      if (screen.name !== "tabs") { setScreen({ name: "tabs" }); return true; }
      if (tab !== "home") { setTab("home"); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [screen, tab, sheet]);

  // Live price quote for the cart.
  useEffect(() => {
    let dead = false;
    const timer = setTimeout(async () => {
      if (!cart.length || !addressId) { setQuote(null); return; }
      try {
        const result = await api<Quote>("orders/quote", session, {
          method: "POST",
          body: JSON.stringify({ delivery_address_id: addressId, items: cart.map((line) => ({ product_id: line.product.id, variant_id: line.variant?.id, quantity: line.quantity })), tip_minor: tip }),
        });
        if (!dead) setQuote(result);
      } catch {
        if (!dead) setQuote(null);
      }
    }, 250);
    return () => { dead = true; clearTimeout(timer); };
  }, [cart, addressId, tip, session]);

  // Live tracking of active deliveries.
  useEffect(() => {
    const active = orders.flatMap((order) => order.deliveries ?? []).filter((delivery) => ACTIVE_DELIVERY.includes(delivery.status ?? ""));
    if (!active.length) return;
    let dead = false;
    async function poll() {
      for (const delivery of active) {
        try {
          const result = await api<{ delivery: { status: string; eta_seconds: number | null; distance_meters: number | null }; location: { latitude: number; longitude: number; recorded_at: string } | null }>(`customer/me/deliveries/${delivery.id}`, session);
          if (dead || !result) return;
          setTracking((previous) => ({
            ...previous,
            [delivery.id]: { latitude: result.location?.latitude ?? 0, longitude: result.location?.longitude ?? 0, recorded_at: result.location?.recorded_at ?? "", status: result.delivery.status, eta_seconds: result.delivery.eta_seconds, distance_meters: result.delivery.distance_meters },
          }));
        } catch { /* keep the last known position */ }
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 10000);
    return () => { dead = true; clearInterval(timer); };
  }, [orders, session]);

  async function search(categoryOverride?: string | null) {
    setBusy(true);
    try {
      const chosen = categoryOverride === undefined ? categoryId : categoryOverride;
      const params = new URLSearchParams({ limit: "60" });
      if (query.trim()) params.set("q", query.trim());
      if (chosen) params.set("category_id", chosen);
      setProducts(list<Product>(await api<unknown>(`catalog/products?${params}`, session)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر البحث");
    } finally {
      setBusy(false);
    }
  }

  async function openStore(store: Store) {
    setScreen({ name: "store", store });
    setStoreProducts([]);
    try {
      setStoreProducts(list<Product>(await api<unknown>(`catalog/products?store_id=${store.id}&limit=60`, session)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل المتجر");
    }
  }

  function addToCart(product: Product, variant?: Variant) {
    if (!product.is_available) return;
    const key = lineKey(product, variant);
    setCart((previous) => {
      const found = previous.find((line) => lineKey(line.product, line.variant) === key);
      return found
        ? previous.map((line) => (lineKey(line.product, line.variant) === key ? { ...line, quantity: line.quantity + 1 } : line))
        : [...previous, { product, variant, quantity: 1 }];
    });
    notify("تزادت للسلة 🛒");
  }

  function removeFromCart(product: Product, variant?: Variant) {
    const key = lineKey(product, variant);
    setCart((previous) =>
      previous.flatMap((line) => (lineKey(line.product, line.variant) === key ? (line.quantity > 1 ? [{ ...line, quantity: line.quantity - 1 }] : []) : [line]))
    );
  }

  async function locate() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") { Alert.alert("الموقع", "سمح للتطبيق باستعمال الموقع باش نوصلو ليك."); return; }
    setBusy(true);
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      const existing = addresses.find((address) => Math.abs(address.latitude - latitude) < 0.0003 && Math.abs(address.longitude - longitude) < 0.0003);
      if (existing) { setAddressId(existing.id); setSheet(false); notify("هاد الموقع محفوظ عندك ✅"); return; }
      const created = await api<Address>("customer/me/addresses", session, {
        method: "POST",
        body: JSON.stringify({ label: "موقعي", address_text: `برشيد · ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, latitude, longitude, is_default: addresses.length === 0 }),
      });
      setAddresses((previous) => [created, ...previous]);
      setAddressId(created.id);
      setSheet(false);
      notify("تم حفظ موقعك ✅");
    } catch (e) {
      Alert.alert("الموقع", e instanceof Error ? e.message : "تعذر تحديد الموقع");
    } finally {
      setBusy(false);
    }
  }

  async function checkout() {
    if (!addressId) { setSheet(true); return; }
    if (!cart.length) return;
    if (!quote) { Alert.alert("الطلب", "كنحسبو ليك رسوم التوصيل، عاود بعد لحظة."); return; }
    const method = ONLINE_PAYMENTS_ENABLED ? paymentMethod : "cod";
    setBusy(true);
    try {
      await api("orders", session, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey() },
        body: JSON.stringify({ delivery_address_id: addressId, payment_method: method, tip_minor: tip, items: cart.map((line) => ({ product_id: line.product.id, variant_id: line.variant?.id, quantity: line.quantity })) }),
      });
      setCart([]);
      setTip(0);
      setScreen({ name: "tabs" });
      setTab("orders");
      notify(method === "online" ? "تسجل الطلب، كيتسنى الدفع" : "تسجل الطلب ✅");
      await load();
    } catch (e) {
      Alert.alert("الطلب", e instanceof Error ? e.message : "تعذر الطلب");
    } finally {
      setBusy(false);
    }
  }

  async function requestRefund(orderId: string, amount: number) {
    setBusy(true);
    try {
      await api("customer/me/refunds", session, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey() },
        body: JSON.stringify({ master_order_id: orderId, amount_minor: String(amount), reason_code: "order_cancelled", reason_text: "Customer requested refund" }),
      });
      notify("طلب الاسترجاع تسجل");
      await load();
    } catch (e) {
      Alert.alert("الاسترجاع", e instanceof Error ? e.message : "تعذر طلب الاسترجاع");
    } finally {
      setBusy(false);
    }
  }

  async function createGetRequest() {
    if (!currentAddress || !getTitle.trim() || !getItem.trim()) { Alert.alert("معلومات ناقصة", "كتب شنو بغيتي واختار العنوان."); return; }
    setBusy(true);
    try {
      const created = await api<GetRequest>("get-requests", session, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey() },
        body: JSON.stringify({ request_title: getTitle.trim(), request_description: getItem.trim(), pickup_place_name: getPlace.trim() || null, delivery_address_text: currentAddress.address_text, delivery_latitude: currentAddress.latitude, delivery_longitude: currentAddress.longitude }),
      });
      await api(`get-requests/${created.id}/items`, session, { method: "POST", body: JSON.stringify({ item_name: getItem.trim(), quantity: 1 }) });
      setGetTitle(""); setGetItem(""); setGetPlace("");
      setScreen({ name: "tabs" });
      setTab("orders");
      notify("طلب جيب ليا تسجل ✅");
      await load();
    } catch (e) {
      Alert.alert("جيب ليا", e instanceof Error ? e.message : "تعذر الطلب");
    } finally {
      setBusy(false);
    }
  }

  /* ───────── screens ───────── */

  const Header = (
    <View style={styles.header}>
      <Pressable onPress={() => setSheet(true)} style={styles.addressPill}>
        <Text style={styles.addressPillLabel}>التوصيل إلى</Text>
        <Text style={styles.addressPillValue} numberOfLines={1}>📍 {currentAddress ? currentAddress.label || currentAddress.address_text : "اختار عنوانك"} ▾</Text>
      </Pressable>
      <Pressable onPress={() => setScreen({ name: "cart" })} style={styles.cartIcon}>
        <Text style={{ fontSize: 22 }}>🛒</Text>
        {cartCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{cartCount}</Text></View> : null}
      </Pressable>
    </View>
  );

  const CartBar = cartCount > 0 && screen.name !== "cart" ? (
    <Pressable onPress={() => setScreen({ name: "cart" })} style={styles.cartBar}>
      <View style={styles.cartBarCount}><Text style={styles.cartBarCountText}>{cartCount}</Text></View>
      <Text style={styles.cartBarText}>عرض السلة</Text>
      <Text style={styles.cartBarText}>{money(subtotal)}</Text>
    </Pressable>
  ) : null;

  const Toast = toast ? <View style={styles.toast} pointerEvents="none"><Text style={styles.toastText}>{toast}</Text></View> : null;

  const sheetView = (
    <AddressSheet visible={sheet} addresses={addresses} selected={addressId} onSelect={setAddressId} onLocate={() => void locate()} onClose={() => setSheet(false)} busy={busy} />
  );

  if (screen.name === "get") {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.topBar}>
          <Pressable onPress={() => setScreen({ name: "tabs" })} hitSlop={10}><Text style={styles.back}>→</Text></Pressable>
          <Text style={styles.topTitle}>جيب ليا</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          <Text style={styles.hint}>بغيتي شي حاجة ماشي فالمتاجر؟ كتب لينا شنو بغيتي ومنين، والسائق يجيبها ليك.</Text>
          <TextInput placeholder="شنو بغيتي؟ (مثلا: دوا، قهوة...)" placeholderTextColor="#9CA3AF" value={getTitle} onChangeText={setGetTitle} style={[styles.input, styles.rtlInput]} />
          <TextInput placeholder="تفاصيل (الكمية، النوع...)" placeholderTextColor="#9CA3AF" value={getItem} onChangeText={setGetItem} multiline style={[styles.input, styles.rtlInput, { height: 90 }]} />
          <TextInput placeholder="منين نجيبوها؟ (اسم المحل)" placeholderTextColor="#9CA3AF" value={getPlace} onChangeText={setGetPlace} style={[styles.input, styles.rtlInput]} />
          <Pressable onPress={() => setSheet(true)} style={styles.addressRow}>
            <Text style={{ fontSize: 20 }}>📍</Text>
            <Text style={[styles.addressTitle, { flex: 1 }]} numberOfLines={1}>{currentAddress ? currentAddress.label || currentAddress.address_text : "اختار عنوان التوصيل"}</Text>
            <Text style={{ color: C.muted }}>تبديل</Text>
          </Pressable>
          <Button title={busy ? "..." : "إرسال الطلب"} onPress={() => void createGetRequest()} disabled={busy} />
        </ScrollView>
        {sheetView}
        {Toast}
      </SafeAreaView>
    );
  }

  if (screen.name === "store") {
    const store = screen.store;
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.topBar}>
          <Pressable onPress={() => setScreen({ name: "tabs" })} hitSlop={10}><Text style={styles.back}>→</Text></Pressable>
          <Text style={styles.topTitle} numberOfLines={1}>{store.name}</Text>
          <Pressable onPress={() => setScreen({ name: "cart" })}><Text style={{ fontSize: 22 }}>🛒</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: 130 }]}>
          <View style={[styles.storeCover, { backgroundColor: tileColor(store.name), height: 110, borderRadius: 18 }]}>
            <Text style={{ fontSize: 48 }}>🏪</Text>
          </View>
          <View style={[styles.rowBetween, { marginTop: 12 }]}>
            <Text style={styles.storeNameBig}>{store.name}</Text>
            <Pill text={store.is_accepting_orders ? "مفتوح" : "مغلق"} tone={store.is_accepting_orders ? "ok" : "danger"} />
          </View>
          <Text style={styles.storeMeta}>{store.address_text}</Text>
          <Text style={styles.sectionTitle}>المنتجات</Text>
          {storeProducts.length === 0 ? <Empty emoji="🛍️" title="ما كاين حتى منتج دابا" hint="جرب متجر آخر ولا رجع من بعد." /> : null}
          {storeProducts.map((product) => (
            <ProductRow key={product.id} product={product} cart={cart} onAdd={addToCart} onRemove={removeFromCart} />
          ))}
        </ScrollView>
        {CartBar}
        {sheetView}
        {Toast}
      </SafeAreaView>
    );
  }

  if (screen.name === "cart") {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.topBar}>
          <Pressable onPress={() => setScreen({ name: "tabs" })} hitSlop={10}><Text style={styles.back}>→</Text></Pressable>
          <Text style={styles.topTitle}>السلة</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: 40 }]}>
          {cart.length === 0 ? (
            <Empty emoji="🛒" title="السلة خاوية" hint="زيد منتجات من المتاجر باش تبدا الطلب." />
          ) : (
            <>
              {cart.map((line) => (
                <View key={lineKey(line.product, line.variant)} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{line.product.name_ar}{line.variant ? " · " + line.variant.name_ar : ""}</Text>
                      <Text style={styles.storeMeta}>{money(lineUnit(line))} × {line.quantity}</Text>
                    </View>
                    <Stepper quantity={line.quantity} onMinus={() => removeFromCart(line.product, line.variant)} onPlus={() => addToCart(line.product, line.variant)} />
                  </View>
                </View>
              ))}

              <Pressable onPress={() => setSheet(true)} style={styles.addressRow}>
                <Text style={{ fontSize: 20 }}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressTitle}>التوصيل إلى</Text>
                  <Text style={styles.addressText} numberOfLines={1}>{currentAddress ? currentAddress.label || currentAddress.address_text : "اختار عنوانك"}</Text>
                </View>
                <Text style={{ color: C.primary, fontWeight: "800" }}>تبديل</Text>
              </Pressable>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>البقشيش للسائق</Text>
                <View style={[styles.rowGap, { marginTop: 8 }]}>
                  {[0, 500, 1000, 2000].map((value) => (
                    <Pressable key={value} onPress={() => setTip(value)} style={[styles.chip, tip === value && styles.chipActive]}>
                      <Text style={[styles.chipText, tip === value && styles.chipTextActive]}>{value === 0 ? "بلا" : money(value)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>الدفع</Text>
                <View style={[styles.rowGap, { marginTop: 8 }]}>
                  <Pressable onPress={() => setPaymentMethod("cod")} style={[styles.chip, paymentMethod === "cod" && styles.chipActive]}>
                    <Text style={[styles.chipText, paymentMethod === "cod" && styles.chipTextActive]}>💵 كاش عند الاستلام</Text>
                  </Pressable>
                  {ONLINE_PAYMENTS_ENABLED ? (
                    <Pressable onPress={() => setPaymentMethod("online")} style={[styles.chip, paymentMethod === "online" && styles.chipActive]}>
                      <Text style={[styles.chipText, paymentMethod === "online" && styles.chipTextActive]}>💳 بالبطاقة</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.rowBetween}><Text style={styles.sumLabel}>المنتجات</Text><Text style={styles.sumValue}>{money(subtotal)}</Text></View>
                <View style={styles.rowBetween}><Text style={styles.sumLabel}>التوصيل</Text><Text style={styles.sumValue}>{quote ? money(quote.delivery_fee_minor) : "..."}</Text></View>
                <View style={styles.rowBetween}><Text style={styles.sumLabel}>رسوم الخدمة</Text><Text style={styles.sumValue}>{quote ? money(quote.service_fee_minor) : "..."}</Text></View>
                {tip > 0 ? <View style={styles.rowBetween}><Text style={styles.sumLabel}>البقشيش</Text><Text style={styles.sumValue}>{money(tip)}</Text></View> : null}
                <View style={styles.divider} />
                <View style={styles.rowBetween}>
                  <Text style={styles.totalLabel}>المجموع</Text>
                  <Text style={styles.totalValue}>{quote ? money(quote.total_minor) : "..."}</Text>
                </View>
                {quote?.eta_seconds ? <Text style={styles.storeMeta}>🛵 الوصول فحوالي {Math.max(1, Math.round(quote.eta_seconds / 60))} دقيقة</Text> : null}
              </View>

              <Button title={busy ? "..." : quote ? `تأكيد الطلب · ${money(quote.total_minor)}` : "تأكيد الطلب"} onPress={() => void checkout()} disabled={busy || !cart.length || (!!addressId && !quote)} />
            </>
          )}
        </ScrollView>
        {sheetView}
        {Toast}
      </SafeAreaView>
    );
  }

  const tabs: Array<{ key: Tab; label: string; icon: string }> = [
    { key: "home", label: "الرئيسية", icon: "🏠" },
    { key: "search", label: "بحث", icon: "🔍" },
    { key: "orders", label: "طلباتي", icon: "🧾" },
    { key: "profile", label: "حسابي", icon: "👤" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      {Header}
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: 150 }]} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={C.primary} colors={[C.primary]} />}>
        {error ? <Text style={styles.errorBox} onPress={() => void refresh()}>{error} — اضغط باش تعاود</Text> : null}

        {tab === "home" ? (
          <>
            <Pressable onPress={() => setTab("search")} style={styles.searchBar}>
              <Text style={{ fontSize: 16 }}>🔍</Text>
              <Text style={styles.searchPlaceholder}>قلب على منتج ولا متجر...</Text>
            </Pressable>

            <Pressable onPress={() => setScreen({ name: "get" })} style={styles.banner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>جيب ليا</Text>
                <Text style={styles.bannerText}>بغيتي شي حاجة من أي محل؟ كتب شنو بغيتي والسائق يجيبها ليك.</Text>
              </View>
              <Text style={{ fontSize: 46 }}>🛵</Text>
            </Pressable>

            {categories.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>التصنيفات</Text>
                <View style={styles.grid}>
                  {categories.map((category) => (
                    <Pressable key={category.id} onPress={() => { setCategoryId(category.id); setTab("search"); void search(category.id); }} style={styles.gridItem}>
                      <View style={styles.gridIcon}><Text style={{ fontSize: 28 }}>{categoryEmoji(category)}</Text></View>
                      <Text style={styles.gridLabel} numberOfLines={1}>{category.name_ar}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <Text style={styles.sectionTitle}>المتاجر قريبة منك</Text>
            {loading ? <ActivityIndicator color={C.primary} style={{ marginVertical: 20 }} /> : null}
            {!loading && stores.length === 0 ? <Empty emoji="🏪" title="ما كاين حتى متجر دابا" hint="المتاجر غادي يبانو هنا ملي يتسجلو." /> : null}
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} onPress={() => void openStore(store)} />
            ))}

            {products.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>منتجات مقترحة</Text>
                {products.slice(0, 8).map((product) => (
                  <ProductRow key={product.id} product={product} cart={cart} onAdd={addToCart} onRemove={removeFromCart} />
                ))}
              </>
            ) : null}
          </>
        ) : null}

        {tab === "search" ? (
          <>
            <View style={styles.searchInputRow}>
              <TextInput
                placeholder="قلب على منتج..."
                placeholderTextColor="#9CA3AF"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => void search()}
                returnKeyType="search"
                style={[styles.searchInput, styles.rtlInput]}
              />
              <Button title="بحث" onPress={() => void search()} small />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <Pressable onPress={() => { setCategoryId(null); void search(null); }} style={[styles.chip, categoryId === null && styles.chipActive]}>
                <Text style={[styles.chipText, categoryId === null && styles.chipTextActive]}>الكل</Text>
              </Pressable>
              {categories.map((category) => (
                <Pressable key={category.id} onPress={() => { setCategoryId(category.id); void search(category.id); }} style={[styles.chip, categoryId === category.id && styles.chipActive]}>
                  <Text style={[styles.chipText, categoryId === category.id && styles.chipTextActive]}>{categoryEmoji(category)} {category.name_ar}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {busy ? <ActivityIndicator color={C.primary} style={{ marginVertical: 16 }} /> : null}
            {!busy && products.length === 0 ? <Empty emoji="🔎" title="ما لقينا والو" hint="جرب كلمة أخرى ولا تصنيف آخر." /> : null}
            {products.map((product) => (
              <ProductRow key={product.id} product={product} cart={cart} onAdd={addToCart} onRemove={removeFromCart} />
            ))}
          </>
        ) : null}

        {tab === "orders" ? (
          <>
            <Text style={styles.pageTitle}>طلباتي</Text>
            {orders.length === 0 && requests.length === 0 ? <Empty emoji="🧾" title="ما عندك حتى طلب" hint="غاتبان هنا الطلبات ديالك وتتبعها مباشرة." /> : null}
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} tracking={tracking} onRefund={(id, amount) => void requestRefund(id, amount)} />
            ))}
            {requests.map((request) => (
              <View key={request.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>🛵 جيب ليا</Text>
                  <Pill text={request.status} tone="warn" />
                </View>
                <Text style={styles.storeMeta}>{request.request_title}</Text>
              </View>
            ))}
          </>
        ) : null}

        {tab === "profile" ? (
          <>
            <Text style={styles.pageTitle}>حسابي</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>عناويني</Text>
              {addresses.length === 0 ? <Text style={styles.storeMeta}>ما عندك حتى عنوان.</Text> : null}
              {addresses.map((address) => (
                <Pressable key={address.id} onPress={() => setAddressId(address.id)} style={[styles.addressRow, addressId === address.id && styles.addressRowActive]}>
                  <Text style={{ fontSize: 20 }}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addressTitle}>{address.label || "العنوان"}</Text>
                    <Text style={styles.addressText} numberOfLines={1}>{address.address_text}</Text>
                  </View>
                  <Text style={{ color: C.primary }}>{addressId === address.id ? "●" : "○"}</Text>
                </Pressable>
              ))}
              <Button title={busy ? "..." : "📍 زيد موقعي الحالي"} variant="ghost" onPress={() => void locate()} disabled={busy} />
            </View>
            <Button title="تسجيل الخروج" variant="danger" onPress={() => void supabase.auth.signOut()} />
          </>
        ) : null}
      </ScrollView>

      {CartBar}
      <View style={styles.tabBar}>
        {tabs.map((item) => (
          <Pressable key={item.key} onPress={() => setTab(item.key)} style={styles.tabItem}>
            <Text style={{ fontSize: 20, opacity: tab === item.key ? 1 : 0.5 }}>{item.icon}</Text>
            <Text style={[styles.tabLabel, tab === item.key && styles.tabLabelActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      {sheetView}
      {Toast}
    </SafeAreaView>
  );
}

/* ───────────────────────── styles ───────────────────────── */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16 },
  rtlInput: { textAlign: "right" },

  /* auth */
  authWrap: { flex: 1, padding: 24, justifyContent: "center" },
  logoBox: { width: 72, height: 72, borderRadius: 22, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  logoGlyph: { color: "#fff", fontSize: 38, fontWeight: "900" },
  brand: { textAlign: "center", fontSize: 28, fontWeight: "900", color: C.ink, marginTop: 12, letterSpacing: 1 },
  brandSub: { textAlign: "center", color: C.muted, marginTop: 4, marginBottom: 28 },
  authTitle: { textAlign: "center", fontSize: 18, fontWeight: "800", color: C.ink, marginBottom: 8 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, marginVertical: 6, fontSize: 16, color: C.ink },
  errorBox: { backgroundColor: C.dangerSoft, color: C.danger, padding: 12, borderRadius: 12, marginVertical: 8, textAlign: "center", overflow: "hidden" },

  /* buttons & small bits */
  button: { backgroundColor: C.primary, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, alignItems: "center", marginVertical: 6 },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, marginVertical: 0 },
  buttonGhost: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  buttonDanger: { backgroundColor: C.dangerSoft },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 11, fontWeight: "800" },
  chip: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginHorizontal: 4 },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { color: C.ink, fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  rowBetween: { flexDirection: ROW, alignItems: "center", justifyContent: "space-between", gap: 10 },
  rowGap: { flexDirection: ROW, alignItems: "center", gap: 10, flexWrap: "wrap" },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 10 },
  hint: { color: C.muted, textAlign: "right", lineHeight: 22, marginBottom: 10 },

  /* header */
  header: { flexDirection: ROW, alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  addressPill: { flex: 1, alignItems: I18nManager.isRTL ? "flex-start" : "flex-end", paddingRight: 8 },
  addressPillLabel: { fontSize: 11, color: C.muted, fontWeight: "700" },
  addressPillValue: { fontSize: 15, fontWeight: "900", color: C.ink, maxWidth: 240 },
  cartIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line },
  badge: { position: "absolute", top: -4, right: -4, backgroundColor: C.primary, minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  topBar: { flexDirection: ROW, alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  topTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "900", color: C.ink, marginHorizontal: 8 },
  back: { fontSize: 24, color: C.ink, fontWeight: "800", width: 24 },

  /* home */
  searchBar: { flexDirection: ROW, alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 14 },
  searchPlaceholder: { color: "#9CA3AF", fontSize: 15 },
  banner: { flexDirection: ROW, alignItems: "center", gap: 12, backgroundColor: C.primary, borderRadius: 22, padding: 18, marginBottom: 6 },
  bannerTitle: { color: "#fff", fontSize: 24, fontWeight: "900", textAlign: "right" },
  bannerText: { color: "#FFE6D5", marginTop: 4, textAlign: "right", lineHeight: 20 },
  sectionTitle: { fontSize: 19, fontWeight: "900", color: C.ink, marginTop: 20, marginBottom: 10, textAlign: "right" },
  pageTitle: { fontSize: 26, fontWeight: "900", color: C.ink, marginBottom: 12, textAlign: "right" },
  grid: { flexDirection: ROW, flexWrap: "wrap", justifyContent: "flex-start" },
  gridItem: { width: "25%", alignItems: "center", marginBottom: 14 },
  gridIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  gridLabel: { marginTop: 6, fontSize: 12, fontWeight: "800", color: C.ink, maxWidth: 80, textAlign: "center" },

  /* stores */
  storeCard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, marginBottom: 12, overflow: "hidden" },
  storeCover: { height: 96, alignItems: "center", justifyContent: "center" },
  storeBadge: { position: "absolute", top: 10, right: 10 },
  storeName: { fontSize: 17, fontWeight: "900", color: C.ink, textAlign: "right" },
  storeNameBig: { fontSize: 22, fontWeight: "900", color: C.ink, flex: 1, textAlign: "right" },
  storeMeta: { color: C.muted, fontSize: 13, textAlign: "right", marginTop: 2 },

  /* products */
  productCard: { flexDirection: ROW, alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 12, marginBottom: 10 },
  productTile: { width: 72, height: 72, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  productName: { fontSize: 15, fontWeight: "900", color: C.ink, textAlign: "right" },
  productSub: { fontSize: 12, color: C.muted, textAlign: "right", marginTop: 1 },
  productPrice: { fontSize: 15, fontWeight: "900", color: C.primaryDark, textAlign: "right", marginTop: 4 },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  addGlyph: { color: "#fff", fontSize: 24, fontWeight: "900", marginTop: -2 },
  stepper: { flexDirection: ROW, alignItems: "center", backgroundColor: C.primarySoft, borderRadius: 20, paddingHorizontal: 4 },
  stepperBtn: { width: 32, height: 34, alignItems: "center", justifyContent: "center" },
  stepperGlyph: { fontSize: 20, fontWeight: "900", color: C.primaryDark },
  stepperQty: { minWidth: 22, textAlign: "center", fontWeight: "900", color: C.ink },

  /* cards, orders */
  card: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: "900", color: C.ink, textAlign: "right" },
  orderTotal: { fontSize: 20, fontWeight: "900", color: C.ink, marginTop: 6, textAlign: "right" },
  timeline: { flexDirection: ROW, justifyContent: "space-between", marginTop: 14 },
  timelineItem: { alignItems: "center", flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#E5E0D7", marginBottom: 6 },
  dotActive: { backgroundColor: C.primary },
  timelineLabel: { fontSize: 10, color: C.muted, textAlign: "center" },
  trackBox: { flexDirection: ROW, alignItems: "center", gap: 10, backgroundColor: C.primarySoft, borderRadius: 14, padding: 12, marginTop: 12 },
  trackTitle: { fontWeight: "900", color: C.ink, textAlign: "right" },
  trackSub: { color: C.muted, fontSize: 12, textAlign: "right", marginTop: 2 },
  live: { color: C.ok, fontSize: 11, fontWeight: "800", textAlign: "right", marginTop: 4 },
  sumLabel: { color: C.muted, fontSize: 14, paddingVertical: 3 },
  sumValue: { color: C.ink, fontWeight: "800", fontSize: 14 },
  totalLabel: { fontSize: 17, fontWeight: "900", color: C.ink },
  totalValue: { fontSize: 20, fontWeight: "900", color: C.primaryDark },

  /* search */
  searchInputRow: { flexDirection: ROW, alignItems: "center", gap: 8, marginBottom: 10 },
  searchInput: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, fontSize: 15, color: C.ink },

  /* empty */
  empty: { alignItems: "center", paddingVertical: 36 },
  emptyTitle: { fontSize: 17, fontWeight: "900", color: C.ink, marginTop: 8 },
  emptyHint: { color: C.muted, marginTop: 4, textAlign: "center", lineHeight: 20 },

  /* sheets, bars, toast */
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 28 },
  sheetHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: "900", color: C.ink, textAlign: "right", marginBottom: 10 },
  addressRow: { flexDirection: ROW, alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, marginVertical: 5 },
  addressRowActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  addressTitle: { fontWeight: "900", color: C.ink, textAlign: "right" },
  addressText: { color: C.muted, fontSize: 12, textAlign: "right", marginTop: 1 },
  cartBar: { position: "absolute", left: 16, right: 16, bottom: 84, backgroundColor: C.ink, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, flexDirection: ROW, alignItems: "center", justifyContent: "space-between" },
  cartBarCount: { backgroundColor: C.primary, borderRadius: 12, minWidth: 26, height: 26, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  cartBarCountText: { color: "#fff", fontWeight: "900" },
  cartBarText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  tabBar: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line, flexDirection: ROW, justifyContent: "space-around", paddingTop: 8, paddingBottom: 12 },
  tabItem: { alignItems: "center", minWidth: 64 },
  tabLabel: { fontSize: 11, color: C.muted, fontWeight: "700", marginTop: 2 },
  tabLabelActive: { color: C.primaryDark, fontWeight: "900" },
  toast: { position: "absolute", left: 24, right: 24, bottom: 150, backgroundColor: "rgba(27,27,31,0.92)", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
  toastText: { color: "#fff", textAlign: "center", fontWeight: "800" },
});
