import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, ROW } from "../theme";
import { supabase } from "../lib/supabase";
import type { Cash, Earnings, Performance, Wallet } from "../lib/types";
import { money } from "../lib/format";
import { fmtDateTime } from "../lib/time";
import { Card, Chip, Empty, Page, Row, Stat, Title } from "../components/ui";

const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);

type Entry = { id: string; total_minor: number | string; status: string; created_at: string };
const PERIODS = [
  { key: "today", label: "اليوم" },
  { key: "7", label: "7 أيام" },
  { key: "30", label: "30 يوم" },
  { key: "all", label: "الكل" },
];
const ENTRY_STATUS: Record<string, string> = { pending: "قيد التسوية", approved: "معتمد", paid: "مدفوع", cancelled: "ملغى" };

function sinceOf(key: string): number {
  if (key === "all") return 0;
  const d = new Date();
  if (key === "today") { d.setHours(0, 0, 0, 0); return d.getTime(); }
  d.setDate(d.getDate() - Number(key));
  return d.getTime();
}

export function EarningsScreen({ riderId, wallet, cash, earnings, perf, refreshing, onRefresh }: {
  riderId: string; wallet: Wallet; cash: Cash; earnings: Earnings; perf: Performance | null; refreshing: boolean; onRefresh: () => void;
}) {
  const [period, setPeriod] = useState("7");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [failed, setFailed] = useState(false);

  // Payment history (same rows the API sums for the totals); refetched whenever the total changes.
  useEffect(() => {
    let dead = false;
    (async () => {
      const r = await supabase.from("rider_earnings").select("id,total_minor,status,created_at").eq("rider_id", riderId).order("created_at", { ascending: false }).limit(200);
      if (dead) return;
      if (r.error) { setFailed(true); return; }
      setFailed(false);
      setEntries((r.data ?? []) as Entry[]);
    })();
    return () => { dead = true; };
  }, [riderId, String(earnings?.total_minor ?? ""), refreshing]);

  const shown = useMemo(() => {
    const from = sinceOf(period);
    return entries.filter((e) => Date.parse(e.created_at) >= from);
  }, [entries, period]);
  const periodTotal = shown.reduce((x, e) => x + Number(e.total_minor), 0);

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

      <Title text="المدفوعات حسب الفترة" />
      <View style={{ flexDirection: ROW, gap: 8 }}>
        {PERIODS.map((p) => (
          <Pressable key={p.key} onPress={() => setPeriod(p.key)} style={[s.period, period === p.key ? s.periodOn : null]}>
            <Text style={[s.periodText, period === p.key ? { color: "#fff" } : null]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>
      <Card>
        <Row>
          <Text style={s.cardTitle}>{money(periodTotal)}</Text>
          <Text style={s.meta}>{shown.length} توصيلة</Text>
        </Row>
        {failed ? <Text style={s.meta}>تعذر تحميل السجل دابا.</Text> : null}
        {shown.slice(0, 30).map((e) => (
          <Row key={e.id}>
            <Text style={s.entryAmount}>{money(e.total_minor)}</Text>
            <View style={{ flexDirection: ROW, gap: 8, alignItems: "center" }}>
              <Text style={s.meta}>{fmtDateTime(e.created_at)}</Text>
              <Chip text={ENTRY_STATUS[e.status] ?? e.status} tone={e.status === "paid" ? "ok" : "neutral"} />
            </View>
          </Row>
        ))}
        {!failed && shown.length === 0 ? <Text style={s.meta}>ما كاين حتى مدفوع فهاد الفترة.</Text> : null}
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
  cardTitle: { fontSize: 17, fontWeight: "900", color: C.ink, textAlign: "right" },
  cashValue: { fontSize: 28, fontWeight: "900", color: C.ink, textAlign: "right" },
  bar: { height: 10, borderRadius: 5, backgroundColor: C.line, overflow: "hidden" },
  fill: { height: 10, borderRadius: 5 },
  meta: { color: C.muted, fontSize: 12, textAlign: "right" },
  warn: { color: C.danger, fontWeight: "800", textAlign: "right" },
  cell: { width: "31%", flexGrow: 1 },
  period: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  periodOn: { backgroundColor: C.primary, borderColor: C.primary },
  periodText: { fontWeight: "800", color: C.ink, fontSize: 13 },
  entryAmount: { fontSize: 15, fontWeight: "900", color: C.ink },
});
