import AsyncStorage from "@react-native-async-storage/async-storage";

const VIBRATE_KEY = "wasslha:rider:vibrate";
const NOTIFIED_KEY = "wasslha:rider:notified-offers";

export async function getVibrate(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(VIBRATE_KEY)) !== "off"; } catch { return true; }
}

export async function setVibrate(on: boolean): Promise<void> {
  try { await AsyncStorage.setItem(VIBRATE_KEY, on ? "on" : "off"); } catch { /* ignore */ }
}

// Offer ids the rider was already alerted about (by the app or by the background notification),
// so the same offer never rings twice.
export async function getNotified(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFIED_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export async function markNotified(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const known = await getNotified();
    for (const id of ids) known.add(id);
    await AsyncStorage.setItem(NOTIFIED_KEY, JSON.stringify([...known].slice(-50)));
  } catch { /* ignore */ }
}
