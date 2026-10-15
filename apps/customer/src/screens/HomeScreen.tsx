import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { C, ROW, tileColor } from "../theme";
import type { Category, Store } from "../lib/types";
import { categoryEmoji } from "../lib/format";
import { Empty } from "../components/ui";
import { StoreCard } from "../components/cards";

export function HomeScreen(p: {
  addressLabel: string; cats: Category[]; stores: Store[]; loading: boolean; error: string;
  refreshing: boolean; activeOrders: number; cartBar: ReactNode;
  onAddress: () => void; onSearch: () => void; onOrders: () => void; onProfile: () => void;
  onCategory: (c: Category) => void; onGet: () => void; onStore: (s: Store) => void; onRefresh: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={h.pad}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={p.refreshing} onRefresh={p.onRefresh} tintColor={C.primary} colors={[C.primary]} />}
      >
        <View style={h.topRow}>
          <Pressable onPress={p.onAddress} style={h.addressPill}>
            <Text style={h.addressSmall}>التوصيل إلى ▾</Text>
            <Text style={h.addressValue} numberOfLines={1}>📍 {p.addressLabel}</Text>
          </Pressable>
          <Pressable onPress={p.onOrders} style={h.roundBtn}>
            <Text style={h.roundGlyph}>🧾</Text>
            {p.activeOrders > 0 ? <View style={h.badge}><Text style={h.badgeText}>{p.activeOrders}</Text></View> : null}
          </Pressable>
          <Pressable onPress={p.onProfile} style={h.roundBtn}><Text style={h.roundGlyph}>👤</Text></Pressable>
        </View>

        <Pressable onPress={p.onSearch} style={h.search}>
          <Text style={h.searchText}>🔍  قلّب على متجر أو منتج...</Text>
        </Pressable>

        {p.error ? (
          <Pressable onPress={p.onRefresh} style={h.errorBox}>
            <Text style={h.errorText}>{p.error}  ·  كليكي باش تعاود</Text>
          </Pressable>
        ) : null}

        <Text style={h.section}>شنو بغيتي اليوم؟</Text>
        <View style={h.grid}>
          <Pressable onPress={p.onGet} style={[h.tile, h.tileWide, { backgroundColor: C.primary }]}>
            <View style={{ flex: 1 }}>
              <Text style={[h.tileTitle, { color: "#fff", fontSize: 20 }]}>جيب ليا</Text>
              <Text style={h.tileSubLight}>أي حاجة من أي بلاصة فبرشيد، كنجيبوها ليك</Text>
            </View>
            <Text style={{ fontSize: 44 }}>🛵</Text>
          </Pressable>
          {p.cats.map((c) => (
            <Pressable key={c.id} onPress={() => p.onCategory(c)} style={[h.tile, { backgroundColor: tileColor(c.id) }]}>
              <Text style={h.tileTitle}>{c.name_ar}</Text>
              <Text style={h.tileEmoji}>{categoryEmoji(c)}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={h.section}>متاجر قريبة منك</Text>
        {p.loading ? <ActivityIndicator color={C.primary} style={{ marginVertical: 24 }} /> : null}
        {!p.loading && p.stores.length === 0 ? <Empty emoji="🏪" title="ما كاين حتى متجر دابا" hint="غادي نزيدو متاجر برشيد قريب." /> : null}
        {p.stores.slice(0, 12).map((s) => <StoreCard key={s.id} store={s} onPress={() => p.onStore(s)} />)}
      </ScrollView>
      {p.cartBar}
    </View>
  );
}

const h = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 130 },
  topRow: { flexDirection: ROW, alignItems: "center", gap: 10 },
  addressPill: { flex: 1, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 9 },
  addressSmall: { color: C.muted, fontSize: 11, fontWeight: "800", textAlign: "right" },
  addressValue: { color: C.ink, fontSize: 15, fontWeight: "900", marginTop: 2, textAlign: "right" },
  roundBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  roundGlyph: { fontSize: 20 },
  badge: { position: "absolute", top: -2, right: -2, backgroundColor: C.danger, minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  search: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, paddingHorizontal: 16, paddingVertical: 15, marginTop: 12 },
  searchText: { color: C.muted, fontSize: 15, textAlign: "right" },
  errorBox: { backgroundColor: C.dangerSoft, borderRadius: 14, padding: 12, marginTop: 12 },
  errorText: { color: C.danger, fontWeight: "800", textAlign: "right" },
  section: { fontSize: 19, fontWeight: "900", color: C.ink, textAlign: "right", marginTop: 22, marginBottom: 12 },
  grid: { flexDirection: ROW, flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  tile: { width: "48%", height: 118, borderRadius: 22, padding: 14, justifyContent: "space-between", overflow: "hidden" },
  tileWide: { width: "100%", height: 104, flexDirection: ROW, alignItems: "center", gap: 10 },
  tileTitle: { fontSize: 17, fontWeight: "900", color: C.ink, textAlign: "right" },
  tileSubLight: { color: "#E6DFFF", marginTop: 4, textAlign: "right", lineHeight: 19 },
  tileEmoji: { fontSize: 44, alignSelf: "flex-start" },
});
