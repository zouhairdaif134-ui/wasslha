import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

// Offers last 120 s and are only visible inside the app, so a rider with the app closed would never see them.
// A local notification (no Firebase / push server needed) with sound + heads-up banner fixes that.
export const OFFER_CHANNEL = "wasslha-offers";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelReady = false;
export async function ensureOfferChannel(): Promise<void> {
  if (Platform.OS !== "android" || channelReady) return;
  try {
    await Notifications.setNotificationChannelAsync(OFFER_CHANNEL, {
      name: "عروض التوصيل",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      sound: "default",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    channelReady = true;
  } catch { /* retried on the next call */ }
}

export async function notificationsAllowed(): Promise<boolean> {
  try {
    const p = await Notifications.getPermissionsAsync();
    return p.granted;
  } catch {
    return false;
  }
}

// Android 13+ shows the system permission dialog here (the channel must exist first).
export async function requestNotifications(): Promise<boolean> {
  try {
    await ensureOfferChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const next = await Notifications.requestPermissionsAsync();
    return next.granted;
  } catch {
    return false;
  }
}

export async function notifyNewOffer(count: number): Promise<void> {
  try {
    await ensureOfferChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "عرض توصيل جديد 🛵",
        body: count > 1 ? `${count} عروض كتسناك، عندك دقيقتين` : "عندك دقيقتين باش تقبل",
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 250, 500],
      },
      trigger: { channelId: OFFER_CHANNEL },
    });
  } catch { /* notifications blocked: the in-app alert still works */ }
}
