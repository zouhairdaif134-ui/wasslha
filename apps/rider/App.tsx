import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const apiBase = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } });

type Rider = { id: string; status?: string|null; vehicle_type?: string|null; vehicle_plate?: string|null; is_online?: boolean };
type Assignment = { id: string; delivery_id: string; rider_id: string; status?: string|null; offered_at?: string };
type Delivery = { id: string; master_order_id: string; delivery_address_text: string; status?: string|null; eta_seconds?: number|null };
type Slot = { id: string; slot_date: string; start_time: string; end_time: string; capacity: number; status: string };

async function api<T>(session: Session, path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(apiBase + "/api/v1/" + path, { ...options, headers: { Accept: "application/json", Authorization: "Bearer " + session.access_token, ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers ?? {}) } });
  const payload = await response.json() as { success?: boolean; data?: T; error?: { message?: string } };
  if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "API request failed.");
  return payload.data as T;
}

function Button({title,onPress,disabled=false}:{title:string;onPress:()=>void;disabled?:boolean}) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.button,disabled&&styles.disabled]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}

function Login({onSession}:{onSession:(s:Session)=>void}) {
  const[email,setEmail]=useState(""); const[password,setPassword]=useState(""); const[busy,setBusy]=useState(false); const[error,setError]=useState("");
  async function submit(){setBusy(true);setError("");const r=await supabase.auth.signInWithPassword({email:email.trim(),password});if(r.error)setError(r.error.message);else if(r.data.session)onSession(r.data.session);setBusy(false);}
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.login}><Text style={styles.logo}>W</Text><Text style={styles.kicker}>WASSLHA RIDER</Text><Text style={styles.title}>تطبيق السائق</Text><Text style={styles.muted}>الدخول إلى الحساب المعتمد لإدارة التوصيلات.</Text><TextInput autoCapitalize="none" keyboardType="email-address" placeholder="البريد الإلكتروني" value={email} onChangeText={setEmail} style={styles.input}/><TextInput secureTextEntry placeholder="كلمة المرور" value={password} onChangeText={setPassword} style={styles.input}/>{error?<Text style={styles.error}>{error}</Text>:null}<Button title={busy?"جارِ الدخول...":"دخول"} onPress={submit} disabled={busy||!email||!password}/></ScrollView></SafeAreaView>;
}

function App() {
  const[session,setSession]=useState<Session|null>(null); const[ready,setReady]=useState(false);
  useEffect(()=>{let mounted=true;(async()=>{if(!supabaseUrl||!supabaseAnonKey){setReady(true);return}const r=await supabase.auth.getSession();if(mounted){setSession(r.data.session);setReady(true)}})();const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>{mounted=false;subscription.unsubscribe()}},[]);
  if(!ready)return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator/></View></SafeAreaView>;
  if(!supabaseUrl||!supabaseAnonKey||!apiBase)return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.error}>Configuration EXPO_PUBLIC_SUPABASE_* / EXPO_PUBLIC_API_BASE_URL ناقصة.</Text></View></SafeAreaView>;
  return session?<RiderHome session={session}/>:<Login onSession={setSession}/>;
}

