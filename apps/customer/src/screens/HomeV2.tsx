import type { ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { C, ROW } from "../theme";
import type { Category, Product, Store } from "../lib/types";
import { categoryIcon } from "../lib/icons";
import { Empty, Icon } from "../components/ui";
import { CategoryTile, ProductCard, SectionHeader, Skeleton, StoreMiniCard } from "../components/home-cards";

export type ReorderSuggestion = { title: string; subtitle: string; onPress: () => void };

export function HomeV2(p: {
  addressLabel: string; cats: Category[]; stores: Store[]; fresh: Product[]; offers: Product[]; popular: Product[];
  reorder: ReorderSuggestion | null; loading: boolean; error: string; refreshing: boolean; cartBar: ReactNode;
  qtyOf: (productId: string) => number; emojiOf: (product: Product) => string;
  onAddress: () => void; onSearch: () => void; onExplore: () => void; onCategory: (c: Category) => void; onGet: () => void;
  onStore: (s: Store) => void; onOpen: (product: Product) => void; onQuickAdd: (product: Product) => void; onRefresh: () => void;
}) {
  const productRow = (list: Product[]) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.carousel}>
      {list.map((x) => (
        <ProductCard key={x.id} product={x} emoji={p.emojiOf(x)} qty={p.qtyOf(x.id)} onOpen={p.onOpen} onQuickAdd={p.onQuickAdd} />
      ))}
    </ScrollView>
  );
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={s.pad}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={p.refreshing} onRefresh={p.onRefresh} tintColor={C.primary} colors={[C.primary]} />}
      >
        {/* 1. address header */}
        <View style={s.header}>
          <View style={s.logo}><Text style={s.logoText}>W</Text></View>
          <Pressable onPress={p.onAddress} style={s.address}>
            <Text style={s.addressSmall}>عنوان التوصيل</Text>
            <View style={s.addressLine}>
              <Icon name="map-marker-outline" size={16} color={C.primary} />
              <Text style={s.addressValue} numberOfLines={1}>{p.addressLabel}</Text>
              <Text style={s.change}>تغيير</Text>
            </View>
          </Pressable>
        </View>

        {/* 2. search */}
        <Pressable onPress={p.onSearch} style={s.search}>
          <Icon name="magnify" size={22} color={C.muted} />
          <Text style={s.searchText}>شنو بغيتي نوصّلو ليك اليوم؟</Text>
        </Pressable>

        {/* 3. brand banner (not a promotion) */}
        <Pressable onPress={p.onExplore} style={s.hero}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>القضا حتى لباب دارك</Text>
            <Text style={s.heroText}>طلب ساهل، توصيل محلي</Text>
            <View style={s.heroCta}><Text style={s.heroCtaText}>تسوّق دابا</Text></View>
          </View>
          <View style={s.heroArt}><Icon name="basket" size={54} color={C.primary} /></View>
        </Pressable>

        {p.error ? (
          <Pressable onPress={p.onRefresh} style={s.error}><Text style={s.errorText}>{p.error}  ·  كليكي باش تعاود</Text></Pressable>
        ) : null}

        {/* 4. services */}
        <SectionHeader title="اختار شنو محتاج" action="جميع الخدمات" onAction={p.onExplore} />
        <View style={s.grid}>
          {p.cats.slice(0, 7).map((c) => (
            <CategoryTile key={c.id} label={c.name_ar} icon={categoryIcon(c.slug)} onPress={() => p.onCategory(c)} />
          ))}
          <CategoryTile label="جيب ليا" icon="moped" highlight onPress={p.onGet} />
        </View>

        {/* 5. Jib Liya */}
        <Pressable onPress={p.onGet} style={s.jib}>
          <View style={s.jibIcon}><Icon name="moped" size={30} color={C.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.jibTitle}>ما لقيتيش اللي بغيت؟</Text>
            <Text style={s.jibText}>قول لينا شنو خاصك ومنين نجيبوه ليك</Text>
            <View style={s.jibCta}><Text style={s.jibCtaText}>طلب جيب ليا</Text></View>
          </View>
        </Pressable>

        {/* 6. fresh produce */}
        {p.fresh.length > 0 ? (<><SectionHeader title="الطازج ديال اليوم" />{productRow(p.fresh)}</>) : null}

        {/* 7. nearby stores */}
        <SectionHeader title="محلات قريبة ليك" action={p.stores.length ? "عرض الكل" : undefined} onAction={p.onExplore} />
        {p.loading ? (
          <View style={s.carousel}><Skeleton width={232} height={170} radius={16} /><Skeleton width={232} height={170} radius={16} /></View>
        ) : p.stores.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.carousel}>
            {p.stores.slice(0, 10).map((x) => <StoreMiniCard key={x.id} store={x} onPress={() => p.onStore(x)} />)}
          </ScrollView>
        ) : (
          <Empty emoji="🏪" title="ما كاين حتى محل دابا" hint="غادي نزيدو محلات برشيد قريب." />
        )}

        {/* 8. offers (only products with a configured compare-at price) */}
        {p.offers.length > 0 ? (<><SectionHeader title="عروض كتستاهل" />{productRow(p.offers)}</>) : null}

        {/* 9. personalised */}
        {p.reorder ? (
          <>
            <SectionHeader title="عاود طلبك" />
            <Pressable onPress={p.reorder.onPress} style={s.reorder}>
              <Icon name="reload" size={24} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.reorderTitle}>{p.reorder.title}</Text>
                <Text style={s.reorderText}>{p.reorder.subtitle}</Text>
              </View>
            </Pressable>
          </>
        ) : null}
        {p.popular.length > 0 ? (<><SectionHeader title="الأكثر طلباً فبرشيد" />{productRow(p.popular)}</>) : null}
      </ScrollView>
      {p.cartBar}
    </View>
  );
}

