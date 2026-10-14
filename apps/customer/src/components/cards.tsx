import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { C, ROW } from "../theme";
import type { Address, Order, Product, Store, Tracking, Variant } from "../lib/types";
import { ACTIVE_DELIVERY, ORDER_STEPS, awaitingPayment, distanceLabel, etaLabel, money, orderStatusLabel, orderStep } from "../lib/format";
import { Button, Cover, Pill, Stepper } from "./ui";

export function StoreCard({ store, onPress }: { store: Store; onPress: () => void }) {
  const eta = etaLabel(store.distance_meters);
  const km = distanceLabel(store.distance_meters);
  return (
    <Pressable onPress={onPress} style={k.storeCard}>
      <View>
        <Cover uri={store.image_url} emoji="🏪" seed={store.name} height={132} radius={0} />
        <View style={k.storeStatus}>
          <Pill text={store.is_accepting_orders ? "مفتوح" : "مغلق"} tone={store.is_accepting_orders ? "ok" : "danger"} />
        </View>
      </View>
      <View style={k.storeBody}>
        <Text style={k.storeName} numberOfLines={1}>{store.name}</Text>
        <Text style={k.sub} numberOfLines={1}>{store.address_text}</Text>
        <View style={k.metaRow}>
          <Text style={k.meta}>{store.rating ? `⭐ ${store.rating.toFixed(1)}` : "✨ جديد"}</Text>
          {eta ? <Text style={k.meta}>🕒 {eta}</Text> : null}
          {km ? <Text style={k.meta}>📍 {km}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

export function ProductRow({ product, emoji, qty, onOpen, onQuickAdd }: {
  product: Product; emoji: string; qty: number; onOpen: (p: Product) => void; onQuickAdd: (p: Product) => void;
}) {
  const hasDiscount = !!product.compare_at_price_minor && product.compare_at_price_minor > product.price_minor;
  return (
    <Pressable onPress={() => onOpen(product)} style={k.productRow}>
      <View style={{ flex: 1 }}>
        <Text style={k.productName} numberOfLines={2}>{product.name_ar}</Text>
        {product.description_ar ? <Text style={k.sub} numberOfLines={2}>{product.description_ar}</Text> : product.name_fr ? <Text style={k.sub} numberOfLines={1}>{product.name_fr}</Text> : null}
        <View style={k.priceRow}>
          <Text style={k.price}>{money(product.price_minor)}</Text>
          {hasDiscount ? <Text style={k.oldPrice}>{money(product.compare_at_price_minor ?? 0)}</Text> : null}
        </View>
        {!product.is_available ? <Text style={k.unavailable}>غير متوفر دابا</Text> : null}
      </View>
      <View>
        <Cover uri={product.image_url} emoji={emoji} seed={product.name_fr || product.name_ar} height={88} width={88} radius={16} />
        <Pressable disabled={!product.is_available} onPress={() => onQuickAdd(product)} style={[k.plus, !product.is_available && { opacity: 0.4 }]}>
          <Text style={k.plusText}>{qty > 0 ? qty : "+"}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export function ProductSheet({ product, emoji, onClose, onAdd }: {
  product: Product | null; emoji: string; onClose: () => void; onAdd: (product: Product, variant: Variant | undefined, quantity: number) => void;
}) {
  return (
    <Modal visible={!!product} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={k.backdrop} onPress={onClose} />
      {product ? <ProductSheetBody key={product.id} product={product} emoji={emoji} onClose={onClose} onAdd={onAdd} /> : null}
    </Modal>
  );
}

function ProductSheetBody({ product, emoji, onClose, onAdd }: {
  product: Product; emoji: string; onClose: () => void; onAdd: (product: Product, variant: Variant | undefined, quantity: number) => void;
}) {
  const [variantId, setVariantId] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const variants = product.variants ?? [];
  const selected = variants.find((v) => v.id === variantId);
  const needVariant = variants.length > 0 && !selected;
  const unit = selected?.price_minor ?? product.price_minor;
  return (
    <View style={k.sheet}>
      <View style={k.handle} />
      <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
        <Cover uri={product.image_url} emoji={emoji} seed={product.name_fr || product.name_ar} height={170} radius={20} />
        <Text style={k.sheetTitle}>{product.name_ar}</Text>
        {product.name_fr ? <Text style={k.sub}>{product.name_fr}</Text> : null}
        {product.description_ar ? <Text style={[k.sub, { marginTop: 6 }]}>{product.description_ar}</Text> : null}
        <Text style={[k.price, { marginTop: 10, fontSize: 18 }]}>{money(unit)}</Text>
        {variants.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <Text style={k.groupLabel}>اختار</Text>
            {variants.map((v) => (
              <Pressable key={v.id} disabled={!v.is_available} onPress={() => setVariantId(v.id)} style={[k.variantRow, variantId === v.id && k.variantRowOn, !v.is_available && { opacity: 0.4 }]}>
                <Text style={[k.radio, variantId === v.id && { color: C.primary }]}>{variantId === v.id ? "●" : "○"}</Text>
                <Text style={k.variantName}>{v.name_ar}</Text>
                <Text style={k.variantPrice}>{money(v.price_minor)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View style={k.sheetFooter}>
        <Stepper quantity={quantity} onMinus={() => setQuantity((q) => Math.max(1, q - 1))} onPlus={() => setQuantity((q) => Math.min(50, q + 1))} />
        <View style={{ flex: 1 }}>
          <Button
            title={needVariant ? "اختار أولا" : `زيد للسلة · ${money(unit * quantity)}`}
            disabled={needVariant || !product.is_available}
            onPress={() => { onAdd(product, selected, quantity); onClose(); }}
          />
        </View>
      </View>
    </View>
  );
}

export function CartBar({ count, total, onPress }: { count: number; total: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={k.cartBar}>
      <View style={k.cartCount}><Text style={k.cartCountText}>{count}</Text></View>
      <Text style={k.cartBarText}>عرض السلة</Text>
      <Text style={k.cartBarText}>{money(total)}</Text>
    </Pressable>
  );
}

export function AddressSheet({ visible, addresses, selected, onSelect, onLocate, onClose, busy }: {
  visible: boolean; addresses: Address[]; selected: string | null; onSelect: (id: string) => void; onLocate: () => void; onClose: () => void; busy: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={k.backdrop} onPress={onClose} />
      <View style={k.sheet}>
        <View style={k.handle} />
        <Text style={k.sheetTitle}>عنوان التوصيل</Text>
        <ScrollView style={{ maxHeight: 260 }}>
          {addresses.length === 0 ? <Text style={[k.sub, { textAlign: "center", marginVertical: 12 }]}>ما عندك حتى عنوان. استعمل موقعك الحالي.</Text> : null}
          {addresses.map((a) => (
            <Pressable key={a.id} onPress={() => { onSelect(a.id); onClose(); }} style={[k.addressRow, selected === a.id && k.addressRowOn]}>
              <Text style={{ fontSize: 20 }}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={k.addressTitle}>{a.label || "العنوان"}</Text>
                <Text style={k.sub} numberOfLines={1}>{a.address_text}</Text>
              </View>
              <Text style={{ color: C.primary, fontSize: 18 }}>{selected === a.id ? "●" : "○"}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Button title={busy ? "..." : "📍 استعمل موقعي الحالي"} onPress={onLocate} disabled={busy} />
      </View>
    </Modal>
  );
}

export function OrderCard({ order, tracking, onRefund }: {
  order: Order; tracking: Record<string, Tracking>; onRefund: (orderId: string, amount: number) => void;
}) {
  const delivery = order.deliveries?.[0];
  const live = delivery ? tracking[delivery.id] : undefined;
  const active = !!delivery && ACTIVE_DELIVERY.includes(delivery.status ?? "");
  const closed = order.status === "cancelled" || order.status === "failed";
  const step = orderStep(order.status);
  const waiting = awaitingPayment(order);
  async function openMap() {
    const lat = live && live.latitude ? live.latitude : delivery?.delivery_latitude;
    const lon = live && live.longitude ? live.longitude : delivery?.delivery_longitude;
    if (lat == null || lon == null) return;
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`);
  }
  return (
    <View style={k.orderCard}>
      <View style={k.rowBetween}>
        <Text style={k.orderTitle}>طلب #{order.master_order_number ?? order.order_number ?? order.id.slice(0, 6)}</Text>
        <Pill text={waiting ? "في انتظار الدفع" : orderStatusLabel(order.status)} tone={closed ? "danger" : order.status === "delivered" ? "ok" : waiting ? "warn" : "info"} />
      </View>
      <Text style={k.orderTotal}>{money(order.total_minor ?? 0)}</Text>
      {!closed ? (
        <View style={k.timeline}>
          {ORDER_STEPS.map((label, i) => (
            <View key={label} style={k.timelineItem}>
              <View style={[k.dot, i <= step && k.dotOn]} />
              <Text style={[k.timelineLabel, i <= step && { color: C.ink, fontWeight: "800" }]}>{label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {delivery ? (
        <View style={k.trackBox}>
          <View style={{ flex: 1 }}>
            <Text style={k.trackTitle}>{active ? "السائق فالطريق" : "التوصيل"}</Text>
            <Text style={k.sub} numberOfLines={1}>
              {delivery.eta_seconds ? `الوصول بعد ${Math.max(1, Math.round(delivery.eta_seconds / 60))} د` : delivery.delivery_address_text}
            </Text>
            {live && live.recorded_at ? <Text style={k.live}>● مباشر</Text> : null}
          </View>
          {active ? <Button title={live ? "تتبع مباشر" : "الموقع"} variant="soft" small onPress={() => void openMap()} /> : null}
        </View>
      ) : null}
      {order.status === "cancelled" && order.payment_status === "paid" ? (
        <Button title="طلب استرجاع" variant="ghost" small onPress={() => onRefund(order.id, order.total_minor ?? 0)} />
      ) : null}
    </View>
  );
}

const k = StyleSheet.create({
  sub: { color: C.muted, fontSize: 13, lineHeight: 19, textAlign: "right" },
  rowBetween: { flexDirection: ROW, alignItems: "center", justifyContent: "space-between", gap: 10 },

  storeCard: { backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.line, marginBottom: 14, overflow: "hidden" },
  storeStatus: { position: "absolute", top: 10, right: 10 },
  storeBody: { padding: 14 },
  storeName: { fontSize: 17, fontWeight: "900", color: C.ink, textAlign: "right" },
  metaRow: { flexDirection: ROW, gap: 14, marginTop: 8, flexWrap: "wrap" },
  meta: { color: C.muted, fontWeight: "700", fontSize: 13 },

  productRow: { flexDirection: ROW, alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 12, marginBottom: 10 },
  productName: { fontSize: 15, fontWeight: "900", color: C.ink, textAlign: "right" },
  priceRow: { flexDirection: ROW, alignItems: "center", gap: 8, marginTop: 6 },
  price: { fontSize: 15, fontWeight: "900", color: C.primary, textAlign: "right" },
  oldPrice: { fontSize: 12, color: C.muted, textDecorationLine: "line-through" },
  unavailable: { color: C.danger, fontSize: 12, fontWeight: "800", marginTop: 4, textAlign: "right" },
  plus: { position: "absolute", bottom: -8, left: -8, minWidth: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 8, borderWidth: 3, borderColor: C.card },
  plusText: { color: "#fff", fontSize: 18, fontWeight: "900", marginTop: -1 },

  backdrop: { flex: 1, backgroundColor: "rgba(10,8,25,0.45)" },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, paddingBottom: 26 },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 12 },
  sheetTitle: { fontSize: 20, fontWeight: "900", color: C.ink, textAlign: "right", marginTop: 12 },
  sheetFooter: { flexDirection: ROW, alignItems: "center", gap: 12, marginTop: 12 },
  groupLabel: { fontSize: 13, fontWeight: "800", color: C.muted, textAlign: "right", marginBottom: 6 },
  variantRow: { flexDirection: ROW, alignItems: "center", gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, marginBottom: 8 },
  variantRowOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  variantName: { flex: 1, fontWeight: "800", color: C.ink, textAlign: "right" },
  variantPrice: { fontWeight: "800", color: C.ink },
  radio: { fontSize: 18, color: C.muted },

  addressRow: { flexDirection: ROW, alignItems: "center", gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, marginVertical: 5, backgroundColor: C.card },
  addressRowOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  addressTitle: { fontWeight: "900", color: C.ink, textAlign: "right" },

  cartBar: { position: "absolute", left: 16, right: 16, bottom: 24, backgroundColor: C.ink, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 15, flexDirection: ROW, alignItems: "center", justifyContent: "space-between" },
  cartCount: { backgroundColor: C.primary, borderRadius: 12, minWidth: 26, height: 26, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  cartCountText: { color: "#fff", fontWeight: "900" },
  cartBarText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  orderCard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 12 },
  orderTitle: { fontSize: 15, fontWeight: "900", color: C.ink },
  orderTotal: { fontSize: 20, fontWeight: "900", color: C.ink, marginTop: 6, textAlign: "right" },
  timeline: { flexDirection: ROW, justifyContent: "space-between", marginTop: 14 },
  timelineItem: { alignItems: "center", flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.line, marginBottom: 6 },
  dotOn: { backgroundColor: C.primary },
  timelineLabel: { fontSize: 10, color: C.muted, textAlign: "center" },
  trackBox: { flexDirection: ROW, alignItems: "center", gap: 10, backgroundColor: C.primarySoft, borderRadius: 14, padding: 12, marginTop: 12 },
  trackTitle: { fontWeight: "900", color: C.ink, textAlign: "right" },
  live: { color: C.ok, fontSize: 11, fontWeight: "800", textAlign: "right", marginTop: 4 },
});
