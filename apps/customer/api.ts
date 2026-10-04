import type { Session } from "@supabase/supabase-js";

const base=(process.env.EXPO_PUBLIC_API_BASE_URL??"").replace(/\/$/,"");
async function api<T>(session:Session,path:string,options:RequestInit={}):Promise<T>{const r=await fetch(base+"/api/v1/"+path,{...options,headers:{Accept:"application/json",Authorization:"Bearer "+session.access_token,...(options.body?{"Content-Type":"application/json"}:{}),...(options.headers??{})}});const p=await r.json() as {success?:boolean;data?:T;error?:{message?:string}};if(!r.ok||!p.success)throw new Error(p.error?.message??"API request failed");return p.data as T;}
export type Address={id:string;label:string|null;address_text:string;apartment:string|null;floor:string|null;landmark:string|null;delivery_note:string|null;latitude:number;longitude:number;is_default:boolean;is_active:boolean};
export type OrderInput={delivery_address_id:string;payment_method:"cod"|"online";items:Array<{product_id:string;quantity:number;variant_id?:string}>;notes?:string};
export const getAddresses=(s:Session)=>api<Address[]>(s,"customer/me/addresses");
export const createAddress=(s:Session,input:Omit<Address,"id"|"is_active">)=>api<Address>(s,"customer/me/addresses",{method:"POST",body:JSON.stringify(input)});
export const updateAddress=(s:Session,id:string,input:Partial<Address>)=>api<Address>(s,"customer/me/addresses/"+id,{method:"PATCH",body:JSON.stringify(input)});
export const deleteAddress=(s:Session,id:string)=>api<{deleted:boolean}>(s,"customer/me/addresses/"+id,{method:"DELETE"});
export const createOrder=(s:Session,input:OrderInput,idempotencyKey:string)=>api<unknown>(s,"orders",{method:"POST",headers:{"Idempotency-Key":idempotencyKey},body:JSON.stringify(input)});
export const getOrders=(s:Session)=>api<unknown[]>(s,"orders");
