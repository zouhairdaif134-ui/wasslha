import { I18nManager, Platform, StatusBar } from "react-native";

// WASSLHA identity: violet + warm amber accent (deliberately different from other delivery apps).
export const C = {
  primary: "#6C47FF",
  primaryDark: "#5330E0",
  primarySoft: "#EFEBFF",
  accent: "#FFB020",
  accentSoft: "#FFF4D9",
  bg: "#F7F6FB",
  card: "#FFFFFF",
  ink: "#16122B",
  muted: "#6E6A85",
  line: "#E9E6F2",
  ok: "#0E9F6E",
  okSoft: "#E3F7EE",
  danger: "#D92D3B",
  dangerSoft: "#FDECEE",
};

export const TOP = Platform.OS === "android" ? (StatusBar.currentHeight ?? 28) : 44;
// Arabic content in an LTR layout: reverse rows so the first item sits on the right.
export const ROW = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);

const TILE_COLORS = ["#FFE8D6", "#E2EEFF", "#E6F6E0", "#F3E6FF", "#FFF1C2", "#FFE0E0"];
export const tileColor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return TILE_COLORS[hash % TILE_COLORS.length];
};
