import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, StyleSheet, Text, Vibration, View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { api, list } from "./lib/http";
import { friendlyError } from "./lib/errors";
import { FINISHED } from "./lib/format";
import { stopBackground } from "./lib/tracking";
import { useLiveLocation } from "./lib/useLiveLocation";
import type { Assignment, Cash, Delivery, DeliveryStatus, Earnings, Performance, Rider, Slot, Tab, Wallet } from "./lib/types";
import { C, TOP } from "./theme";
import { TabBar } from "./components/TabBar";
import { HomeScreen } from "./screens/HomeScreen";
import { OrdersScreen } from "./screens/OrdersScreen";
import { SlotsScreen } from "./screens/SlotsScreen";
import { EarningsScreen } from "./screens/EarningsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";

// A failed request must not wipe what is already on screen: resolve to undefined and keep the previous data.
function ok<T>(p: Promise<T>): Promise<T | undefined> {
  return p.catch(() => undefined);
}

// Pickup address/coordinates and the customer note are not in the API payload; they live on the same
// `deliveries` rows the API reads, so the rider reads them with his own token (RLS applies).
async function enrich(rows: Delivery[]): Promise<Delivery[]> {
  if (rows.length === 0) return rows;
  try {
    const { data } = await supabase
      .from("deliveries")
      .select("id,pickup_address_text,pickup_latitude,pickup_longitude,customer_note")
      .in("id", rows.map((r) => r.id));
    const extra = new Map<string, Partial<Delivery>>();
    for (const x of (data ?? []) as Array<Partial<Delivery> & { id: string }>) extra.set(x.id, x);
    return rows.map((r) => ({ ...r, ...(extra.get(r.id) ?? {}) }));
  } catch {
    return rows;
  }
}

