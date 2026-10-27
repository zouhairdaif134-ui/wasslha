import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { C } from "../theme";
import type { Assignment, Delivery } from "../lib/types";
import { money, orderCode, statusLabel } from "../lib/format";
import { fmtDateTime } from "../lib/time";
import { Card, Chip, Empty, Page, Row, Title } from "../components/ui";

export function OrdersScreen({ rows, refreshing, onRefresh }: {
  rows: { a: Assignment; d?: Delivery }[]; refreshing: boolean; onRefresh: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Page refreshing={refreshing} onRefresh={onRefresh}>
      <Title text="توصيلاتي" />
      {rows.map(({ a, d }) => {
        const status = d?.status ?? a.status;
        const tone = status === "delivered" ? "ok" : status === "failed" || status === "cancelled" || a.status === "rejected" ? "danger" : "warn";
        const cash = d && d.payment_method === "cod" ? Number(d.collect_minor ?? 0) : 0;
        const isOpen = open === a.id;
        return (
          <Pressable key={a.id} onPress={() => setOpen(isOpen ? null : a.id)}>
            <Card>
              <Row>
                <Text style={s.code}>{d ? orderCode(d.master_order_id) : "طلب"}</Text>
                <Chip text={a.status === "rejected" ? "مرفوض" : a.status === "expired" ? "انتهى العرض" : statusLabel(status)} tone={tone} />
              </Row>
              {a.offered_at ? <Text style={s.meta}>{fmtDateTime(a.offered_at)}</Text> : null}
              {d ? <Text style={s.addr} numberOfLines={isOpen ? undefined : 1}>{d.delivery_address_text}</Text> : null}
              {isOpen && d ? (
                <>
                  <Text style={s.meta}>🏪 الاستلام: {d.pickup_address_text || "—"}</Text>
                  {cash > 0 ? <Text style={s.meta}>💵 كاش: {money(cash)}</Text> : <Text style={s.meta}>مخلّص مسبقا</Text>}
                  {d.customer_note ? <Text style={s.meta}>📝 {d.customer_note}</Text> : null}
                </>
              ) : null}
              <Text style={s.more}>{isOpen ? "▲ أقل" : "▼ التفاصيل"}</Text>
            </Card>
          </Pressable>
        );
      })}
      {rows.length === 0 ? <Empty icon="📦" title="ما كايناش توصيلات" text="التوصيلات ديالك غيبانو هنا." /> : null}
    </Page>
  );
}

const s = StyleSheet.create({
  code: { fontSize: 16, fontWeight: "900", color: C.ink },
  addr: { color: C.ink, fontSize: 14, lineHeight: 21, textAlign: "right" },
  meta: { color: C.muted, fontSize: 12, textAlign: "right" },
  more: { color: C.primary, fontSize: 12, fontWeight: "800", textAlign: "left" },
});