const s = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 150 },
  header: { flexDirection: ROW, alignItems: "center", gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 22, fontWeight: "900", color: C.primary },
  address: { flex: 1 },
  addressSmall: { fontSize: 11, color: C.muted, textAlign: "right" },
  addressLine: { flexDirection: ROW, alignItems: "center", gap: 4, marginTop: 2 },
  addressValue: { flexShrink: 1, fontSize: 14, fontWeight: "900", color: C.ink },
  change: { fontSize: 12, fontWeight: "800", color: C.primary, marginHorizontal: 4 },
  search: { flexDirection: ROW, alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 14, marginTop: 14 },
  searchText: { color: C.muted, fontSize: 14, flex: 1, textAlign: "right" },
  hero: { flexDirection: ROW, alignItems: "center", gap: 10, backgroundColor: C.accent, borderRadius: 18, padding: 18, marginTop: 14, minHeight: 160 },
  heroTitle: { fontSize: 21, fontWeight: "900", color: C.ink, textAlign: "right", lineHeight: 28 },
  heroText: { fontSize: 13, color: "#4A3B00", textAlign: "right", marginTop: 4 },
  heroCta: { alignSelf: "flex-end", backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, marginTop: 12 },
  heroCtaText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  heroArt: { width: 108, height: 108, borderRadius: 54, backgroundColor: "#FFE58A", alignItems: "center", justifyContent: "center" },
  error: { backgroundColor: C.dangerSoft, borderRadius: 12, padding: 12, marginTop: 12 },
  errorText: { color: C.danger, fontWeight: "800", textAlign: "right" },
  grid: { flexDirection: ROW, flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  jib: { flexDirection: ROW, alignItems: "center", gap: 12, backgroundColor: C.accentSoft, borderRadius: 16, borderWidth: 1, borderColor: "#FFE79A", padding: 14, marginTop: 18 },
  jibIcon: { width: 54, height: 54, borderRadius: 14, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  jibTitle: { fontSize: 16, fontWeight: "900", color: C.ink, textAlign: "right" },
  jibText: { fontSize: 12, color: "#5C5C5C", textAlign: "right", marginTop: 3, lineHeight: 18 },
  jibCta: { alignSelf: "flex-end", backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 8 },
  jibCtaText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  carousel: { flexDirection: ROW, gap: 10, paddingVertical: 2 },
  reorder: { flexDirection: ROW, alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14 },
  reorderTitle: { fontSize: 14, fontWeight: "900", color: C.ink, textAlign: "right" },
  reorderText: { fontSize: 12, color: C.muted, textAlign: "right", marginTop: 2 },
});