export function RiderApp({ session }: { session: Session }) {
  const [rider, setRider] = useState<Rider | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [earnings, setEarnings] = useState<Earnings>(null);
  const [wallet, setWallet] = useState<Wallet>(null);
  const [cash, setCash] = useState<Cash>(null);
  const [perf, setPerf] = useState<Performance[]>([]);
  const [tab, setTab] = useState<Tab>("home");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [slotBusy, setSlotBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const seenOffers = useRef<Set<string> | null>(null);

  const deliveryMap = useMemo(() => new Map(deliveries.map((d) => [d.id, d])), [deliveries]);
  const unfinished = (a: Assignment) => !FINISHED.includes(deliveryMap.get(a.delivery_id)?.status ?? "");
  const accepted = assignments.find((a) => a.status === "accepted" && unfinished(a));
  const active = accepted ? deliveryMap.get(accepted.delivery_id) ?? null : null;
  const offers = assignments.filter((a) => a.status === "offered" && unfinished(a)).map((a) => ({ a, d: deliveryMap.get(a.delivery_id) }));
  const online = !!rider?.is_online;
  const { pos, gps } = useLiveLocation(session, online, active?.id ?? null);

  function notify(text: string) {
    setToast(text);
    setTimeout(() => setToast(""), 2800);
  }

  const load = useCallback(async (mode: "initial" | "poll" | "manual" = "poll") => {
    if (mode === "initial") setLoading(true);
    if (mode === "manual") setRefreshing(true);
    const s = sessionRef.current;
    const [rid, asg, del, slt, ear, wal, per, csh, att] = await Promise.all([
      ok(api<Rider | null>("rider/me", s)),
      ok(api<unknown>("rider/me/assignments", s)),
      ok(api<unknown>("rider/me/deliveries", s)),
      ok(api<unknown>("rider-slots", s)),
      ok(api<Earnings>("rider/me/earnings", s)),
      ok(api<Wallet>("rider/me/wallet", s)),
      ok(api<unknown>("rider/me/performance", s)),
      ok(api<Cash>("rider/me/cash", s)),
      ok(Promise.resolve(supabase.from("slot_attendance").select("slot_id,status").eq("rider_id", s.user.id))),
    ]);
    if (rid !== undefined) setRider(rid);
    if (asg !== undefined) {
      const rows = list<Assignment>(asg);
      setAssignments(rows);
      const offeredNow = rows.filter((x) => x.status === "offered").map((x) => x.id);
      const seen = seenOffers.current;
      if (seen && offeredNow.some((id) => !seen.has(id))) {
        Vibration.vibrate([0, 500, 250, 500]);
        notify("عرض جديد! 🛵");
      }
      seenOffers.current = new Set(offeredNow);
    }
    if (del !== undefined) setDeliveries(await enrich(list<Delivery>(del)));
    if (slt !== undefined) setSlots(list<Slot>(slt));
    if (att?.data) {
      const rows = att.data as Array<{ slot_id: string; status: string }>;
      setMine(new Set(rows.filter((x) => x.status !== "cancelled").map((x) => x.slot_id)));
    }
    if (ear !== undefined) setEarnings(ear);
    if (wal !== undefined) setWallet(wal);
    if (per !== undefined) setPerf(list<Performance>(per));
    if (csh !== undefined) setCash(csh);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { void load("initial"); }, [load]);
  useEffect(() => {
    const t = setInterval(() => void load("poll"), online || active ? 8000 : 30000);
    return () => clearInterval(t);
  }, [load, online, active?.id]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => { if (st === "active") void load("poll"); });
    return () => sub.remove();
  }, [load]);

  /* ── actions ── */
  async function setOnline(value: boolean) {
    setRider((r) => (r ? { ...r, is_online: value } : r));
    try {
      await api("rider/me/online", session, { method: "POST", body: JSON.stringify({ is_online: value }) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("ACTIVE_SLOT_REQUIRED")) {
        Alert.alert("خاصك Slot فالوقت الحالي", friendlyError(msg, ""), [
          { text: "إلغاء", style: "cancel" },
          { text: "حجز وقت", onPress: () => setTab("slots") },
        ]);
      } else {
        Alert.alert("WASSLHA", friendlyError(msg, "تعذر تغيير الحالة"));
      }
    }
    await load("poll");
  }

  function respond(id: string, status: "accepted" | "rejected") {
    const run = async () => {
      setBusy(id);
      try {
        await api(`rider/me/assignments/${id}/respond`, session, { method: "POST", body: JSON.stringify({ status }) });
        notify(status === "accepted" ? "قبلتي الطلب ✓" : "تم الرفض");
      } catch (e) {
        Alert.alert("WASSLHA", e instanceof Error ? e.message : "تعذر الرد");
      } finally {
        await load("poll");
        setBusy(null);
      }
    };
    if (status === "rejected") {
      Alert.alert("رفض العرض؟", "غادي يمشي لسائق آخر. الرفض بزاف كيأثر على التقييم ديالك.", [
        { text: "رجع", style: "cancel" },
        { text: "رفض", style: "destructive", onPress: () => void run() },
      ]);
    } else {
      void run();
    }
  }

  async function transition(status: DeliveryStatus, reason?: string) {
    if (!active) return;
    setBusy(active.id);
    try {
      await api(`rider/me/deliveries/${active.id}/status`, session, { method: "POST", body: JSON.stringify({ status, reason }) });
      if (status === "delivered") notify("برافو! تسلّم الطلب ✓");
    } catch (e) {
      Alert.alert("WASSLHA", e instanceof Error ? e.message : "تعذر تحديث التوصيلة");
    } finally {
      await load("poll");
      setBusy(null);
    }
  }

  async function slotCall(key: string, run: () => Promise<void>, success: string): Promise<boolean> {
    setSlotBusy(key);
    try {
      await run();
      notify(success);
      return true;
    } catch (e) {
      Alert.alert("Slots", friendlyError(e instanceof Error ? e.message : "", "تعذر تنفيذ العملية"));
      return false;
    } finally {
      await load("poll");
      setSlotBusy(null);
    }
  }
  const bookSlot = (id: string) =>
    void slotCall(id, async () => { await api(`rider-slots/${id}/book`, session, { method: "POST" }); }, "تحجز الوقت ✓");
  const joinWaitlist = (id: string) =>
    void slotCall(id, async () => { await api(`rider-slots/${id}/waitlist`, session, { method: "POST" }); }, "تسجلتي فلائحة الانتظار ✓");
  // One tap: create my own slot for the chosen day/time, then book it (a created slot is not booked automatically).
  const quickBook = (f: { slot_date: string; start_time: string; end_time: string }) =>
    slotCall("quick", async () => {
      const slot = await api<Slot>("rider-slots", session, { method: "POST", body: JSON.stringify({ ...f, capacity: 1 }) });
      await api(`rider-slots/${slot.id}/book`, session, { method: "POST" });
    }, "تحجز الوقت ديالك ✓");

  async function signOut() {
    try { await api("rider/me/online", session, { method: "POST", body: JSON.stringify({ is_online: false }) }); } catch { /* offline anyway */ }
    await stopBackground();
    await supabase.auth.signOut();
  }

  /* ── render ── */
  if (loading) {
    return <View style={st.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }
  const refresh = () => void load("manual");
  const history = assignments.map((a) => ({ a, d: deliveryMap.get(a.delivery_id) }));

  let body;
  switch (tab) {
    case "orders":
      body = <OrdersScreen rows={history} refreshing={refreshing} onRefresh={refresh} />;
      break;
    case "slots":
      body = <SlotsScreen slots={slots} mine={mine} busyKey={slotBusy} refreshing={refreshing} onRefresh={refresh} onBook={bookSlot} onWaitlist={joinWaitlist} onQuickBook={quickBook} />;
      break;
    case "earnings":
      body = <EarningsScreen wallet={wallet} cash={cash} earnings={earnings} perf={perf[0] ?? null} refreshing={refreshing} onRefresh={refresh} />;
      break;
    case "profile":
      body = <ProfileScreen session={session} rider={rider} gps={gps} onSignOut={() => void signOut()} />;
      break;
    default:
      body = (
        <HomeScreen
          rider={rider} online={online} onToggle={(v) => void setOnline(v)} gps={gps} pos={pos} active={active} offers={offers}
          cash={cash} earnings={earnings} delivered={deliveries.filter((d) => d.status === "delivered").length}
          busyId={busy} refreshing={refreshing} onRefresh={refresh} onOpenSlots={() => setTab("slots")}
          onRespond={respond} onStatus={(s, r) => void transition(s, r)}
        />
      );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1 }}>{body}</View>
      <TabBar active={tab} badge={active ? 0 : offers.length} onChange={setTab} />
      {toast ? <View style={st.toast}><Text style={st.toastText}>{toast}</Text></View> : null}
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  toast: { position: "absolute", top: TOP + 10, left: 16, right: 16, backgroundColor: C.ink, borderRadius: 16, padding: 14 },
  toastText: { color: "#fff", fontWeight: "800", textAlign: "center" },
});
