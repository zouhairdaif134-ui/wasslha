import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { supabase } from "./supabase";
import { API } from "./http";

export const LOCATION_TASK = "wasslha-rider-live-location";
export const ACTIVE_DELIVERY_KEY = "wasslha:rider:active-delivery";

// The API rejects the whole payload when one optional field is out of range (e.g. speed -1), so sanitize first.
const clean = (v: number | null | undefined, min: number, max: number) =>
  v != null && Number.isFinite(v) && v >= min && v <= max ? v : null;

export async function postLocation(token: string, deliveryId: string | null, c: Location.LocationObjectCoords) {
  if (!API) return;
  try {
    await fetch(`${API}/api/v1/rider/me/location`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        delivery_id: deliveryId,
        latitude: c.latitude,
        longitude: c.longitude,
        accuracy_meters: clean(c.accuracy, 0, 10000),
        speed_mps: clean(c.speed, 0, 100),
        heading: clean(c.heading, 0, 360),
      }),
    });
  } catch { /* offline: the next update retries */ }
}

// Runs even when the app is closed (Android foreground service) once background permission is granted.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return;
  const deliveryId = await AsyncStorage.getItem(ACTIVE_DELIVERY_KEY);
  await postLocation(s.session.access_token, deliveryId || null, data.locations[data.locations.length - 1].coords);
});

export async function startBackground(): Promise<boolean> {
  try {
    const perm = await Location.requestBackgroundPermissionsAsync();
    if (perm.status !== "granted") return false;
    if (!(await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK))) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        // distanceInterval 0 = time based. Dispatch only offers orders to riders whose last position is < 2 min old,
        // so a rider standing still must keep reporting too.
        distanceInterval: 0,
        timeInterval: 10000,
        showsBackgroundLocationIndicator: true,
        foregroundService: { notificationTitle: "WASSLHA Rider", notificationBody: "الموقع خدام أثناء الخدمة", notificationColor: "#E53935" },
      });
    }
    return true;
  } catch {
    return false;
  }
}

export async function stopBackground() {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  } catch { /* already stopped */ }
}
