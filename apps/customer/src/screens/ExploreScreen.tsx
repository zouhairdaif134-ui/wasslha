import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { C, ROW } from "../theme";
import type { Category, Store } from "../lib/types";
import { categoryIcon } from "../lib/icons";
import { Empty, Icon, Screen } from "../components/ui";
import { StoreCard } from "../components/cards";

type Sort = "recommended" | "distance" | "rating";

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[e.chip, on && e.chipOn]}>
      <Text style={[e.chipText, on && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

export function ExploreScreen(p: {
  cats: Category[]; stores: Store[]; loading: boolean; refreshing: boolean;
  onRefresh: () => void; onSearch: () => void; onCategory: (c: Category) => void; onStore: (s: Store) => void;
}) {
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("recommended");
  let shown = p.stores.filter((s) => !openOnly || s.is_accepting_orders);
  if (sort === "distance") shown = [...shown].sort((a, b) => (a.distance_meters ?? 1e12) - (b.distance_meters ?? 1e12));
  if (sort === "rating") shown = [...shown].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={e.pad}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={p.refreshing} onRefresh={p.onRefresh} tintColor={C.primary} colors={[C.primary]} />}
      >
        <Text style={e.title}>اكتشف</Text>
        <Pressable onPress={p.onSearch} style={e.search}>
          <Icon name="magnify" size={22} color={C.muted} />
          <Text style={e.searchText}>قلّب على محل أو منتج...</Text>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={e.catRow}>
          {p.cats.map((c) => (
            <Pressable key={c.id} onPress={() => p.onCategory(c)} style={e.cat}>
              <Icon name={categoryIcon(c.slug)} size={20} color={C.primary} />
              <Text style={e.catText}>{c.name_ar}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={e.filters}>
          <Chip label="مفتوح دابا" on={openOnly} onPress={() => setOpenOnly((v) => !v)} />
          <Chip label="الأنسب" on={sort === "recommended"} onPress={() => setSort("recommended")} />
          <Chip label="الأقرب" on={sort === "distance"} onPress={() => setSort("distance")} />
          <Chip label="الأعلى تقييماً" on={sort === "rating"} onPress={() => setSort("rating")} />
        </View>

        {p.loading ? <ActivityIndicator color={C.primary} style={{ marginVertical: 30 }} /> : null}
        {!p.loading && shown.length === 0 ? (
          <Empty emoji="🏪" title="ما كاين حتى محل" hint={openOnly ? "جرب تحيد فلتر «مفتوح دابا»." : "غادي نزيدو محلات برشيد قريب."} />
        ) : null}
        {shown.map((s) => <StoreCard key={s.id} store={s} onPress={() => p.onStore(s)} />)}
      </ScrollView>
    </Screen>
  );
}

const e = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "900", color: C.ink, textAlign: "right" },
  search: { flexDirection: ROW, alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 14, marginTop: 12 },
  searchText: { color: C.muted, fontSize: 14, flex: 1, textAlign: "right" },
  catRow: { flexDirection: "row", gap: 8, paddingVertical: 14 },
  cat: { flexDirection: ROW, alignItems: "center", gap: 6, backgroundColor: C.card, borderRadius: 999, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 10 },
  catText: { fontWeight: "800", color: C.ink, fontSize: 13 },
  filters: { flexDirection: ROW, flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: { backgroundColor: C.card, borderRadius: 999, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontWeight: "800", color: C.ink, fontSize: 12 },
});
