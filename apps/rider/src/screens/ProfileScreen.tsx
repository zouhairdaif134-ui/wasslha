import { StyleSheet, Text, View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { C } from "../theme";
import type { Rider } from "../lib/types";
import { Button, Card, Chip, Page, Row, Title } from "../components/ui";

export function ProfileScreen({ session, rider, gps, onSignOut }: { session: Session; rider: Rider | null; gps: string; onSignOut: () => void }) {
  const approved = rider?.status === "approved";
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
        <View style={s.line}><Text style={s.label}>النسخة</Text><Text style={s.value}>WASSLHA Rider 0.2.0</Text></View>
      </Card>
      <Button title="تسجيل الخروج" variant="soft" onPress={onSignOut} />
    </Page>
  );
}

const s = StyleSheet.create({
  line: { gap: 2 },
  label: { color: C.muted, fontSize: 12, fontWeight: "800", textAlign: "right" },
  value: { color: C.ink, fontSize: 15, fontWeight: "700", textAlign: "right" },
});
