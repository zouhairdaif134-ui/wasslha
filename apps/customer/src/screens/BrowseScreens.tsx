import type { ReactNode } from "react";
import { ActivityIndicator, ScrollView, Text } from "react-native";
import { C } from "../theme";
import type { Category, Product, Store } from "../lib/types";
import { categoryEmoji, distanceLabel, etaLabel } from "../lib/format";
import { Empty, Pill, Screen, TopBar } from "../components/ui";
import { ProductRow, StoreCard } from "../components/cards";
import { View } from "react-native";

export function CategoryScreen(p: {
  category: Category; stores: Store[]; loading: boolean; error: string; cartBar: ReactNode;
  onBack: () => void; onStore: (s: Store) => void;
}) {
  return (
    <Screen>
      <TopBar title={`${categoryEmoji(p.category)} ${p.category.name_ar}`} onBack={p.onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {p.loading ? <ActivityIndicator color={C.primary} style={{ marginVertical: 30 }} /> : null}
        {p.error ? <Text style={{ color: C.danger, textAlign: "right" }}>{p.error}</Text> : null}
        {!p.loading && !p.error && p.stores.length === 0 ? <Empty emoji="🔎" title="ما كاين حتى متجر فهاد القسم" hint="جرب قسم آخر." /> : null}
        {p.stores.map((s) => <StoreCard key={s.id} store={s} onPress={() => p.onStore(s)} />)}
      </ScrollView>
      {p.cartBar}
    </Screen>
  );
}

export function StoreScreen(p: {
  store: Store; products: Product[]; cats: Category[]; loading: boolean; error: string; cartBar: ReactNode;
  qtyOf: (productId: string) => number; emojiOf: (product: Product) => string;
  onBack: () => void; onOpen: (product: Product) => void; onQuickAdd: (product: Product) => void;
}) {
  const groups = p.cats
    .map((c) => ({ title: c.name_ar, items: p.products.filter((x) => x.category_id === c.id) }))
    .filter((g) => g.items.length > 0);
  const grouped = new Set(groups.flatMap((g) => g.items.map((x) => x.id)));
  const rest = p.products.filter((x) => !grouped.has(x.id));
  const sections = rest.length ? [...groups, { title: groups.length ? "أخرى" : "المنتجات", items: rest }] : groups;
  const eta = etaLabel(p.store.distance_meters);
  const km = distanceLabel(p.store.distance_meters);
  return (
    <Screen>
      <TopBar title={p.store.name} onBack={p.onBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16 }}>
          <StoreCard store={p.store} onPress={() => undefined} />
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          {eta || km ? <Text style={{ color: C.muted, textAlign: "right", marginBottom: 10 }}>{eta ? `🕒 التوصيل تقريباً ${eta}` : ""}{eta && km ? "  ·  " : ""}{km ? `📍 ${km}` : ""}</Text> : null}
          {!p.store.is_accepting_orders ? <View style={{ alignItems: "flex-end", marginBottom: 8 }}><Pill text="المتجر مغلق دابا" tone="danger" /></View> : null}
          {p.loading ? <ActivityIndicator color={C.primary} style={{ marginVertical: 24 }} /> : null}
          {p.error ? <Text style={{ color: C.danger, textAlign: "right" }}>{p.error}</Text> : null}
          {!p.loading && !p.error && p.products.length === 0 ? <Empty emoji="📦" title="ما كاين حتى منتج" /> : null}
          {sections.map((g) => (
            <View key={g.title}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: C.ink, textAlign: "right", marginVertical: 10 }}>{g.title}</Text>
              {g.items.map((x) => (
                <ProductRow key={x.id} product={x} emoji={p.emojiOf(x)} qty={p.qtyOf(x.id)} onOpen={p.onOpen} onQuickAdd={p.onQuickAdd} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      {p.cartBar}
    </Screen>
  );
}

export function SearchScreen(p: {
  q: string; setQ: (v: string) => void; products: Product[]; stores: Store[]; loading: boolean; cartBar: ReactNode;
  qtyOf: (productId: string) => number; emojiOf: (product: Product) => string;
  onBack: () => void; onStore: (s: Store) => void; onOpen: (product: Product) => void; onQuickAdd: (product: Product) => void;
}) {
  const term = p.q.trim().toLowerCase();
  const foundStores = term.length >= 2 ? p.stores.filter((s) => s.name.toLowerCase().includes(term)) : [];
  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <SearchInput value={p.q} onChange={p.setQ} onBack={p.onBack} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {term.length < 2 ? <Empty emoji="🔍" title="كتب شنو كتقلب عليه" hint="متجر أو منتج، مثلا: بيتزا، حليب، خبز" /> : null}
        {p.loading ? <ActivityIndicator color={C.primary} style={{ marginVertical: 20 }} /> : null}
        {foundStores.length ? <Text style={sec}>متاجر</Text> : null}
        {foundStores.map((s) => <StoreCard key={s.id} store={s} onPress={() => p.onStore(s)} />)}
        {p.products.length ? <Text style={sec}>منتجات</Text> : null}
        {term.length >= 2 && !p.loading && p.products.length === 0 && foundStores.length === 0 ? <Empty emoji="😕" title="ما لقينا والو" hint="جرب كلمة أخرى." /> : null}
        {p.products.map((x) => (
          <ProductRow key={x.id} product={x} emoji={p.emojiOf(x)} qty={p.qtyOf(x.id)} onOpen={p.onOpen} onQuickAdd={p.onQuickAdd} />
        ))}
      </ScrollView>
      {p.cartBar}
    </Screen>
  );
}

const sec = { fontSize: 18, fontWeight: "900" as const, color: C.ink, textAlign: "right" as const, marginVertical: 10 };

import { Pressable, TextInput } from "react-native";
import { ROW } from "../theme";

function SearchInput({ value, onChange, onBack }: { value: string; onChange: (v: string) => void; onBack: () => void }) {
  return (
    <View style={{ flexDirection: ROW, alignItems: "center", gap: 10 }}>
      <Pressable onPress={onBack} hitSlop={10} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: C.ink }}>→</Text>
      </Pressable>
      <TextInput
        autoFocus
        value={value}
        onChangeText={onChange}
        placeholder="🔍  قلّب على متجر أو منتج..."
        placeholderTextColor={C.muted}
        returnKeyType="search"
        style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: C.ink, textAlign: "right" }}
      />
    </View>
  );
}
