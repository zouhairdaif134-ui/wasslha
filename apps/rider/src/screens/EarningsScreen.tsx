import { StyleSheet, Text, View } from "react-native";
import { C, ROW } from "../theme";
import type { Cash, Earnings, Performance, Wallet } from "../lib/types";
import { money } from "../lib/format";
import { Card, Empty, Page, Stat, Title } from "../components/ui";

const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);

export function EarningsScreen({ wallet, cash, earnings, perf, refreshing, onRefresh }: {
  wallet: Wallet; cash: Cash; earnings: Earnings; perf: Performance | null; refreshing: boolean; onRefresh: () => void;
}) {
  const limit = Number(cash?.limit_minor ?? 0);
  const balance = Number(cash?.balance_minor ?? 0);
  const ratio = limit > 0 ? Math.min(1, Math.max(0, balance / limit)) : 0;
  return (
    <Page refreshing={refreshing} onRefresh={onRefresh}>
      <Title text="الأرباح والمحفظة" />
      <View style={s.wallet}>
        <Text style={s.walletLabel}>الرصيد المتاح</Text>
        <Text style={s.walletValue}>{money(wallet?.balance_minor)}</Text>
      </View>

      <View style={{ flexDirection: ROW, gap: 10 }}>
        <Stat value={money(earnings?.total_minor)} label="الإجمالي" />
        <Stat value={money(earnings?.pending_minor)} label="قيد التسوية" />
        <Stat value={money(earnings?.paid_minor)} label="مدفوع" />
      </View>

      <Card tone={cash?.blocked ? "danger" : undefined}>
        <Text style={s.cardTitle}>الكاش اللي عندك</Text>
        <Text style={s.cashValue}>{money(cash?.balance_minor)}</Text>
        <View style={s.bar}><View style={[s.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: ratio > 0.85 ? C.danger : C.primary }]} /></View>
        <Text style={s.meta}>الحد الأقصى {money(cash?.limit_minor)}  ·  المتبقي {money(cash?.remaining_minor)}</Text>
        {cash?.blocked ? <Text style={s.warn}>سلّم الكاش للإدارة باش تستقبل طلبات كاش جداد.</Text> : null}
      </Card>

      <Title text="الأداء" />
      {perf ? (
        <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 10 }}>
          <View style={s.cell}><Stat value={pct(perf.acceptance_rate)} label="قبول العروض" /></View>
          <View style={s.cell}><Stat value={pct(perf.completion_rate)} label="الإنجاز" /></View>
          <View style={s.cell}><Stat value={String(perf.completed_deliveries)} label="تم تسليمها" /></View>
          <View style={s.cell}><Stat value={perf.average_delivery_minutes == null ? "—" : `${Math.round(perf.average_delivery_minutes)} د`} label="متوسط المدة" /></View>
          <View style={s.cell}><Stat value={perf.customer_rating == null ? "—" : perf.customer_rating.toFixed(1)} label="تقييم الزبائن" /></View>
          <View style={s.cell}><Stat value={String(perf.late_deliveries)} label="متأخرة" /></View>
        </View>
      ) : (
        <Empty icon="📊" title="ما كايناش أداء بعد" text="الأداء غيبان منين تكمل أول توصيلات." />
      )}
    </Page>
  );
}

const s = StyleSheet.create({
  wallet: { backgroundColor: C.primary, borderRadius: 22, padding: 20, gap: 4 },
  walletLabel: { color: "#ffffffcc", fontWeight: "700", textAlign: "right" },
  walletValue: { color: "#fff", fontSize: 34, fontWeight: "900", textAlign: "right" },
  cardTitle: { fontSize: 15, fontWeight: "900", color: C.ink, textAlign: "right" },
  cashValue: { fontSize: 28, fontWeight: "900", color: C.ink, textAlign: "right" },
  bar: { height: 10, borderRadius: 5, backgroundColor: C.line, overflow: "hidden" },
  fill: { height: 10, borderRadius: 5 },
  meta: { color: C.muted, fontSize: 12, textAlign: "right" },
  warn: { color: C.danger, fontWeight: "800", textAlign: "right" },
  cell: { width: "31%", flexGrow: 1 },
});
