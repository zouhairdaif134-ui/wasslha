import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import type { Session } from "@supabase/supabase-js";
import { ACTIVE_DELIVERY_KEY, postLocation, startBackground, stopBackground } from "./tracking";
import type { Pos } from "./types";

export type Gps = "off" | "starting" | "live";

// While the rider is online: keeps the on-screen position fresh and makes sure the backend receives it
// (background task when permitted, otherwise foreground updates) plus a 30 s heartbeat, because dispatch
// ignores riders whose last position is older than 2 minutes.
export function useLiveLocation(session: Session, online: boolean, deliveryId: string | null) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [gps, setGps] = useState<Gps>("off");
  const tokenRef = useRef(session.access_token);
  tokenRef.current = session.access_token;

  useEffect(() => {
    let dead = false;
    let sub: Location.LocationSubscription | undefined;
    let beat: ReturnType<typeof setInterval> | undefined;
    const last: { c: Location.LocationObjectCoords | null } = { c: null };
    (async () => {
      await AsyncStorage.setItem(ACTIVE_DELIVERY_KEY, deliveryId ?? "");
      if (!online) { setGps("off"); await stopBackground(); return; }
      setGps("starting");
      const fg = await Location.requestForegroundPermissionsAsync();
      if (dead || fg.status !== "granted") { setGps("off"); return; }
      const background = await startBackground();
      if (dead) return;
      const watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 0, timeInterval: 8000 },
        (p) => {
          last.c = p.coords;
          setPos({ latitude: p.coords.latitude, longitude: p.coords.longitude });
          setGps("live");
          if (!background) void postLocation(tokenRef.current, deliveryId, p.coords);
        }
      );
      if (dead) { watcher.remove(); return; }
      sub = watcher;
      beat = setInterval(() => { if (last.c) void postLocation(tokenRef.current, deliveryId, last.c); }, 30000);
    })();
    return () => { dead = true; sub?.remove(); if (beat) clearInterval(beat); };
  }, [online, deliveryId]);

  return { pos, gps };
}
