import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { C, ROW } from "../theme";
import type { Address, CartLine, GetRequest, Order, Quote, Tracking } from "../lib/types";
import { lineKey, lineUnit, money } from "../lib/format";
import { ONLINE_PAYMENTS_ENABLED } from "../lib/http";
import { Button, Empty, Pill, Screen, Stepper, TopBar } from "../components/ui";
import { OrderCard } from "../components/cards";

export function CartScreen(p: {
  lines: CartLine[]; quote: Quote | null; subtotal: number; tip: number; setTip: (v: number) => void;
  addressLabel: string; hasAddress: boolean; busy: boolean;
  onBack: () => void; onAddress: () => void; onPlus: (line: CartLine) => void; onMinus: (line: CartLine) => void; onCheckout: () => void;
}) {
  return (
    <Screen>
      <TopBar title="السلة" onBack={p.onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        {p.lines.length === 0 ? <Empty emoji="🛒" title="السلة خاوية" hint="زيد منتجات من المتاجر." /> : null}
        {p.lines.map((l) => (
          <View key={lineKey(l.product, l.variant)} style={c.card}>
            <View style={c.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={c.title}>{l.product.name_ar}{l.variant ? ` · ${l.variant.name_ar}` : ""}</Text>
                <Text style={c.price}>{money(lineUnit(l) * l.quantity)}</Text>
              </View>
              <Stepper quantity={l.quantity} onMinus={() => p.onMinus(l)} onPlus={() => p.onPlus(l)} />
            </View>
          </View>
        ))}

        {p.lines.length > 0 ? (
          <>
            <Pressable onPress={p.onAddress} style={c.card}>
              <Text style={c.label}>التوصيل إلى</Text>
              <View style={c.rowBetween}>
                <Text style={[c.title, { flex: 1 }]} numberOfLines={2}>📍 {p.addressLabel}</Text>
                <Text style={c.link}>تغيير</Text>
              </View>
            </Pressable>

            <View style={c.card}>
              <Text style={c.label}>بقشيش للسائق (اختياري)</Text>
              <View style={c.tipRow}>
                {[0, 500, 1000, 2000].map((v) => (
                  <Pressable key={v} onPress={() => p.setTip(v)} style={[c.tip, p.tip === v && c.tipOn]}>
                    <Text style={[c.tipText, p.tip === v && { color: "#fff" }]}>{v === 0 ? "بلا" : money(v)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={c.card}>
              <Text style={c.title}>ملخص الطلب</Text>
              <View style={c.sum}><Text style={c.text}>المنتجات</Text><Text style={c.text}>{money(p.subtotal)}</Text></View>
              <View style={c.sum}><Text style={c.text}>التوصيل</Text><Text style={c.text}>{p.quote ? money(p.quote.delivery_fee_minor) : "..."}</Text></View>
              <View style={c.sum}><Text style={c.text}>رسوم الخدمة</Text><Text style={c.text}>{p.quote ? money(p.quote.service_fee_minor) : "..."}</Text></View>
              {p.tip > 0 ? <View style={c.sum}><Text style={c.text}>البقشيش</Text><Text style={c.text}>{money(p.tip)}</Text></View> : null}
              <View style={c.divider} />
              <View style={c.sum}><Text style={c.title}>المجموع</Text><Text style={c.total}>{p.quote ? money(p.quote.total_minor) : "..."}</Text></View>
              <Text style={c.hint}>
                {ONLINE_PAYMENTS_ENABLED ? "💳 الدفع الإلكتروني" : "💵 الدفع كاش عند الاستلام"}
                {p.quote?.eta_seconds ? `  ·  الوصول تقريباً ${Math.max(1, Math.round(p.quote.eta_seconds / 60))} د` : ""}
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
      {p.lines.length > 0 ? (
        <View style={c.footer}>
          <Button
            title={p.busy ? "..." : !p.hasAddress ? "اختار عنوان التوصيل" : `أكّد الطلب · ${p.quote ? money(p.quote.total_minor) : money(p.subtotal)}`}
            onPress={p.hasAddress ? p.onCheckout : p.onAddress}
            disabled={p.busy || (p.hasAddress && !p.quote)}
          />
        </View>
      ) : null}
    </Screen>
  );
}

export function OrdersScreen(p: {
  orders: Order[]; requests: GetRequest[]; tracking: Record<string, Tracking>; refreshing: boolean;
  onBack: () => void; onRefresh: () => void; onRefund: (orderId: string, amount: number) => void;
}) {
  return (
    <Screen>
      <TopBar title="طلباتي" onBack={p.onBack} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={p.refreshing} onRefresh={p.onRefresh} tintColor={C.primary} colors={[C.primary]} />}
      >
        {p.orders.length === 0 && p.requests.length === 0 ? <Empty emoji="🧾" title="ما عندك حتى طلب" hint="ملي تطلب، غتلقى هنا التتبع المباشر." /> : null}
        {p.orders.map((o) => <OrderCard key={o.id} order={o} tracking={p.tracking} onRefund={p.onRefund} />)}
        {p.requests.map((r) => (
          <View key={r.id} style={c.card}>
            <View style={c.rowBetween}>
              <Text style={c.title}>🛵 جيب ليا</Text>
              <Pill text={r.status} tone="info" />
            </View>
            <Text style={[c.text, { marginTop: 6, textAlign: "right" }]}>{r.request_title}</Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

export function ProfileScreen(p: {
  phone: string; addresses: Address[]; selected: string | null; busy: boolean;
  onBack: () => void; onSelect: (id: string) => void; onLocate: () => void; onSignOut: () => void;
}) {
  return (
    <Screen>
      <TopBar title="حسابي" onBack={p.onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={c.card}>
          <Text style={c.label}>رقم التيليفون</Text>
          <Text style={c.title}>{p.phone || "—"}</Text>
        </View>
        <Text style={c.section}>عناويني</Text>
        {p.addresses.length === 0 ? <Text style={c.hint}>ما عندك حتى عنوان محفوظ.</Text> : null}
        {p.addresses.map((a) => (
          <Pressable key={a.id} onPress={() => p.onSelect(a.id)} style={[c.card, p.selected === a.id && { borderColor: C.primary, backgroundColor: C.primarySoft }]}>
            <View style={c.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={c.title}>{a.label || "العنوان"}</Text>
                <Text style={c.hint} numberOfLines={2}>{a.address_text}</Text>
              </View>
              <Text style={{ color: C.primary, fontSize: 18 }}>{p.selected === a.id ? "●" : "○"}</Text>
            </View>
          </Pressable>
        ))}
        <Button title={p.busy ? "..." : "📍 استعمل موقعي الحالي" } onPress={p.onLocate} disabled={p.busy} variant="soft" />
        <Button title="تسجيل الخروج" onPress={p.onSignOut} variant="ghost" />
        <Text style={[c.hint, { textAlign: "center", marginTop: 16 }]}>WASSLHA · برشيد</Text>
      </ScrollView>
    </Screen>
  );
}

export function GetScreen(p: {
  title: string; setTitle: (v: string) => void; item: string; setItem: (v: string) => void; place: string; setPlace: (v: string) => void;
  addressLabel: string; busy: boolean; onBack: () => void; onAddress: () => void; onSubmit: () => void;
}) {
  return (
    <Screen>
      <TopBar title="جيب ليا" onBack={p.onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={[c.card, { backgroundColor: C.primarySoft, borderColor: C.primarySoft }]}>
          <Text style={[c.text, { textAlign: "right", lineHeight: 22 }]}>🛵 كتب لينا شنو بغيتي من أي بلاصة فبرشيد، وسائق غيمشي يجيبو ليك.</Text>
        </View>
        <Text style={c.label}>شنو بغيتي؟</Text>
        <TextInput value={p.title} onChangeText={p.setTitle} placeholder="مثلا: دوا، قهوة، كتاب..." placeholderTextColor={C.muted} style={c.input} />
        <Text style={c.label}>تفاصيل</Text>
        <TextInput value={p.item} onChangeText={p.setItem} placeholder="النوع، الكمية، أي ملاحظة" placeholderTextColor={C.muted} multiline style={[c.input, { height: 96, textAlignVertical: "top" }]} />
        <Text style={c.label}>من فين؟ (اختياري)</Text>
        <TextInput value={p.place} onChangeText={p.setPlace} placeholder="اسم المحل أو الحي" placeholderTextColor={C.muted} style={c.input} />
        <Pressable onPress={p.onAddress} style={[c.card, { marginTop: 12 }]}>
          <Text style={c.label}>التوصيل إلى</Text>
          <View style={c.rowBetween}>
            <Text style={[c.title, { flex: 1 }]} numberOfLines={2}>📍 {p.addressLabel}</Text>
            <Text style={c.link}>تغيير</Text>
          </View>
        </Pressable>
        <Button title={p.busy ? "..." : "أرسل الطلب"} onPress={p.onSubmit} disabled={p.busy} />
        {p.busy ? <ActivityIndicator color={C.primary} /> : null}
      </ScrollView>
    </Screen>
  );
}

const c = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 12 },
  rowBetween: { flexDirection: ROW, alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { fontSize: 15, fontWeight: "900", color: C.ink, textAlign: "right" },
  text: { fontSize: 14, color: C.ink },
  hint: { fontSize: 13, color: C.muted, textAlign: "right", marginTop: 6 },
  label: { fontSize: 12, fontWeight: "800", color: C.muted, textAlign: "right", marginTop: 10, marginBottom: 6 },
  link: { color: C.primary, fontWeight: "900" },
  price: { fontSize: 15, fontWeight: "900", color: C.primary, textAlign: "right", marginTop: 4 },
  section: { fontSize: 18, fontWeight: "900", color: C.ink, textAlign: "right", marginVertical: 10 },
  sum: { flexDirection: ROW, justifyContent: "space-between", marginTop: 10 },
  total: { fontSize: 20, fontWeight: "900", color: C.ink },
  divider: { height: 1, backgroundColor: C.line, marginTop: 14 },
  tipRow: { flexDirection: ROW, flexWrap: "wrap", gap: 8 },
  tip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line },
  tipOn: { backgroundColor: C.primary, borderColor: C.primary },
  tipText: { fontWeight: "800", color: C.ink, fontSize: 13 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 26, borderTopWidth: 1, borderTopColor: C.line },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.ink, textAlign: "right" },
});
