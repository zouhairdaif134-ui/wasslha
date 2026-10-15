import { useEffect, useMemo, useState } from "react";
import * as Location from "expo-location";
import { ActivityIndicator, Alert, BackHandler, StatusBar, StyleSheet, Text, View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./src/lib/supabase";
import { API, ONLINE_PAYMENTS_ENABLED, api, idempotencyKey, list } from "./src/lib/http";
import { ACTIVE_DELIVERY, categoryEmoji, lineKey, lineUnit } from "./src/lib/format";
import type { Address, CartLine, Category, GetRequest, Order, Product, Quote, Screen, Store, Tracking, Variant } from "./src/lib/types";
import { C, TOP } from "./src/theme";
import { AddressSheet, CartBar, ProductSheet } from "./src/components/cards";
import { AuthScreen } from "./src/screens/AuthScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { CategoryScreen, SearchScreen, StoreScreen } from "./src/screens/BrowseScreens";
import { CartScreen, GetScreen, OrdersScreen, ProfileScreen } from "./src/screens/AccountScreens";
import { Screen as Frame } from "./src/components/ui";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!supabaseConfigured || !API) { setReady(true); return; }
      const r = await supabase.auth.getSession();
      if (mounted) { setSession(r.data.session); setReady(true); }
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {!ready ? (
        <View style={st.center}><ActivityIndicator color={C.primary} size="large" /></View>
      ) : !supabaseConfigured || !API ? (
        <View style={st.center}><Text style={{ color: C.danger }}>خص إعداد Supabase و API URL.</Text></View>
      ) : session ? (
        <Shell session={session} />
      ) : (
        <AuthScreen onDone={setSession} />
      )}
    </View>
  );
}

