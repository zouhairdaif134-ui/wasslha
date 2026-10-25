import { Alert, StyleSheet, Text, View } from "react-native";
import { C, ROW } from "../theme";
import type { Delivery, DeliveryStatus, Pos } from "../lib/types";
import { distanceKm, kmLabel, money, openNavigation, orderCode, pointOf } from "../lib/format";
import { Button, Card, Chip, Row } from "./ui";
import { LiveMap } from "./LiveMap";

// Same courier flow as the big delivery apps: arrived at store -> picked up -> on the way -> delivered.
const STEPS = ["المتجر", "الاستلام", "الطريق", "التسليم"];
const NEXT: DeliveryStatus[] = ["at_pickup", "picked_up", "in_transit", "delivered"];
const ACTION = ["وصلت للمتجر", "استلمت الطلب", "بديت التوصيل للزبون", "سلمت الطلب"];
const HEADLINE = ["سير للمتجر", "استلم الطلب من المتجر", "الطلب معاك، بدا التوصيل", "سير للزبون وسلم الطلب"];

function stageOf(status?: string | null): number {
  if (status === "at_pickup") return 1;
  if (status === "picked_up") return 2;
  if (status === "in_transit") return 3;
  return 0; // accepted / assigned
}

export function ActiveDelivery({ d, pos, gps, busy, onStatus }: {
  d: Delivery; pos: Pos | null; gps: string; busy: boolean; onStatus: (status: DeliveryStatus, reason?: string) => void;
}) {
  const stage = stageOf(d.status);
  const pickup = pointOf(d.pickup_latitude, d.pickup_longitude);
  const customer = pointOf(d.delivery_latitude, d.delivery_longitude);
  const toPickup = stage < 2;
  const target = toPickup ? pickup : customer;
  const cash = d.payment_method === "cod" ? Number(d.collect_minor ?? 0) : 0;
  const km = pos && target ? distanceKm(pos, target) : null;

  function advance() {
    const next = NEXT[stage];
    if (next !== "delivered") { onStatus(next); return; }
    Alert.alert(
      "تأكيد التسليم",
      cash > 0 ? `اقبض ${money(cash)} كاش من الزبون، عاد أكّد.` : "واش سلمتي الطلب للزبون؟",
      [{ text: "رجع", style: "cancel" }, { text: cash > 0 ? "قبضت وسلمت" : "سلمت", onPress: () => onStatus("delivered") }]
    );
  }
  function problem() {
    Alert.alert("مشكل فالتوصيل؟", "اختار السبب:", [
      { text: "الزبون ما جاوبش", onPress: () => onStatus("failed", "customer_unreachable") },
      { text: "العنوان ما تلقاش", onPress: () => onStatus("failed", "address_not_found") },
      { text: "رجع", style: "cancel" },
    ]);
  }

  return (
    <Card>
      <Row>
        <Text style={s.code}>{orderCode(d.master_order_id)}</Text>
        <Chip text={gps === "live" ? "GPS مباشر" : "GPS متوقف"} tone={gps === "live" ? "ok" : "warn"} />
      </Row>

      <View style={s.steps}>
        {STEPS.map((label, i) => (
          <View key={label} style={s.step}>
            <View style={[s.dot, i <= stage ? { backgroundColor: C.primary } : null]}><Text style={[s.dotText, i <= stage ? { color: "#fff" } : null]}>{i < stage ? "✓" : i + 1}</Text></View>
            <Text style={[s.stepLabel, i === stage ? { color: C.primary, fontWeight: "900" } : null]}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={s.headline}>{HEADLINE[stage]}</Text>
      <LiveMap rider={pos} pickup={pickup} customer={customer} />

      <View style={s.target}>
        <Text style={s.targetLabel}>{toPickup ? "نقطة الاستلام" : "عنوان الزبون"}{km != null ? `  ·  حوالي ${kmLabel(km)}` : ""}</Text>
        <Text style={s.targetText}>{toPickup ? (d.pickup_address_text || "المتجر") : d.delivery_address_text}</Text>
        {!toPickup && d.customer_note ? <Text style={s.note}>📝 {d.customer_note}</Text> : null}
      </View>

      {cash > 0 ? (
        <View style={s.cash}>
          <Text style={s.cashLabel}>اقبض من الزبون (كاش)</Text>
          <Text style={s.cashValue}>{money(cash)}</Text>
        </View>
      ) : null}

      <Button title="🧭 الملاحة" variant="soft" onPress={() => openNavigation(target, toPickup ? "المتجر" : "الزبون")} />
      <Button title={busy ? "..." : ACTION[stage]} disabled={busy} onPress={advance} />
      <Text style={s.problem} onPress={busy ? undefined : problem}>واجهتي مشكل؟</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  code: { fontSize: 18, fontWeight: "900", color: C.ink },
  steps: { flexDirection: ROW, justifyContent: "space-between" },
  step: { alignItems: "center", flex: 1, gap: 4 },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.line, alignItems: "center", justifyContent: "center" },
  dotText: { fontSize: 12, fontWeight: "900", color: C.muted },
  stepLabel: { fontSize: 11, color: C.muted },
  headline: { fontSize: 18, fontWeight: "900", color: C.ink, textAlign: "right" },
  target: { backgroundColor: C.bg, borderRadius: 14, padding: 12, gap: 4 },
  targetLabel: { color: C.muted, fontSize: 12, fontWeight: "800", textAlign: "right" },
  targetText: { color: C.ink, fontSize: 15, lineHeight: 22, fontWeight: "700", textAlign: "right" },
  note: { color: C.muted, fontSize: 13, textAlign: "right" },
  cash: { backgroundColor: C.accent, borderRadius: 14, padding: 12, alignItems: "center" },
  cashLabel: { color: "#5A4100", fontWeight: "800", fontSize: 12 },
  cashValue: { color: C.ink, fontSize: 28, fontWeight: "900" },
  problem: { color: C.danger, fontWeight: "800", textAlign: "center", paddingVertical: 6 },
});
