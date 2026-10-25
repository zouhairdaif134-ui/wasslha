import { StyleSheet, Text } from "react-native";
import { C } from "../theme";
import type { Assignment, Delivery } from "../lib/types";
import { money, orderCode, statusLabel } from "../lib/format";
import { Card, Chip, Empty, Page, Row, Title } from "../components/ui";

export function OrdersScreen({ rows, refreshing, onRefresh }: {
  rows: { a: Assignment; d?: Delivery }[]; refreshing: boolean; onRefresh: () => void;
}) {
  return (
    <Page refreshing={refreshing} onRefresh={onRefresh}>
      <Title text="توصيلاتي" />
      {rows.map(({ a, d }) => {
        const status = d?.status ?? a.status;
        const tone = status === "delivered" ? "ok" : status === "failed" || status === "cancelled" || a.status === "rejected" ? "danger" : "warn";
        const cash = d && d.payment_method === "cod" ? Number(d.collect_minor ?? 0) : 0;
        return (
          <Card key={a.id}>
            <Row>
              <Text style={s.code}>{d ? orderCode(d.master_order_id) : "طلب"}</Text>
              <Chip text={a.status === "rejected" ? "مرفوض" : statusLabel(status)} tone={tone} />
            </Row>
            {d ? <Text style={s.addr}>{d.delivery_address_text}</Text> : null}
            {cash > 0 ? <Text style={s.meta}>كاش مقبوض: {money(cash)}</Text> : null}
            {a.offered_at ? <Text style={s.meta}>{new Date(a.offered_at).toLocaleString("fr-MA")}</Text> : null}
          </Card>
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
});
