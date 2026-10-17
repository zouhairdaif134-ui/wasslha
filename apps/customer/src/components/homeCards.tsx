import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, ROW } from "../theme";
import type { Product, Store } from "../lib/types";
import { discountPercent, distanceLabel, etaLabel, money } from "../lib/format";
import { Cover } from "./ui";

export function FreshCard({ product, emoji, qty, onOpen, onQuickAdd }: {
  product: Product; emoji: string; qty: number; onOpen: (p: Product) => void; onQuickAdd: (p: Product) => void;
}) {
  return (
    <Pressable onPress={() => onOpen(product)} style={h.fresh}>
      <Cover uri={product.image_url} emoji={emoji} seed={product.name_fr || product.name_ar} height={88} radius={12} />
      <Text style={h.name} numberOfLines={1}>{product.name_ar}</Text>
      {product.store_name ? <Text style={h.sub} numberOfLines={1}>{product.store_name}</Text> : null}
      <View style={h.priceRow}>
        <Text style={h.price}>{money(product.price_minor)}</Text>
        <Pressable disabled={!product.is_available} onPress={() => onQuickAdd(product)} style={[h.add, !product.is_available && { opacity: 0.4 }]}>
          {qty > 0 ? <Text style={h.addQty}>{qty}</Text> : <Ionicons name="add" size={18} color="#fff" />}
        </Pressable>
      </View>
    </Pressable>
  );
}

export function OfferCard({ product, emoji, onOpen, onQuickAdd }: {
  product: Product; emoji: string; onOpen: (p: Product) => void; onQuickAdd: (p: Product) => void;
}) {
  const pct = discountPercent(product);
  return (
    <Pressable onPress={() => onOpen(product)} style={[h.fresh, { width: 170 }]}>
      <View>
        <Cover uri={product.image_url} emoji={emoji} seed={product.name_fr || product.name_ar} height={80} radius={12} />
        {pct > 0 ? <View style={h.badge}><Text style={h.badgeText}>-{pct}%</Text></View> : null}
      </View>
      <Text style={h.name} numberOfLines={1}>{product.name_ar}</Text>
      <View style={h.priceRow}>
        <View>
          <Text style={[h.price, { color: C.primary }]}>{money(product.price_minor)}</Text>
          {product.compare_at_price_minor ? <Text style={h.old}>{money(product.compare_at_price_minor)}</Text> : null}
        </View>
        <Pressable onPress={() => onQuickAdd(product)} style={h.add}><Ionicons name="add" size={18} color="#fff" /></Pressable>
      </View>
    </Pressable>
  );
}

export function StoreMini({ store, onPress }: { store: Store; onPress: () => void }) {
  const eta = etaLabel(store.distance_meters);
  const km = distanceLabel(store.distance_meters);
  return (
    <Pressable onPress={onPress} style={[h.fresh, { width: 220, padding: 0, overflow: "hidden" }]}>
      <Cover uri={store.image_url} emoji="🏪" seed={store.name} height={92} radius={0} />
      <View style={{ padding: 12 }}>
        <Text style={h.name} numberOfLines={1}>{store.name}</Text>
        <Text style={h.sub} numberOfLines={1}>{store.address_text}</Text>
        <View style={h.meta}>
          {store.rating ? <Text style={h.metaText}>★ {store.rating.toFixed(1)}</Text> : null}
          {eta ? <Text style={h.metaText}>{eta}</Text> : null}
          {km ? <Text style={h.metaText}>{km}</Text> : null}
          <Text style={[h.metaText, { color: store.is_accepting_orders ? C.ok : C.danger }]}>{store.is_accepting_orders ? "مفتوح" : "مغلق"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const h = StyleSheet.create({
  fresh: { width: 140, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 8 },
  name: { fontSize: 14, fontWeight: "900", color: C.ink, textAlign: "right", marginTop: 8 },
  sub: { fontSize: 11, color: C.muted, textAlign: "right", marginTop: 2 },
  priceRow: { flexDirection: ROW, alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  price: { fontSize: 14, fontWeight: "900", color: C.ink },
  old: { fontSize: 11, color: C.muted, textDecorationLine: "line-through" },
  add: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  addQty: { color: "#fff", fontWeight: "900", fontSize: 13 },
  badge: { position: "absolute", top: 6, right: 6, backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  meta: { flexDirection: ROW, flexWrap: "wrap", gap: 10, marginTop: 6 },
  metaText: { fontSize: 12, color: C.muted, fontWeight: "700" },
});
