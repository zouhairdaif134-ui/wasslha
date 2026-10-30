import {createClient,type Session} from "@supabase/supabase-js";
const url=import.meta.env.VITE_SUPABASE_URL as string|undefined;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined;
export const supabase=url&&key?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export async function signIn(email:string,password:string){if(!supabase)return {error:"Supabase is not configured."};const r=await supabase.auth.signInWithPassword({email,password});return {session:r.data.session,error:r.error?.message??null};}
// Phone + SMS code login: the same account the mobile apps use (the test merchant is a phone account without email).
export function toPhone(raw:string){const d=raw.replace(/[^\d+]/g,"");if(d.startsWith("+"))return d;if(d.startsWith("00"))return "+"+d.slice(2);if(d.startsWith("0"))return "+212"+d.slice(1);if(d.startsWith("212"))return "+"+d;return "+212"+d;}
export async function sendCode(phone:string){if(!supabase)return {error:"Supabase is not configured."};const r=await supabase.auth.signInWithOtp({phone:toPhone(phone)});return {error:r.error?.message??null};}
export async function verifyCode(phone:string,token:string){if(!supabase)return {session:null,error:"Supabase is not configured."};const r=await supabase.auth.verifyOtp({phone:toPhone(phone),token:token.trim(),type:"sms"});return {session:r.data.session,error:r.error?.message??null};}
export async function signOut(){await supabase?.auth.signOut();}
export async function session():Promise<Session|null>{if(!supabase)return null;return (await supabase.auth.getSession()).data.session;}
