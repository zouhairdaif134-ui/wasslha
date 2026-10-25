import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "wasslha:rider:vibrate";

export async function getVibrate(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(KEY)) !== "off"; } catch { return true; }
}

export async function setVibrate(on: boolean): Promise<void> {
  try { await AsyncStorage.setItem(KEY, on ? "on" : "off"); } catch { /* ignore */ }
}
