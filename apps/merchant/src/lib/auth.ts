import {createClient,type Session} from "@supabase/supabase-js";
const url=import.meta.env.VITE_SUPABASE_URL as string|undefined;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined;
export const supabase=url&&key?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export async function signIn(email:string,password:string){if(!supabase)return {error:"Supabase is not configured."};const r=await supabase.auth.signInWithPassword({email,password});return {session:r.data.session,error:r.error?.message??null};}
export async function signOut(){await supabase?.auth.signOut();}
export async function session():Promise<Session|null>{if(!supabase)return null;return (await supabase.auth.getSession()).data.session;}
