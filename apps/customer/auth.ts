import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url=process.env.EXPO_PUBLIC_SUPABASE_URL??"";
const key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY??"";
export const supabase=createClient(url,key,{auth:{storage:AsyncStorage,autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
export async function requestOtp(phone:string){return supabase.auth.signInWithOtp({phone,options:{shouldCreateUser:true}});}
export async function verifyOtp(phone:string,token:string){return supabase.auth.verifyOtp({phone,token,type:"sms"});}
export async function signOut(){return supabase.auth.signOut();}
