import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, ROW, TOP, tileColor } from "../theme";
import type { Tab } from "../lib/types";

export type IconName = keyof typeof Ionicons.glyphMap;

export function Button({ title, onPress, variant = "primary", disabled = false, small = false }: {
  title: string; onPress: () => void; variant?: "primary" | "soft" | "ghost" | "danger"; disabled?: boolean; small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        variant === "soft" && { backgroundColor: C.primarySoft },
        variant === "ghost" && { backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
        variant === "danger" && { backgroundColor: C.dangerSoft },
        (disabled || pressed) && { opacity: disabled ? 0.45 : 0.85 },
      ]}
    >
      <Text style={[s.btnText, variant === "soft" && { color: C.primary }, variant === "ghost" && { color: C.ink }, variant === "danger" && { color: C.danger }]}>{title}</Text>
    </Pressable>
  );
}

export function Pill({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "ok" | "warn" | "danger" | "info" }) {
  const p =
    tone === "ok" ? { bg: C.okSoft, fg: C.ok }
    : tone === "danger" ? { bg: C.dangerSoft, fg: C.danger }
    : tone === "warn" ? { bg: "#FFF0E0", fg: "#B45309" }
    : tone === "info" ? { bg: C.accentSoft, fg: "#8A6100" }
    : { bg: "#F0F0F0", fg: C.muted };
  return (
    <View style={[s.pill, { backgroundColor: p.bg }]}>
      <Text style={[s.pillText, { color: p.fg }]}>{text}</Text>
    </View>
  );
}

export function Empty({ emoji, title, hint }: { emoji: string; title: string; hint?: string }) {
  return (
    <View style={s.empty}>
      <Text style={{ fontSize: 46 }}>{emoji}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      {hint ? <Text style={s.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

export function Stepper({ quantity, onMinus, onPlus }: { quantity: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={s.stepper}>
      <Pressable onPress={onMinus} hitSlop={8} style={s.stepBtn}><Text style={s.stepGlyph}>−</Text></Pressable>
      <Text style={s.stepQty}>{quantity}</Text>
      <Pressable onPress={onPlus} hitSlop={8} style={s.stepBtn}><Text style={s.stepGlyph}>+</Text></Pressable>
    </View>
  );
}

// Photo when available, otherwise a soft coloured tile with an icon (photos are added by the admin).
export function Cover({ uri, emoji, seed, height, radius = 16, width }: {
  uri?: string | null; emoji: string; seed: string; height: number; radius?: number; width?: number;
}) {
  if (uri) {
    return <Image source={{ uri }} resizeMode="cover" style={{ width: width ?? "100%", height, borderRadius: radius }} />;
  }
  return (
    <View style={{ width: width ?? "100%", height, borderRadius: radius, backgroundColor: tileColor(seed), alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: Math.round(height * 0.42) }}>{emoji}</Text>
    </View>
  );
}

export function TopBar({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <View style={s.topBar}>
      <Pressable onPress={onBack} hitSlop={10} style={s.roundBtn}><Ionicons name="arrow-forward" size={22} color={C.ink} /></Pressable>
      <Text style={s.topTitle} numberOfLines={1}>{title}</Text>
      <View style={{ minWidth: 44, alignItems: "center" }}>{right ?? null}</View>
    </View>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: TOP }}>{children}</View>;
}

const NAV: { tab: Tab; label: string; icon: IconName; active: IconName }[] = [
  { tab: "home", label: "الرئيسية", icon: "home-outline", active: "home" },
  { tab: "explore", label: "اكتشف", icon: "compass-outline", active: "compass" },
  { tab: "cart", label: "السلة", icon: "cart-outline", active: "cart" },
  { tab: "orders", label: "طلباتي", icon: "receipt-outline", active: "receipt" },
  { tab: "profile", label: "حسابي", icon: "person-outline", active: "person" },
];

export function BottomNav({ tab, onTab, cartCount, activeOrders }: { tab: Tab; onTab: (t: Tab) => void; cartCount: number; activeOrders: number }) {
  return (
    <View style={s.nav}>
      {NAV.map((n) => {
        const on = tab === n.tab;
        const badge = n.tab === "cart" ? cartCount : n.tab === "orders" ? activeOrders : 0;
        return (
          <Pressable key={n.tab} style={s.navItem} onPress={() => onTab(n.tab)} accessibilityLabel={n.label}>
            <View>
              <Ionicons name={on ? n.active : n.icon} size={24} color={on ? C.primary : C.muted} />
              {badge > 0 ? <View style={s.navBadge}><Text style={s.navBadgeText}>{badge}</Text></View> : null}
            </View>
            <Text style={[s.navLabel, on && { color: C.primary }]}>{n.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const s = StyleSheet.create({
  btn: { backgroundColor: C.primary, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, alignItems: "center", marginVertical: 6 },
  btnSmall: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12, marginVertical: 0 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: 36, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 17, fontWeight: "900", color: C.ink, marginTop: 8, textAlign: "center" },
  emptyHint: { color: C.muted, marginTop: 4, textAlign: "center", lineHeight: 20 },
  stepper: { flexDirection: ROW, alignItems: "center", backgroundColor: C.primarySoft, borderRadius: 999, paddingHorizontal: 4 },
  stepBtn: { width: 32, height: 34, alignItems: "center", justifyContent: "center" },
  stepGlyph: { fontSize: 20, fontWeight: "900", color: C.primary },
  stepQty: { minWidth: 22, textAlign: "center", fontWeight: "900", color: C.ink },
  topBar: { flexDirection: ROW, alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "900", color: C.ink },
  nav: { flexDirection: ROW, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, paddingBottom: 14 },
  navItem: { flex: 1, alignItems: "center", gap: 2 },
  navLabel: { fontSize: 11, color: C.muted, fontWeight: "700" },
  navBadge: { position: "absolute", top: -4, right: -8, backgroundColor: C.primary, minWidth: 17, height: 17, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  navBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
});
