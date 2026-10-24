import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";
import * as Location from "expo-location";
import { C, ROW, TOP } from "../theme";
import type { Address } from "../lib/types";
import { BERRECHID, reverseGeocode, searchPlaces } from "../lib/geo";
import type { Place } from "../lib/geo";
import { Button, Icon } from "./ui";

export type PickedPlace = { latitude: number; longitude: number; address_text: string };

/* ── address list sheet (same as before + "pick on map") ── */
export function AddressSheetV2({ visible, addresses, selected, onSelect, onLocate, onPickMap, onClose, busy }: {
  visible: boolean; addresses: Address[]; selected: string | null; onSelect: (id: string) => void;
  onLocate: () => void; onPickMap: () => void; onClose: () => void; busy: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <Text style={s.sheetTitle}>عنوان التوصيل</Text>
        <ScrollView style={{ maxHeight: 260 }}>
          {addresses.length === 0 ? <Text style={[s.sub, { textAlign: "center", marginVertical: 12 }]}>ما عندك حتى عنوان. اختار على الخريطة ولا استعمل موقعك الحالي.</Text> : null}
          {addresses.map((a) => (
            <Pressable key={a.id} onPress={() => { onSelect(a.id); onClose(); }} style={[s.addressRow, selected === a.id && s.addressRowOn]}>
              <Icon name="map-marker-outline" size={22} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.addressTitle}>{a.label || "العنوان"}</Text>
                <Text style={s.sub} numberOfLines={1}>{a.address_text}</Text>
              </View>
              <Icon name={selected === a.id ? "radiobox-marked" : "radiobox-blank"} size={20} color={selected === a.id ? C.primary : C.muted} />
            </Pressable>
          ))}
        </ScrollView>
        <Button title="🗺️ اختار على الخريطة" onPress={onPickMap} />
        <Button title={busy ? "..." : "📍 استعمل موقعي الحالي"} onPress={onLocate} disabled={busy} variant="soft" />
      </View>
    </Modal>
  );
}