function Shell({ session }: { session: Session }) {
  const [stack, setStack] = useState<Screen[]>([{ name: "home" }]);
  const [cats, setCats] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<GetRequest[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [address, setAddress] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [tip, setTip] = useState(0);
  const [tracking, setTracking] = useState<Record<string, Tracking>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [addressSheet, setAddressSheet] = useState(false);
  const [sheetProduct, setSheetProduct] = useState<Product | null>(null);

  const [catStores, setCatStores] = useState<Store[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState("");
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState("");
  const [q, setQ] = useState("");
  const [searchProducts, setSearchProducts] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [getTitle, setGetTitle] = useState("");
  const [getItem, setGetItem] = useState("");
  const [getPlace, setGetPlace] = useState("");

  const screen = stack[stack.length - 1];
  const current = addresses.find((a) => a.id === address) ?? null;
  const addressLabel = current ? (current.label || current.address_text) : "اختار عنوانك";
  const subtotal = useMemo(() => cart.reduce((x, l) => x + lineUnit(l) * l.quantity, 0), [cart]);
  const cartCount = cart.reduce((x, l) => x + l.quantity, 0);
  const geo = current ? `&lat=${Number(current.latitude)}&lon=${Number(current.longitude)}` : "";
  const activeOrders = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled" && o.status !== "failed").length;

  const push = (s: Screen) => setStack((x) => [...x, s]);
  const pop = () => setStack((x) => (x.length > 1 ? x.slice(0, -1) : x));
  const goHomeThen = (s: Screen) => setStack([{ name: "home" }, s]);
  function notify(text: string) { setToast(text); setTimeout(() => setToast(""), 2600); }
  const emojiOf = (p: Product) => categoryEmoji(cats.find((c) => c.id === p.category_id) ?? null) ;
  const qtyOf = (productId: string) => cart.filter((l) => l.product.id === productId).reduce((x, l) => x + l.quantity, 0);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (sheetProduct) { setSheetProduct(null); return true; }
      if (addressSheet) { setAddressSheet(false); return true; }
      if (stack.length > 1) { setStack((x) => x.slice(0, -1)); return true; }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, sheetProduct, addressSheet]);

  /* ── data loading ── */
  async function loadAccount() {
    try {
      const [a, o, r] = await Promise.all([
        api<unknown>("customer/me/addresses", session),
        api<unknown>("customer/me/orders", session),
        api<unknown>("get-requests", session),
      ]);
      const addrs = list<Address>(a);
      setAddresses(addrs);
      setOrders(list<Order>(o));
      setRequests(list<GetRequest>(r));
      if (!address && addrs.length) setAddress((addrs.find((x) => x.is_default) ?? addrs[0]).id);
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر التحميل"); }
  }
  async function loadCatalog() {
    try {
      const [c, s] = await Promise.all([
        api<unknown>("categories", session),
        api<unknown>(`catalog/stores?limit=30${geo}`, session),
      ]);
      setCats(list<Category>(c));
      setStores(list<Store>(s));
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر التحميل"); }
  }
  async function refreshAll() {
    setRefreshing(true);
    await Promise.all([loadAccount(), loadCatalog()]);
    setRefreshing(false);
  }
  useEffect(() => { void (async () => { await loadAccount(); setLoading(false); })(); }, []);
  useEffect(() => { void loadCatalog(); }, [address]);

  useEffect(() => {
    let dead = false;
    const timer = setTimeout(async () => {
      if (!cart.length || !address) { setQuote(null); return; }
      try {
        const qt = await api<Quote>("orders/quote", session, {
          method: "POST",
          body: JSON.stringify({
            delivery_address_id: address,
            items: cart.map((l) => ({ product_id: l.product.id, variant_id: l.variant?.id, quantity: l.quantity })),
            tip_minor: tip,
          }),
        });
        if (!dead) setQuote(qt);
      } catch { if (!dead) setQuote(null); }
    }, 250);
    return () => { dead = true; clearTimeout(timer); };
  }, [cart, address, tip, session]);

  useEffect(() => {
    const active = orders.flatMap((o) => o.deliveries ?? []).filter((d) => ACTIVE_DELIVERY.includes(d.status ?? ""));
    if (!active.length) return;
    let dead = false;
    async function refresh() {
      for (const d of active) {
        try {
          const p = await api<{
            delivery: { status: string; eta_seconds: number | null; distance_meters: number | null };
            location: { latitude: number; longitude: number; recorded_at: string } | null;
          }>(`customer/me/deliveries/${d.id}`, session);
          if (!dead && p) {
            setTracking((v) => ({
              ...v,
              [d.id]: {
                latitude: p.location?.latitude ?? 0, longitude: p.location?.longitude ?? 0,
                recorded_at: p.location?.recorded_at ?? "", status: p.delivery.status,
                eta_seconds: p.delivery.eta_seconds, distance_meters: p.delivery.distance_meters,
              },
            }));
          }
        } catch { /* keep last known tracking */ }
      }
    }
    void refresh();
    const t = setInterval(() => void refresh(), 10000);
    return () => { dead = true; clearInterval(t); };
  }, [orders, session]);

  // live search (debounced)
  useEffect(() => {
    if (screen.name !== "search") return;
    const term = q.trim();
    if (term.length < 2) { setSearchProducts([]); return; }
    let dead = false;
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const r = await api<unknown>(`catalog/products?q=${encodeURIComponent(term)}&limit=40${geo}`, session);
        if (!dead) setSearchProducts(list<Product>(r));
      } catch { if (!dead) setSearchProducts([]); } finally { if (!dead) setSearchLoading(false); }
    }, 350);
    return () => { dead = true; clearTimeout(timer); };
  }, [q, screen.name]);

  /* ── navigation actions ── */
  async function openCategory(category: Category) {
    push({ name: "category", category });
    setCatStores([]); setCatError(""); setCatLoading(true);
    try {
      const r = list<Product>(await api<unknown>(`catalog/products?category_id=${category.id}&limit=100${geo}`, session));
      const seen = new Set<string>();
      const result: Store[] = [];
      for (const p of r) {
        if (seen.has(p.store_id)) continue;
        seen.add(p.store_id);
        result.push(stores.find((s) => s.id === p.store_id) ?? { id: p.store_id, name: p.store_name ?? "متجر", address_text: "", is_accepting_orders: true });
      }
      setCatStores(result);
    } catch (e) { setCatError(e instanceof Error ? e.message : "تعذر التحميل"); } finally { setCatLoading(false); }
  }
  async function openStore(store: Store) {
    push({ name: "store", store });
    setStoreProducts([]); setStoreError(""); setStoreLoading(true);
    try {
      setStoreProducts(list<Product>(await api<unknown>(`catalog/products?store_id=${store.id}&limit=100`, session)));
    } catch (e) { setStoreError(e instanceof Error ? e.message : "تعذر التحميل"); } finally { setStoreLoading(false); }
  }

  /* ── cart ── */
  function addLine(product: Product, variant: Variant | undefined, quantity: number) {
    if (!product.is_available) return;
    const key = lineKey(product, variant);
    setCart((x) => {
      const found = x.find((l) => lineKey(l.product, l.variant) === key);
      return found
        ? x.map((l) => (lineKey(l.product, l.variant) === key ? { ...l, quantity: l.quantity + quantity } : l))
        : [...x, { product, variant, quantity }];
    });
    notify("تزاد للسلة ✓");
  }
  function changeLine(line: CartLine, delta: number) {
    const key = lineKey(line.product, line.variant);
    setCart((x) => x.flatMap((l) => (lineKey(l.product, l.variant) === key ? (l.quantity + delta > 0 ? [{ ...l, quantity: l.quantity + delta }] : []) : [l])));
  }
  function quickAdd(product: Product) {
    if (product.variants && product.variants.length > 0) { setSheetProduct(product); return; }
    addLine(product, undefined, 1);
  }

  /* ── location ── */
  async function useMyLocation() {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") { Alert.alert("الموقع", "خاصك تسمح بالموقع باش نعرفو فين غادي نوصلو ليك."); return; }
      setBusy(true);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      const near = addresses.find((a) => Math.abs(Number(a.latitude) - latitude) < 0.0003 && Math.abs(Number(a.longitude) - longitude) < 0.0003);
      if (near) { setAddress(near.id); setAddressSheet(false); notify("تم اختيار موقعك الحالي ✓"); return; }
      const created = await api<Address>("customer/me/addresses", session, {
        method: "POST",
        body: JSON.stringify({
          label: "موقعي", address_text: `موقعي (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          latitude, longitude, is_default: addresses.length === 0,
        }),
      });
      setAddresses((v) => [created, ...v]);
      setAddress(created.id);
      setAddressSheet(false);
      notify("تم حفظ موقعك ✓");
    } catch (e) {
      Alert.alert("الموقع", e instanceof Error ? e.message : "تعذر تحديد الموقع");
    } finally { setBusy(false); }
  }

  /* ── orders ── */
  async function checkout() {
    if (!address) { setAddressSheet(true); return; }
    if (!cart.length) return;
    if (!quote) { notify("جاري حساب رسوم التوصيل..."); return; }
    setBusy(true);
    try {
      await api("orders", session, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey() },
        body: JSON.stringify({
          delivery_address_id: address,
          payment_method: ONLINE_PAYMENTS_ENABLED ? "online" : "cod",
          tip_minor: tip,
          items: cart.map((l) => ({ product_id: l.product.id, variant_id: l.variant?.id, quantity: l.quantity })),
        }),
      });
      setCart([]); setTip(0);
      goHomeThen({ name: "orders" });
      notify("تسجل طلبك بنجاح ✓");
      await loadAccount();
    } catch (e) { Alert.alert("الطلب", e instanceof Error ? e.message : "تعذر الطلب"); } finally { setBusy(false); }
  }
  async function requestRefund(orderId: string, amount: number) {
    setBusy(true);
    try {
      await api("customer/me/refunds", session, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey() },
        body: JSON.stringify({ master_order_id: orderId, amount_minor: String(amount), reason_code: "order_cancelled", reason_text: "Customer requested refund" }),
      });
      notify("طلب الاسترجاع تسجل ✓");
      await loadAccount();
    } catch (e) { Alert.alert("الاسترجاع", e instanceof Error ? e.message : "تعذر طلب الاسترجاع"); } finally { setBusy(false); }
  }
  async function createGetRequest() {
    if (!current || !getTitle.trim() || !getItem.trim()) { Alert.alert("معلومات ناقصة", "كتب شنو بغيتي واختار العنوان."); return; }
    setBusy(true);
    try {
      const r = await api<GetRequest>("get-requests", session, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey() },
        body: JSON.stringify({
          request_title: getTitle.trim(), request_description: getItem.trim(), pickup_place_name: getPlace.trim() || null,
          delivery_address_text: current.address_text, delivery_latitude: current.latitude, delivery_longitude: current.longitude,
        }),
      });
      await api(`get-requests/${r.id}/items`, session, { method: "POST", body: JSON.stringify({ item_name: getItem.trim(), quantity: 1 }) });
      setGetTitle(""); setGetItem(""); setGetPlace("");
      goHomeThen({ name: "orders" });
      notify("تسجل طلب جيب ليا ✓");
      await loadAccount();
    } catch (e) { Alert.alert("جيب ليا", e instanceof Error ? e.message : "تعذر الطلب"); } finally { setBusy(false); }
  }

  /* ── render ── */
  const cartBar = cartCount > 0 ? <CartBar count={cartCount} total={subtotal} onPress={() => push({ name: "cart" })} /> : null;

  let body;
  switch (screen.name) {
    case "category":
      body = <CategoryScreen category={screen.category} stores={catStores} loading={catLoading} error={catError} cartBar={cartBar} onBack={pop} onStore={(s) => void openStore(s)} />;
      break;
    case "store":
      body = <StoreScreen store={screen.store} products={storeProducts} cats={cats} loading={storeLoading} error={storeError} cartBar={cartBar} qtyOf={qtyOf} emojiOf={emojiOf} onBack={pop} onOpen={setSheetProduct} onQuickAdd={quickAdd} />;
      break;
    case "search":
      body = <SearchScreen q={q} setQ={setQ} products={searchProducts} stores={stores} loading={searchLoading} cartBar={cartBar} qtyOf={qtyOf} emojiOf={emojiOf} onBack={pop} onStore={(s) => void openStore(s)} onOpen={setSheetProduct} onQuickAdd={quickAdd} />;
      break;
    case "cart":
      body = <CartScreen lines={cart} quote={quote} subtotal={subtotal} tip={tip} setTip={setTip} addressLabel={addressLabel} hasAddress={!!address} busy={busy} onBack={pop} onAddress={() => setAddressSheet(true)} onPlus={(l) => changeLine(l, 1)} onMinus={(l) => changeLine(l, -1)} onCheckout={() => void checkout()} />;
      break;
    case "orders":
      body = <OrdersScreen orders={orders} requests={requests} tracking={tracking} refreshing={refreshing} onBack={pop} onRefresh={() => void refreshAll()} onRefund={(id, amount) => void requestRefund(id, amount)} />;
      break;
    case "profile":
      body = <ProfileScreen phone={session.user.phone ? `+${session.user.phone.replace(/^\+/, "")}` : ""} addresses={addresses} selected={address} busy={busy} onBack={pop} onSelect={setAddress} onLocate={() => void useMyLocation()} onSignOut={() => void supabase.auth.signOut()} />;
      break;
    case "get":
      body = <GetScreen title={getTitle} setTitle={setGetTitle} item={getItem} setItem={setGetItem} place={getPlace} setPlace={setGetPlace} addressLabel={addressLabel} busy={busy} onBack={pop} onAddress={() => setAddressSheet(true)} onSubmit={() => void createGetRequest()} />;
      break;
    default:
      body = (
        <Frame>
          <HomeScreen addressLabel={addressLabel} cats={cats} stores={stores} loading={loading} error={error} refreshing={refreshing} activeOrders={activeOrders} cartBar={cartBar}
            onAddress={() => setAddressSheet(true)} onSearch={() => push({ name: "search" })} onOrders={() => push({ name: "orders" })} onProfile={() => push({ name: "profile" })}
            onCategory={(c) => void openCategory(c)} onGet={() => push({ name: "get" })} onStore={(s) => void openStore(s)} onRefresh={() => void refreshAll()} />
        </Frame>
      );
  }

  return (
    <View style={{ flex: 1 }}>
      {body}
      <ProductSheet product={sheetProduct} emoji={sheetProduct ? emojiOf(sheetProduct) : "🛍️"} onClose={() => setSheetProduct(null)} onAdd={addLine} />
      <AddressSheet visible={addressSheet} addresses={addresses} selected={address} onSelect={setAddress} onLocate={() => void useMyLocation()} onClose={() => setAddressSheet(false)} busy={busy} />
      {toast ? <View style={st.toast}><Text style={st.toastText}>{toast}</Text></View> : null}
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  toast: { position: "absolute", top: TOP + 10, left: 16, right: 16, backgroundColor: C.ink, borderRadius: 16, padding: 14 },
  toastText: { color: "#fff", fontWeight: "800", textAlign: "center" },
});
