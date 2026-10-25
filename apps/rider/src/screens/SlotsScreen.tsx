import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { C, ROW } from "../theme";
import type { Slot } from "../lib/types";
import { Button, Card, Chip, Empty, Page, Row, Title } from "../components/ui";

export function SlotsScreen({ slots, busyKey, refreshing, onRefresh, onBook, onWaitlist, onCreate }: {
  slots: Slot[]; busyKey: string | null; refreshing: boolean; onRefresh: () => void;
  onBook: (id: string) => void; onWaitlist: (id: string) => void;
  onCreate: (f: { slot_date: string; start_time: string; end_time: string; capacity: number }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cap, setCap] = useState("1");
  const ready = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(from) && /^\d{2}:\d{2}$/.test(to) && Number(cap) >= 1;

  async function create() {
    const ok = await onCreate({ slot_date: date, start_time: from, end_time: to, capacity: Math.trunc(Number(cap)) });
    if (ok) { setOpen(false); setDate(""); setFrom(""); setTo(""); setCap("1"); }
  }

  return (
    <Page refreshing={refreshing} onRefresh={onRefresh}>
      <Title text="Slots" />
      <Text style={s.hint}>احجز الوقت اللي بغيتي تخدم فيه. النظام كيتحكم فالسعة والتداخل ووقت الراحة.</Text>

      <Card>
        <Text style={s.cardTitle} onPress={() => setOpen(!open)}>{open ? "✕ إغلاق" : "＋ أنشئ Slot جديد"}</Text>
        {open ? (
          <>
            <TextInput placeholder="التاريخ: 2026-10-27" placeholderTextColor={C.muted} value={date} onChangeText={setDate} style={s.input} />
            <View style={{ flexDirection: ROW, gap: 8 }}>
              <TextInput placeholder="من 09:00" placeholderTextColor={C.muted} value={from} onChangeText={setFrom} style={[s.input, { flex: 1 }]} />
              <TextInput placeholder="إلى 13:00" placeholderTextColor={C.muted} value={to} onChangeText={setTo} style={[s.input, { flex: 1 }]} />
              <TextInput placeholder="السعة" placeholderTextColor={C.muted} keyboardType="number-pad" value={cap} onChangeText={setCap} style={[s.input, { width: 70 }]} />
            </View>
            <Button title={busyKey === "create" ? "..." : "إنشاء"} onPress={() => void create()} disabled={!ready || busyKey !== null} />
          </>
        ) : null}
      </Card>

      {slots.map((slot) => (
        <Card key={slot.id}>
          <Row>
            <Text style={s.cardTitle}>{slot.slot_date}</Text>
            <Chip text={slot.status} tone={slot.status === "open" ? "ok" : "neutral"} />
          </Row>
          <Text style={s.time}>{slot.start_time.slice(0, 5)} → {slot.end_time.slice(0, 5)}  ·  السعة {slot.capacity}</Text>
          <View style={{ flexDirection: ROW, gap: 8 }}>
            <View style={{ flex: 1 }}><Button title={busyKey === slot.id ? "..." : "احجز"} onPress={() => onBook(slot.id)} disabled={busyKey !== null} /></View>
            <View style={{ flex: 1 }}><Button title="لائحة الانتظار" variant="soft" onPress={() => onWaitlist(slot.id)} disabled={busyKey !== null} /></View>
          </View>
        </Card>
      ))}
      {slots.length === 0 ? <Empty icon="🗓️" title="ما كاين حتى Slot" text="ما كايناش Slots متاحة دابا." /> : null}
    </Page>
  );
}

const s = StyleSheet.create({
  hint: { color: C.muted, lineHeight: 20, textAlign: "right" },
  cardTitle: { fontSize: 16, fontWeight: "900", color: C.ink, textAlign: "right" },
  time: { color: C.ink, fontSize: 15, fontWeight: "700", textAlign: "right" },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: C.ink, textAlign: "right" },
});
