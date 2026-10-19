import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, ROW } from "../theme";
import type { Product, Store } from "../lib/types";
import { distanceLabel, money } from "../lib/format";
import { Cover, Icon, Pill } from "./ui";
import type { IconName } from "./ui";

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={h.sectionRow}>
      <Text style={h.sectionTitle}>{title}</Text>
      {action && onAction ? <Text onPress={onAction} style={h.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export function CategoryTile({ label, icon, highlight = false, onPress }: { label: string; icon: IconName; highlight?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[h.tile, highlight && { backgroundColor: C.accent, borderColor: C.accent }]}>
      <Icon name={icon} size={28} color={C.primary} />
      <Text style={h.tileLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

export function ProductCard({ product, emoji, qty, onOpen, onQuickAdd }: {
  product: Product; emoji: string; qty: number; onOpen: (p: Product) => void; onQuickAdd: (p: Product) => void;
}) {
  const discounted = !!product.compare_at_price_minor && product.compare_at_price_minor > product.price_minor;
  const unit = product.stock_unit && product.stock_unit !== "unit" ? product.stock_unit : "";
  return (
    <Pressable onPress={() => onOpen(product)} style={h.productCard}>
      <Cover uri={product.image_url} emoji={emoji} seed={product.name_fr || product.name_ar} height={92} radius={12} />
      <Text style={h.productName} numberOfLines={2}>{product.name_ar}</Text>
      <Text style={h.productMeta} numberOfLines={1}>{[unit, product.store_name].filter(Boolean).join(" · ")}</Text>
      <View style={h.productFooter}>
        <View>
          <Text style={h.productPrice}>{money(product.price_minor)}</Text>
          {discounted ? <Text style={h.productOld}>{money(product.compare_at_price_minor ?? 0)}</Text> : null}
        </View>
        <Pressable onPress={() => onQuickAdd(product)} hitSlop={8} style={h.add}>
          {qty > 0 ? <Text style={h.addQty}>{qty}</Text> : <Icon name="plus" size={20} color="#fff" />}
        </Pressable>
      </View>
    </Pressable>
  );
}

export function StoreMiniCard({ store, onPress }: { store: Store; onPress: () => void }) {
  const km = distanceLabel(store.distance_meters);
  return (
    <Pressable onPress={onPress} style={h.storeCard}>
      <Cover uri={store.cover_url ?? store.logo_url} emoji="🏪" seed={store.name} height={96} radius={0} />
      <View style={h.storeBody}>
        <Text style={h.storeName} numberOfLines={1}>{store.name}</Text>
        <View style={h.storeMeta}>
          <Pill text={store.is_accepting_orders ? "مفتوح" : "مغلق"} tone={store.is_accepting_orders ? "ok" : "danger"} />
          <View style={h.metaItem}><Icon name="star" size={14} color={C.accent} /><Text style={h.metaText}>{store.rating ? store.rating.toFixed(1) : "جديد"}</Text></View>
          {km ? <View style={h.metaItem}><Icon name="map-marker-outline" size={14} color={C.muted} /><Text style={h.metaText}>{km}</Text></View> : null}
        </View>
      </View>
    </Pressable>
  );
}

export function Skeleton({ width, height, radius = 12 }: { width: number | `${number}%`; height: number; radius?: number }) {
  return <View style={{ width, height, borderRadius: radius, backgroundColor: "#ECECEC" }} />;
}

const h = StyleSheet.create({
  sectionRow: { flexDirection: ROW, justifyContent: "space-between", alignItems: "center", marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: C.ink },
  sectionAction: { fontSize: 13, fontWeight: "800", color: C.primary },

  tile: { width: "23.5%", minHeight: 88, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center", paddingVertical: 10, paddingHorizontal: 4, gap: 6 },
  tileLabel: { fontSize: 11, fontWeight: "800", color: C.ink, textAlign: "center", lineHeight: 15 },

  productCard: { width: 148, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 8 },
  productName: { fontSize: 13, fontWeight: "900", color: C.ink, textAlign: "right", marginTop: 8, minHeight: 34 },
  productMeta: { fontSize: 11, color: C.muted, textAlign: "right", marginTop: 2 },
  productFooter: { flexDirection: ROW, justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  productPrice: { fontSize: 14, fontWeight: "900", color: C.ink },
  productOld: { fontSize: 11, color: C.muted, textDecorationLine: "line-through" },
  add: { minWidth: 32, height: 32, borderRadius: 16, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  addQty: { color: "#fff", fontWeight: "900" },

  storeCard: { width: 232, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, overflow: "hidden" },
  storeBody: { padding: 12 },
  storeName: { fontSize: 15, fontWeight: "900", color: C.ink, textAlign: "right" },
  storeMeta: { flexDirection: ROW, alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" },
  metaItem: { flexDirection: ROW, alignItems: "center", gap: 3 },
  metaText: { fontSize: 12, fontWeight: "700", color: C.muted },
});
