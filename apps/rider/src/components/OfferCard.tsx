import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { C } from "../theme";
import type { Assignment, Delivery, Pos } from "../lib/types";
import { distanceKm, kmLabel, money, orderCode, pointOf } from "../lib/format";
import { Button, Card, Chip, Row } from "./ui";

// The dispatcher cancels an unanswered offer after 120 seconds (dispatch_auto_assign_pending, p_offer_timeout_seconds).
const OFFER_SECONDS = 120;

export function OfferCard({ a, d, pos, busy, onRespond }: {
  a: Assignment; d?: Delivery; pos: Pos | null; busy: boolean; onRespond: (id: string, status: "accepted" | "rejected") => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const started = a.offered_at ? Date.parse(a.offered_at) : NaN;
  const left = Number.isFinite(started) ? Math.min(OFFER_SECONDS, Math.max(0, OFFER_SECONDS - Math.floor((now - started) / 1000))) : null;
  const expired = left === 0;

  const pickup = d ? pointOf(d.pickup_latitude, d.pickup_longitude) : null;
  const customer = d ? pointOf(d.delivery_latitude, d.delivery_longitude) : null;
  const toStore = pos && pickup ? distanceKm(pos, pickup) : null;
  const trip = pickup && customer ? distanceKm(pickup, customer) : null;
  const cash = d && d.payment_method === "cod" ? Number(d.collect_minor ?? 0) : 0;
  return (
    <Card>
      <Row>
        <Text style={s.code}>{d ? orderCode(d.master_order_id) : "طلب جديد"}</Text>
        {left != null ? <Chip text={expired ? "انتهى العرض" : `باقي ${left} ث`} tone={expired ? "danger" : left <= 20 ? "danger" : "warn"} /> : <Chip text="عرض جديد" tone="warn" />}
      </Row>
      {d ? (
        <>
          <View style={s.line}><Text style={s.label}>🏪 الاستلام</Text><Text style={s.text}>{d.pickup_address_text || "المتجر"}</Text></View>
          <View style={s.line}><Text style={s.label}>🏠 التسليم</Text><Text style={s.text}>{d.delivery_address_text}</Text></View>
          <Row>
            <Text style={s.meta}>{toStore != null ? `للمتجر حوالي ${kmLabel(toStore)}` : ""}</Text>
            <Text style={s.meta}>{trip != null ? `المسار حوالي ${kmLabel(trip)}` : ""}</Text>
          </Row>
          {cash > 0 ? <Chip text={`كاش: غتقبض ${money(cash)} من الزبون`} tone="warn" /> : <Chip text="مخلّص مسبقا" tone="ok" />}
        </>
      ) : null}
      <Row>
        <View style={{ flex: 1 }}><Button title="رفض" variant="soft" disabled={busy || expired} onPress={() => onRespond(a.id, "rejected")} /></View>
        <View style={{ flex: 2 }}><Button title={busy ? "..." : expired ? "انتهى العرض" : "قبول"} disabled={busy || expired} onPress={() => onRespond(a.id, "accepted")} /></View>
      </Row>
    </Card>
  );
}

const s = StyleSheet.create({
  code: { fontSize: 18, fontWeight: "900", color: C.ink },
  line: { gap: 2 },
  label: { color: C.muted, fontSize: 12, fontWeight: "800", textAlign: "right" },
  text: { color: C.ink, fontSize: 15, fontWeight: "700", lineHeight: 21, textAlign: "right" },
  meta: { color: C.muted, fontSize: 12 },
});
