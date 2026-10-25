import { I18nManager, Platform, StatusBar } from "react-native";

// WASSLHA identity: yellow + red + white (same palette as the customer app).
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
