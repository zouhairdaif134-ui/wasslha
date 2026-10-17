import { I18nManager, Platform, StatusBar } from "react-native";

// WASSLHA identity (approved spec): yellow #FFC928, red #E53935, white.
export const C = {
  primary: "#E53935",
  primaryDark: "#C62828",
  primarySoft: "#FDECEA",
  accent: "#FFC928",
  accentSoft: "#FFF6D6",
  bg: "#F7F7F7",
  card: "#FFFFFF",
  ink: "#222222",
  muted: "#757575",
  line: "#EEEEEE",
  ok: "#0E9F6E",
  okSoft: "#E3F7EE",
  danger: "#D92D3B",
  dangerSoft: "#FDECEE",
};

export const TOP = Platform.OS === "android" ? (StatusBar.currentHeight ?? 28) : 44;
// Arabic content in an LTR layout: reverse rows so the first item sits on the right.
export const ROW = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);

const TILE_COLORS = ["#FFF1C2", "#FDEBE9", "#E9F5DC", "#E6F1FB", "#F3E6FF", "#FFE8D6"];
export const tileColor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return TILE_COLORS[hash % TILE_COLORS.length];
};