/* ── full-screen map picker (Leaflet + OpenStreetMap inside a WebView, no API key) ── */
function mapHtml(lat: number, lon: number): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<style>html,body,#m{height:100%;margin:0;background:#eceff1}.pin{position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);font-size:40px;line-height:40px;z-index:1000;pointer-events:none}</style>
</head><body><div id="m"></div><div class="pin">📍</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script>
var map=L.map('m',{zoomControl:false}).setView([${lat},${lon}],17);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
function send(){var c=map.getCenter();window.ReactNativeWebView.postMessage(JSON.stringify({lat:c.lat,lon:c.lng}));}
map.on('moveend',send);
window.moveTo=function(a,b){map.setView([a,b],17);};
send();
</script></body></html>`;
}

export function MapPicker({ visible, initial, onClose, onConfirm }: {
  visible: boolean; initial: { latitude: number; longitude: number } | null; onClose: () => void; onConfirm: (p: PickedPlace) => Promise<void>;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {visible ? <Picker initial={initial ?? BERRECHID} onClose={onClose} onConfirm={onConfirm} /> : null}
    </Modal>
  );
}

function Picker({ initial, onClose, onConfirm }: {
  initial: { latitude: number; longitude: number }; onClose: () => void; onConfirm: (p: PickedPlace) => Promise<void>;
}) {
  const web = useRef<WebView>(null);
  const center = useRef({ latitude: initial.latitude, longitude: initial.longitude });
  const html = useMemo(() => mapHtml(initial.latitude, initial.longitude), [initial.latitude, initial.longitude]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);

  function goTo(latitude: number, longitude: number) {
    center.current = { latitude, longitude };
    web.current?.injectJavaScript(`window.moveTo(${latitude},${longitude});true;`);
  }
  function onMessage(e: WebViewMessageEvent) {
    try {
      const m = JSON.parse(e.nativeEvent.data) as { lat?: number; lon?: number };
      if (typeof m.lat === "number" && typeof m.lon === "number") center.current = { latitude: m.lat, longitude: m.lon };
    } catch { /* ignore */ }
  }
  async function doSearch() {
    Keyboard.dismiss();
    if (q.trim().length < 3) { Alert.alert("البحث", "كتب 3 حروف على الأقل."); return; }
    setSearching(true);
    try {
      const r = await searchPlaces(q);
      setResults(r);
      if (r.length === 0) Alert.alert("البحث", "ما لقينا والو. جرب اسم الحي أو الزنقة، ولا حرك الخريطة بيدك.");
    } catch { Alert.alert("البحث", "تعذر البحث دابا. حرك الخريطة بيدك."); } finally { setSearching(false); }
  }
  async function myLocation() {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") { Alert.alert("الموقع", "خاصك تسمح بالموقع."); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      goTo(pos.coords.latitude, pos.coords.longitude);
    } catch { Alert.alert("الموقع", "تعذر تحديد الموقع."); }
  }
  async function confirm() {
    setBusy(true);
    try {
      const { latitude, longitude } = center.current;
      let text = "";
      try { text = await reverseGeocode(latitude, longitude); } catch { /* fallback below */ }
      await onConfirm({ latitude, longitude, address_text: text || `موقع على الخريطة (${latitude.toFixed(4)}, ${longitude.toFixed(4)})` });
    } catch (e) {
      Alert.alert("العنوان", e instanceof Error ? e.message : "تعذر حفظ العنوان");
    } finally { setBusy(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={m.top}>
        <Pressable onPress={onClose} style={m.close}><Text style={m.closeText}>✕</Text></Pressable>
        <TextInput
          value={q} onChangeText={setQ} onSubmitEditing={() => void doSearch()} returnKeyType="search"
          placeholder="ابحث على الحي أو الزنقة..." placeholderTextColor={C.muted} style={m.input}
        />
        <Pressable onPress={() => void doSearch()} style={m.searchBtn}>
          {searching ? <ActivityIndicator color="#fff" /> : <Text style={m.searchText}>🔍</Text>}
        </Pressable>
      </View>
      {results.length > 0 ? (
        <ScrollView style={m.results} keyboardShouldPersistTaps="handled">
          {results.map((r, i) => (
            <Pressable key={`${r.latitude},${r.longitude},${i}`} style={m.result} onPress={() => { goTo(r.latitude, r.longitude); setResults([]); }}>
              <Text style={m.resultText} numberOfLines={2}>📍 {r.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <View style={{ flex: 1 }}>
        <WebView
          ref={web} originWhitelist={["*"]} javaScriptEnabled onMessage={onMessage}
          source={{ html, baseUrl: "https://wasslha-api.berrchidcity99.workers.dev" }} style={{ flex: 1 }}
        />
      </View>
      <View style={m.bottom}>
        <Text style={m.hint}>حرك الخريطة حتى يوقف الدبوس فبلاصة التوصيل</Text>
        <Button title="📍 موقعي الحالي" onPress={() => void myLocation()} variant="soft" />
        <Button title={busy ? "..." : "أكّد هاد العنوان"} onPress={() => void confirm()} disabled={busy} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sub: { color: C.muted, fontSize: 13, lineHeight: 19, textAlign: "right" },
  backdrop: { flex: 1, backgroundColor: "rgba(10,8,25,0.45)" },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 26 },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 12 },
  sheetTitle: { fontSize: 20, fontWeight: "900", color: C.ink, textAlign: "right", marginTop: 12 },
  addressRow: { flexDirection: ROW, alignItems: "center", gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, marginVertical: 5, backgroundColor: C.card },
  addressRowOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  addressTitle: { fontWeight: "900", color: C.ink, textAlign: "right" },
});

const m = StyleSheet.create({
  top: { flexDirection: ROW, alignItems: "center", gap: 8, paddingTop: TOP + 8, paddingHorizontal: 12, paddingBottom: 10, backgroundColor: C.bg },
  close: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 16, fontWeight: "900", color: C.ink },
  input: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: C.ink, textAlign: "right" },
  searchBtn: { width: 46, height: 42, borderRadius: 14, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  searchText: { fontSize: 18 },
  results: { maxHeight: 220, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.line },
  result: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  resultText: { color: C.ink, fontSize: 14, textAlign: "right" },
  bottom: { backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, borderTopWidth: 1, borderTopColor: C.line },
  hint: { color: C.muted, fontSize: 12, textAlign: "center", marginBottom: 4 },
});
