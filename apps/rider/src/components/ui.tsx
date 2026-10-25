import type { ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { C, ROW, TOP } from "../theme";

export function Page({ children, refreshing, onRefresh }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void }) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: TOP + 12, paddingHorizontal: 16, paddingBottom: 28, gap: 12 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[C.primary]} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

type Variant = "primary" | "soft" | "dark" | "danger";
export function Button({ title, onPress, disabled, variant = "primary", flex }: { title: string; onPress: () => void; disabled?: boolean; variant?: Variant; flex?: boolean }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [u.btn, u[variant], flex ? { flex: 1 } : null, disabled ? { opacity: 0.45 } : null, pressed ? { opacity: 0.8 } : null]}
    >
      <Text style={[u.btnText, variant === "soft" ? { color: C.ink } : null]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, tone }: { children: ReactNode; tone?: "warn" | "danger" }) {
  return <View style={[u.card, tone === "warn" ? { backgroundColor: C.accentSoft, borderColor: C.accent } : null, tone === "danger" ? { backgroundColor: C.dangerSoft, borderColor: C.danger } : null]}>{children}</View>;
}

export function Chip({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "ok" | "warn" | "danger" }) {
  const map = { neutral: [C.line, C.ink], ok: [C.okSoft, C.ok], warn: [C.accentSoft, "#8A6100"], danger: [C.dangerSoft, C.danger] } as const;
  return <View style={{ backgroundColor: map[tone][0], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}><Text style={{ color: map[tone][1], fontSize: 12, fontWeight: "800" }}>{text}</Text></View>;
}

export function Stat({ value, label }: { value: string; label: string }) {
  return <View style={u.stat}><Text style={u.statValue}>{value}</Text><Text style={u.statLabel}>{label}</Text></View>;
}

export function Title({ text }: { text: string }) {
  return <Text style={u.title}>{text}</Text>;
}

export function Empty({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <View style={u.empty}>
      <Text style={{ fontSize: 40 }}>{icon}</Text>
      <Text style={u.emptyTitle}>{title}</Text>
      <Text style={u.emptyText}>{text}</Text>
    </View>
  );
}

export const Row = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: ROW, alignItems: "center", justifyContent: "space-between", gap: 10 }}>{children}</View>;

const u = StyleSheet.create({
  btn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  primary: { backgroundColor: C.primary },
  soft: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  dark: { backgroundColor: C.ink },
  danger: { backgroundColor: C.danger },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  card: { backgroundColor: C.card, borderRadius: 18, padding: 14, gap: 10, borderWidth: 1, borderColor: C.line },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.line, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "900", color: C.ink },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 2, textAlign: "center" },
  title: { fontSize: 20, fontWeight: "900", color: C.ink, textAlign: "right" },
  empty: { alignItems: "center", padding: 28, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: C.ink },
  emptyText: { color: C.muted, textAlign: "center", lineHeight: 20 },
});
