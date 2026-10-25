import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, ROW } from "../theme";
import type { Tab } from "../lib/types";

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: "home", icon: "🏠", label: "الرئيسية" },
  { key: "orders", icon: "📦", label: "توصيلاتي" },
  { key: "slots", icon: "🗓️", label: "Slots" },
  { key: "earnings", icon: "💰", label: "الأرباح" },
  { key: "profile", icon: "👤", label: "حسابي" },
];

export function TabBar({ active, badge, onChange }: { active: Tab; badge: number; onChange: (t: Tab) => void }) {
  return (
    <View style={s.bar}>
      {TABS.map((t) => (
        <Pressable key={t.key} onPress={() => onChange(t.key)} style={s.item}>
          <View>
            <Text style={[s.icon, active === t.key ? null : { opacity: 0.5 }]}>{t.icon}</Text>
            {t.key === "home" && badge > 0 ? <View style={s.badge}><Text style={s.badgeText}>{badge}</Text></View> : null}
          </View>
          <Text style={[s.label, active === t.key ? { color: C.primary, fontWeight: "900" } : null]}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: ROW, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line, paddingBottom: 10, paddingTop: 8 },
  item: { flex: 1, alignItems: "center", gap: 2 },
  icon: { fontSize: 22 },
  label: { fontSize: 11, color: C.muted, fontWeight: "700" },
  badge: { position: "absolute", top: -4, right: -10, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
});
