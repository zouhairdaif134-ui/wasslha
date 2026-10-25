import { StyleSheet, Switch, Text, View } from "react-native";
import { C, ROW } from "../theme";
import type { Assignment, Cash, Delivery, DeliveryStatus, Earnings, Pos, Rider } from "../lib/types";
import { money } from "../lib/format";
import { ActiveDelivery } from "../components/ActiveDelivery";
import { LiveMap } from "../components/LiveMap";
import { OfferCard } from "../components/OfferCard";
import { Button, Card, Empty, Page, Stat, Title } from "../components/ui";

export function HomeScreen(p: {
  rider: Rider | null; online: boolean; onToggle: (v: boolean) => void; gps: string; pos: Pos | null;
  active: Delivery | null; offers: { a: Assignment; d?: Delivery }[]; cash: Cash; earnings: Earnings; delivered: number;
  busyId: string | null; refreshing: boolean; onRefresh: () => void; onOpenSlots: () => void;
  onRespond: (id: string, status: "accepted" | "rejected") => void; onStatus: (status: DeliveryStatus, reason?: string) => void;
}) {
  return (
    <Page refreshing={p.refreshing} onRefresh={p.onRefresh}>
      <View style={[s.hero, p.online ? { backgroundColor: C.primary } : { backgroundColor: C.ink }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroLabel}>WASSLHA Rider</Text>
          <Text style={s.heroTitle}>{p.online ? "أنت Online" : "أنت Offline"}</Text>
          <Text style={s.heroSub}>{p.online ? (p.active ? "عندك توصيلة جارية" : "كنسناو أقرب طلب ليك") : "فعّل Online باش تبدا تستقبل الطلبات"}</Text>
        </View>
        <Switch value={p.online} onValueChange={p.onToggle} trackColor={{ false: "#ffffff44", true: C.accent }} thumbColor="#fff" />
      </View>

      {!p.online ? (
        <Card tone="warn">
          <Text style={s.tip}>باش تفعّل Online خاصك Slot محجوز فالوقت الحالي. احجز واحد ولا أنشئ واحد جديد.</Text>
          <Button title="🗓️ فتح Slots" variant="dark" onPress={p.onOpenSlots} />
        </Card>
      ) : null}

      {p.cash?.blocked ? (
        <Card tone="danger">
          <Text style={s.warn}>وصلتي للحد الأقصى ديال الكاش ({money(p.cash.limit_minor)}). سلّم الكاش للإدارة باش تستقبل طلبات كاش جداد.</Text>
        </Card>
      ) : null}

      {p.online && !p.active ? (
        p.pos ? <LiveMap rider={p.pos} pickup={null} customer={null} height={170} /> : <Text style={s.tip}>كنقلبو على موقعك... تأكد أن GPS مفعّل وأن التطبيق مسموح له بالموقع.</Text>
      ) : null}

      <View style={{ flexDirection: ROW, gap: 10 }}>
        <Stat value={String(p.offers.length)} label="عروض جديدة" />
        <Stat value={String(p.delivered)} label="توصيلات ناجحة" />
        <Stat value={money(p.earnings?.total_minor)} label="الأرباح" />
      </View>

      {p.active ? (
        <>
          <Title text="التوصيلة الجارية" />
          <ActiveDelivery d={p.active} pos={p.pos} gps={p.gps} busy={p.busyId === p.active.id} onStatus={p.onStatus} />
        </>
      ) : (
        <>
          <Title text="العروض" />
          {p.offers.map(({ a, d }) => (
            <OfferCard key={a.id} a={a} d={d} pos={p.pos} busy={p.busyId === a.id} onRespond={p.onRespond} />
          ))}
          {p.offers.length === 0 ? (
            <Empty
              icon={p.online ? "🛵" : "😴"}
              title={p.online ? "ما كاين حتى عرض دابا" : "أنت غير متصل"}
              text={p.online ? "بقا فالتطبيق مفتوح، غيهز ليك التيليفون ملي يوصل طلب." : "فعّل Online من المفتاح فاللول باش تبدا."}
            />
          ) : null}
        </>
      )}
    </Page>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: ROW, alignItems: "center", gap: 12, borderRadius: 22, padding: 18 },
  heroLabel: { color: "#ffffffaa", fontSize: 11, fontWeight: "800", letterSpacing: 1.4, textAlign: "right" },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "900", textAlign: "right", marginTop: 2 },
  heroSub: { color: "#ffffffcc", fontSize: 13, textAlign: "right", marginTop: 2 },
  warn: { color: C.danger, fontWeight: "800", lineHeight: 21, textAlign: "right" },
  tip: { color: C.ink, lineHeight: 21, textAlign: "right", fontWeight: "700" },
});
