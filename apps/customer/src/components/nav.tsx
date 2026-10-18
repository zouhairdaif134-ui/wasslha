import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, ROW } from "../theme";
import { Icon } from "./ui";
import type { IconName } from "./ui";

export type TabKey = "home" | "explore" | "cart" | "orders" | "profile";
const TABS: { key: TabKey; label: string; icon: IconName; active: IconName }[] = [
  { key: "home", label: "الرئيسية", icon: "home-outline", active: "home" },
  { key: "explore", label: "اكتشف", icon: "compass-outline", active: "compass" },
  { key: "cart", label: "السلة", icon: "cart-outline", active: "cart" },
  { key: "orders", label: "طلباتي", icon: "receipt-text-outline", active: "receipt-text" },
  { key: "profile", label: "حسابي", icon: "account-outline", active: "account" },
];

export function BottomNav({ active, cartCount, onChange }: { active: TabKey; cartCount: number; onChange: (key: TabKey) => void }) {
  return (
    <View style={n.bar}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Pressable key={t.key} style={n.item} onPress={() => onChange(t.key)}>
            <View>
              <Icon name={on ? t.active : t.icon} size={24} color={on ? C.primary : C.muted} />
              {t.key === "cart" && cartCount > 0 ? <View style={n.badge}><Text style={n.badgeText}>{cartCount}</Text></View> : null}
            </View>
            <Text style={[n.label, on && { color: C.primary, fontWeight: "800" }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const n = StyleSheet.create({
  bar: { flexDirection: ROW, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, paddingBottom: 14 },
  item: { flex: 1, alignItems: "center", gap: 2, minHeight: 48 },
  label: { fontSize: 11, color: C.muted, fontWeight: "600" },
  badge: { position: "absolute", top: -4, right: -8, backgroundColor: C.primary, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
});