function RiderHome({session}:{session:Session}) {
  const[rider,setRider]=useState<Rider|null>(null); const[assignments,setAssignments]=useState<Assignment[]>([]); const[deliveries,setDeliveries]=useState<Delivery[]>([]); const[slots,setSlots]=useState<Slot[]>([]); const[tab,setTab]=useState<"home"|"assignments"|"slots">("home"); const[loading,setLoading]=useState(true);
  async function load(){setLoading(true);try{const[a,b,c,d]=await Promise.all([api<Rider>(session,"rider/me"),api<Assignment[]>(session,"rider/me/assignments"),api<Delivery[]>(session,"rider/me/deliveries"),api<Slot[]>(session,"rider-slots")]);setRider(a);setAssignments(b);setDeliveries(c);setSlots(d)}catch(e){Alert.alert("WASSLHA",e instanceof Error?e.message:"تعذر تحميل البيانات.")}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);
  async function toggleOnline(value:boolean){try{setRider(await api<Rider>(session,"rider/me/online",{method:"POST",body:JSON.stringify({is_online:value})}))}catch(e){Alert.alert("WASSLHA",e instanceof Error?e.message:"تعذر تغيير الحالة.")}}
  async function respond(id:string,status:"accepted"|"rejected"){try{await api(session,"rider/me/assignments/"+id+"/respond",{method:"POST",body:JSON.stringify({status})});await load()}catch(e){Alert.alert("WASSLHA",e instanceof Error?e.message:"تعذر الرد على العرض.")}}
  async function join(slotId:string){try{await api(session,"rider-slots/"+slotId+"/waitlist",{method:"POST"});Alert.alert("تم","تم تسجيلك في قائمة الانتظار.");await load()}catch(e){Alert.alert("WASSLHA",e instanceof Error?e.message:"تعذر الانضمام.")}}
  const deliveryById=new Map(deliveries.map(d=>[d.id,d]));
  return <SafeAreaView style={styles.safe}><View style={styles.header}><View><Text style={styles.kicker}>WASSLHA RIDER</Text><Text style={styles.headerTitle}>لوحة السائق</Text></View><Button title="تحديث" onPress={()=>void load()} disabled={loading}/></View>{loading?<View style={styles.center}><ActivityIndicator/></View>:<><View style={styles.card}><View style={styles.row}><View><Text style={styles.cardTitle}>{rider?.status==="approved"?"سائق معتمد":"حالة الحساب"}</Text><Text style={styles.muted}>{rider?.status??"unknown"}</Text></View><View style={styles.row}><Text style={styles.muted}>{rider?.is_online?"متصل":"غير متصل"}</Text><Switch value={!!rider?.is_online} onValueChange={toggleOnline}/></View></View></View>{tab==="home"&&<ScrollView contentContainerStyle={styles.content}><View style={styles.stats}><View style={styles.stat}><Text style={styles.statValue}>{assignments.filter(x=>x.status==="offered").length}</Text><Text style={styles.muted}>عروض جديدة</Text></View><View style={styles.stat}><Text style={styles.statValue}>{deliveries.length}</Text><Text style={styles.muted}>توصيلات</Text></View><View style={styles.stat}><Text style={styles.statValue}>{slots.length}</Text><Text style={styles.muted}>مواعيد مفتوحة</Text></View></View><Text style={styles.section}>آخر العروض</Text>{assignments.slice(0,3).map(a=><AssignmentCard key={a.id} assignment={a} delivery={deliveryById.get(a.delivery_id)} onRespond={respond}/>)}</ScrollView>}{tab==="assignments"&&<FlatList contentContainerStyle={styles.content} data={assignments} keyExtractor={x=>x.id} renderItem={({item})=><AssignmentCard assignment={item} delivery={deliveryById.get(item.delivery_id)} onRespond={respond}/>} ListEmptyComponent={<Text style={styles.muted}>لا توجد عروض حالياً.</Text>}/>} {tab==="slots"&&<FlatList contentContainerStyle={styles.content} data={slots} keyExtractor={x=>x.id} renderItem={({item})=><View style={styles.card}><Text style={styles.cardTitle}>{item.slot_date}</Text><Text style={styles.muted}>{item.start_time} → {item.end_time} · السعة {item.capacity}</Text><Button title="الانضمام لقائمة الانتظار" onPress={()=>void join(item.id)}/></View>} ListEmptyComponent={<Text style={styles.muted}>لا توجد مواعيد مفتوحة.</Text>}/>}<View style={styles.tabs}><Pressable onPress={()=>setTab("home")}><Text style={tab==="home"?styles.tabActive:styles.tab}>الرئيسية</Text></Pressable><Pressable onPress={()=>setTab("assignments")}><Text style={tab==="assignments"?styles.tabActive:styles.tab}>العروض</Text></Pressable><Pressable onPress={()=>setTab("slots")}><Text style={tab==="slots"?styles.tabActive:styles.tab}>المواعيد</Text></Pressable><Pressable onPress={()=>void supabase.auth.signOut()}><Text style={styles.tab}>خروج</Text></Pressable></View></>}</SafeAreaView>;
}

