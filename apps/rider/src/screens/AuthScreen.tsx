import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { toPhone } from "../lib/format";
import { C, TOP } from "../theme";
import { Button } from "../components/ui";

// Same phone + SMS code login as the customer app (riders are created by the admin with their phone).
export function AuthScreen({ onDone }: { onDone: (session: Session) => void }) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendCode() {
    setBusy(true);
    const r = await supabase.auth.signInWithOtp({ phone: toPhone(phone) });
    setError(r.error?.message ?? "");
    if (!r.error) setSent(true);
    setBusy(false);
  }
  async function verify() {
    setBusy(true);
    const r = await supabase.auth.verifyOtp({ phone: toPhone(phone), token: code.trim(), type: "sms" });
    setError(r.error?.message ?? "");
    if (r.data.session) onDone(r.data.session);
    setBusy(false);
  }

  return (
    <View style={a.root}>
      <View style={a.hero}>
        <View style={a.logo}><Text style={a.logoText}>W</Text></View>
        <Text style={a.brand}>WASSLHA</Text>
        <Text style={a.tagline}>تطبيق السائق · خدم فبرشيد وربح</Text>
      </View>
      <View style={[a.card, { paddingBottom: 30 + insets.bottom }]}>
        <Text style={a.title}>{sent ? "دخل الكود" : "مرحبا بالسائق 🛵"}</Text>
        <Text style={a.hint}>{sent ? "صيفطنا ليك كود على التيليفون" : "دخل رقم تيليفونك المسجّل كسائق"}</Text>
        <TextInput
          keyboardType={sent ? "number-pad" : "phone-pad"}
          placeholder={sent ? "• • • • • •" : "06 00 00 00 00"}
          placeholderTextColor={C.muted}
          value={sent ? code : phone}
          onChangeText={sent ? setCode : setPhone}
          maxLength={sent ? 6 : 14}
          style={a.input}
        />
        {error ? <Text style={a.error}>{error}</Text> : null}
        <Button
          title={busy ? "..." : sent ? "تأكيد" : "إرسال الكود"}
          onPress={() => void (sent ? verify() : sendCode())}
          disabled={busy || (sent ? code.length < 4 : phone.replace(/\s/g, "").length < 9)}
        />
        {sent ? <Text style={a.link} onPress={() => { setSent(false); setCode(""); setError(""); }}>بدل الرقم</Text> : null}
      </View>
    </View>
  );
}

const a = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.primary, paddingTop: TOP },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  logo: { width: 88, height: 88, borderRadius: 28, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 46, fontWeight: "900", color: C.primary },
  brand: { color: "#fff", fontSize: 28, fontWeight: "900", marginTop: 14, letterSpacing: 2 },
  tagline: { color: "#FFE0DE", marginTop: 6, textAlign: "center" },
  card: { backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24 },
  title: { fontSize: 24, fontWeight: "900", color: C.ink, textAlign: "right" },
  hint: { color: C.muted, marginTop: 4, marginBottom: 10, textAlign: "right" },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, color: C.ink, textAlign: "center", letterSpacing: 2, marginVertical: 8 },
  error: { color: C.danger, marginBottom: 6, textAlign: "right" },
  link: { color: C.primary, fontWeight: "800", textAlign: "center", paddingVertical: 12 },
});
