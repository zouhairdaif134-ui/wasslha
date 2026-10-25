import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import "./src/lib/tracking"; // registers the background location task at startup
import { supabase, supabaseConfigured } from "./src/lib/supabase";
import { API } from "./src/lib/http";
import { C } from "./src/theme";
import { AuthScreen } from "./src/screens/AuthScreen";
import { RiderApp } from "./src/RiderApp";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!supabaseConfigured || !API) { setReady(true); return; }
      const r = await supabase.auth.getSession();
      if (mounted) { setSession(r.data.session); setReady(true); }
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {!ready ? (
        <View style={st.center}><ActivityIndicator color={C.primary} size="large" /></View>
      ) : !supabaseConfigured || !API ? (
        <View style={st.center}><Text style={{ color: C.danger }}>خص إعداد Supabase و API URL.</Text></View>
      ) : session ? (
        <RiderApp session={session} />
      ) : (
        <AuthScreen onDone={setSession} />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
