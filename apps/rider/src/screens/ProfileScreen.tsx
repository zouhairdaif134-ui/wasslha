import { useEffect, useState } from "react";
import { Linking, StyleSheet, Switch, Text, Vibration, View } from "react-native";
import * as Location from "expo-location";
import type { Session } from "@supabase/supabase-js";
import { C, ROW } from "../theme";
import type { Rider } from "../lib/types";
import { getVibrate, setVibrate } from "../lib/prefs";
import { Button, Card, Chip, Page, Row, Title } from "../components/ui";

export function ProfileScreen({ session, rider, gps, onSignOut }: { session: Session; rider: Rider | null; gps: string; onSignOut: () => void }) {
  const approved = rider?.status === "approved";
  const [perm, setPerm] = useState("...");
  const [vib, setVib] = useState(true);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const fg = await Location.getForegroundPermissionsAsync();
        const bg = await Location.getBackgroundPermissionsAsync();
        if (!dead) setPerm(fg.status !== "granted" ? "مرفوض" : bg.status === "granted" ? "مسموح دائما ✓" : "فقط أثناء الاستعمال");
      } catch { if (!dead) setPerm("غير معروف"); }
      const v = await getVibrate();
      if (!dead) setVib(v);
    })();
    return () => { dead = true; };
  }, []);

  return (
    <Page>
      <Title text="حسابي" />
      <Card>
        <Row>
          <Text style={s.value}>{session.user.phone ? `+${session.user.phone.replace(/^\+/, "")}` : "—"}</Text>
          <Chip text={approved ? "حساب معتمد" : rider?.status ?? "—"} tone={approved ? "ok" : "warn"} />
        </Row>
        <View style={s.line}><Text style={s.label}>المركبة</Text><Text style={s.value}>{rider?.vehicle_type ?? "—"}{rider?.vehicle_plate ? ` · ${rider.vehicle_plate}` : ""}</Text></View>
        <View style={s.line}><Text style={s.label}>GPS</Text><Text style={s.value}>{gps === "live" ? "مباشر" : gps === "starting" ? "كيبدا..." : "متوقف (فعّل Online)"}</Text></View>
        <View style={s.line}><Text style={s.label}>النسخة</Text><Text style={s.value}>WASSLHA Rider 0.2.1</Text></View>
      </Card>

      <Title text="الإعدادات" />
      <Card>
        <View style={s.line}><Text style={s.label}>إذن الموقع</Text><Text style={s.value}>{perm}</Text></View>
        <Text style={s.note}>باش يخدم التتبع حتى فاش التطبيق مسدود، خاص الإذن يكون «دائما».</Text>
        <Button title="فتح إعدادات التطبيق" variant="soft" onPress={() => void Linking.openSettings()} />
        <View style={{ height: 1, backgroundColor: C.line }} />
        <View style={{ flexDirection: ROW, alignItems: "center", justifyContent: "space-between" }}>
          <Switch value={vib} onValueChange={(v) => { setVib(v); void setVibrate(v); }} trackColor={{ false: C.line, true: C.accent }} thumbColor="#fff" />
          <Text style={s.value}>اهتزاز ملي يوصل عرض جديد</Text>
        </View>
        <Button title="جرب الاهتزاز" variant="soft" onPress={() => Vibration.vibrate([0, 400, 200, 400])} />
      </Card>

      <Button title="تسجيل الخروج" variant="dark" onPress={onSignOut} />
    </Page>
  );
}

const s = StyleSheet.create({
  line: { gap: 2 },
  label: { color: C.muted, fontSize: 12, fontWeight: "800", textAlign: "right" },
  value: { color: C.ink, fontSize: 15, fontWeight: "700", textAlign: "right" },
  note: { color: C.muted, fontSize: 12, lineHeight: 18, textAlign: "right" },
});