function AssignmentCard({assignment,delivery,onRespond}:{assignment:Assignment;delivery?:Delivery;onRespond:(id:string,status:"accepted"|"rejected")=>Promise<void>}) {
  return <View style={styles.card}><Text style={styles.cardTitle}>عرض توصيل</Text><Text style={styles.muted}>Delivery: {assignment.delivery_id}</Text>{delivery?<><Text style={styles.address}>{delivery.delivery_address_text}</Text><Text style={styles.muted}>الحالة: {delivery.status??"—"}{delivery.eta_seconds?(" · ETA "+Math.round(delivery.eta_seconds/60)+" د"):""}</Text></>:null}<Text style={styles.badge}>{assignment.status??"unknown"}</Text>{assignment.status==="offered"?<View style={styles.row}><Button title="قبول" onPress={()=>void onRespond(assignment.id,"accepted")}/><Button title="رفض" onPress={()=>void onRespond(assignment.id,"rejected")}/></View>:null}</View>;
}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#f5f7fa"},login:{flexGrow:1,justifyContent:"center",padding:24},center:{flex:1,alignItems:"center",justifyContent:"center",padding:24},logo:{width:54,height:54,borderRadius:16,backgroundColor:"#101827",color:"#fff",textAlign:"center",textAlignVertical:"center",fontSize:28,fontWeight:"900",marginBottom:14},kicker:{fontSize:11,fontWeight:"800",letterSpacing:1.5,color:"#64748b"},title:{fontSize:30,fontWeight:"800",color:"#172033",marginVertical:8},headerTitle:{fontSize:24,fontWeight:"800",color:"#172033",marginTop:4},muted:{color:"#64748b",lineHeight:20},input:{backgroundColor:"#fff",borderWidth:1,borderColor:"#d7dee8",borderRadius:12,padding:13,marginTop:12},button:{backgroundColor:"#172033",borderRadius:10,paddingVertical:11,paddingHorizontal:15,marginTop:12,alignSelf:"flex-start"},buttonText:{color:"#fff",fontWeight:"800"},disabled:{opacity:.45},error:{color:"#9f1239",backgroundColor:"#fff1f2",padding:12,borderRadius:10,marginTop:12},header:{padding:18,paddingTop:24,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},content:{padding:18,paddingBottom:100},card:{backgroundColor:"#fff",borderWidth:1,borderColor:"#e5eaf0",borderRadius:16,padding:16,marginBottom:12},cardTitle:{fontSize:16,fontWeight:"800",color:"#172033",marginBottom:6},row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},stats:{flexDirection:"row",gap:10,marginBottom:20},stat:{flex:1,backgroundColor:"#fff",borderWidth:1,borderColor:"#e5eaf0",borderRadius:14,padding:14},statValue:{fontSize:24,fontWeight:"900",color:"#172033"},section:{fontSize:18,fontWeight:"800",color:"#172033",marginBottom:12},address:{fontSize:15,fontWeight:"700",color:"#172033",marginTop:8},badge:{alignSelf:"flex-start",marginTop:10,paddingVertical:4,paddingHorizontal:8,borderRadius:99,backgroundColor:"#eef2f7",fontSize:11,fontWeight:"800"},tabs:{position:"absolute",bottom:0,left:0,right:0,backgroundColor:"#fff",borderTopWidth:1,borderTopColor:"#e5eaf0",padding:12,flexDirection:"row",justifyContent:"space-around"},tab:{color:"#64748b",fontWeight:"700"},tabActive:{color:"#172033",fontWeight:"900"}
});
export default App;
