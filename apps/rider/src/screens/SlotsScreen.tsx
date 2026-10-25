import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, ROW } from "../theme";
import type { Slot } from "../lib/types";
import { Button, Card, Chip, Empty, Page, Row, Title } from "../components/ui";

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const SHIFTS = [
  { label: "صباح", from: 8 * 60, to: 12 * 60 },
  { label: "زوال", from: 12 * 60, to: 16 * 60 },
  { label: "عشية", from: 16 * 60, to: 20 * 60 },
  { label: "ليل", from: 20 * 60, to: 23 * 60 + 59 },
  { label: "نهار كامل", from: 8 * 60, to: 23 * 60 + 59 },
];
const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (m: number) => void }) {
  return (
    <View style={s.stepper}>
      <Text style={s.small}>{label}</Text>
      <View style={{ flexDirection: ROW, alignItems: "center", gap: 12 }}>
        <Pressable style={s.stepBtn} onPress={() => onChange(Math.max(0, value - 30))}><Text style={s.stepBtnText}>−</Text></Pressable>
        <Text style={s.stepValue}>{hhmm(value)}</Text>
        <Pressable style={s.stepBtn} onPress={() => onChange(Math.min(23 * 60 + 59, value + 30))}><Text style={s.stepBtnText}>+</Text></Pressable>
      </View>
    </View>
  );
}

export function SlotsScreen({ slots, mine, busyKey, refreshing, onRefresh, onBook, onWaitlist, onQuickBook }: {
  slots: Slot[]; mine: Set<string>; busyKey: string | null; refreshing: boolean; onRefresh: () => void;
  onBook: (id: string) => void; onWaitlist: (id: string) => void;
  onQuickBook: (f: { slot_date: string; start_time: string; end_time: string }) => Promise<boolean>;
}) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; }), []);
  const [dayIdx, setDayIdx] = useState(0);
  const [from, setFrom] = useState(8 * 60);
  const [to, setTo] = useState(23 * 60 + 59);
  const valid = to > from;
  const day = days[dayIdx];

  return (
    <Page refreshing={refreshing} onRefresh={onRefresh}>
      <Title text="حجز وقت الخدمة" />
      <Text style={s.hint}>اختار النهار والوقت اللي بغيتي تخدم فيه، وضغط احجز. منين يدخل الوقت ديالك تقدر تفعّل Online.</Text>

      <Card>
        <Text style={s.label}>1 · النهار</Text>
        <View style={{ flexDirection: ROW, gap: 6 }}>
          {days.map((d, i) => (
            <Pressable key={i} onPress={() => setDayIdx(i)} style={[s.day, i === dayIdx ? s.dayOn : null]}>
              <Text style={[s.dayName, i === dayIdx ? { color: "#fff" } : null]}>{i === 0 ? "اليوم" : DAYS[d.getDay()].slice(0, 3)}</Text>
              <Text style={[s.dayNum, i === dayIdx ? { color: "#fff" } : null]}>{d.getDate()}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>2 · الوقت</Text>
        <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 8 }}>
          {SHIFTS.map((sh) => {
            const on = sh.from === from && sh.to === to;
            return (
              <Pressable key={sh.label} onPress={() => { setFrom(sh.from); setTo(sh.to); }} style={[s.chip, on ? s.chipOn : null]}>
                <Text style={[s.chipText, on ? { color: "#fff" } : null]}>{sh.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: ROW, justifyContent: "space-around" }}>
          <Stepper label="من" value={from} onChange={setFrom} />
          <Stepper label="إلى" value={to} onChange={setTo} />
        </View>

        <Text style={s.summary}>{DAYS[day.getDay()]} {day.getDate()}/{day.getMonth() + 1}  ·  {hhmm(from)} → {hhmm(to)}</Text>
        {!valid ? <Text style={s.error}>وقت النهاية خاصه يكون من بعد وقت البداية.</Text> : null}
        <Button
          title={busyKey === "quick" ? "..." : "✅ احجز هاد الوقت"}
          disabled={!valid || busyKey !== null}
          onPress={() => void onQuickBook({ slot_date: isoDate(day), start_time: hhmm(from), end_time: hhmm(to) })}
        />
      </Card>

      <Title text="الأوقات المسجّلة" />
      {slots.map((slot) => {
        const booked = mine.has(slot.id);
        return (
          <Card key={slot.id}>
            <Row>
              <Text style={s.slotDate}>{slot.slot_date}</Text>
              {booked ? <Chip text="محجوز ليك ✓" tone="ok" /> : <Chip text={slot.status === "open" ? "متاح" : slot.status} tone="neutral" />}
            </Row>
            <Text style={s.slotTime}>{slot.start_time.slice(0, 5)} → {slot.end_time.slice(0, 5)}  ·  السعة {slot.capacity}</Text>
            {!booked ? (
              <View style={{ flexDirection: ROW, gap: 8 }}>
                <View style={{ flex: 1 }}><Button title={busyKey === slot.id ? "..." : "احجز"} onPress={() => onBook(slot.id)} disabled={busyKey !== null} /></View>
                <View style={{ flex: 1 }}><Button title="لائحة الانتظار" variant="soft" onPress={() => onWaitlist(slot.id)} disabled={busyKey !== null} /></View>
              </View>
            ) : null}
          </Card>
        );
      })}
      {slots.length === 0 ? <Empty icon="🗓️" title="ما كاين حتى Slot" text="اختار نهار ووقت من لفوق وضغط احجز." /> : null}
    </Page>
  );
}

const s = StyleSheet.create({
  hint: { color: C.muted, lineHeight: 20, textAlign: "right" },
  label: { fontSize: 14, fontWeight: "900", color: C.ink, textAlign: "right" },
  small: { fontSize: 12, color: C.muted, fontWeight: "800" },
  day: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 14, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line },
  dayOn: { backgroundColor: C.primary, borderColor: C.primary },
  dayName: { fontSize: 11, color: C.muted, fontWeight: "800" },
  dayNum: { fontSize: 17, color: C.ink, fontWeight: "900", marginTop: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontWeight: "800", color: C.ink },
  stepper: { alignItems: "center", gap: 6 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontSize: 22, fontWeight: "900", color: C.ink },
  stepValue: { fontSize: 20, fontWeight: "900", color: C.ink, minWidth: 64, textAlign: "center" },
  summary: { textAlign: "center", fontWeight: "900", color: C.primary, fontSize: 15 },
  error: { color: C.danger, textAlign: "center", fontWeight: "700" },
  slotDate: { fontSize: 16, fontWeight: "900", color: C.ink },
  slotTime: { color: C.ink, fontSize: 15, fontWeight: "700", textAlign: "right" },
});
