import { serviceGet, type ServiceAuthEnv } from "../lib/service-client";
import { databaseGet, type DatabaseEnv } from "../lib/database";
import { calculateRoute } from "./maps-service";
type Env=ServiceAuthEnv & DatabaseEnv & { GOOGLE_MAPS_API_KEY?:string };
type Item={product_id:string;quantity:number};
type ProductRow={id:string;store_id:string;price_minor:number;is_active:boolean;is_available:boolean;approval_status:string;stock_quantity:number;stores:{id:string;latitude:number|null;longitude:number|null;is_active:boolean;is_accepting_orders:boolean;merchants:{status:string}}};
type AddressRow={id:string;latitude:number;longitude:number};
type SettingRow={setting_key:string;setting_value:unknown};
const num=(v:unknown,d:number)=>{const n=typeof v==="number"?v:Number(typeof v==="string"?v:JSON.stringify(v));return Number.isFinite(n)?n:d};
export interface Quote {subtotal_minor:number;delivery_fee_minor:number;service_fee_minor:number;discount_minor:number;tip_minor:number;total_minor:number;distance_meters:number;eta_seconds:number;currency:"MAD";route_count:number}
export async function quoteOrder(customerId:string,addressId:string,items:Item[],env:Env,accessToken:string):Promise<{success:boolean;data:Quote|null;error:string|null}>{
 const address=await databaseGet<AddressRow[]>("/rest/v1/addresses?select=id,latitude,longitude&id=eq."+encodeURIComponent(addressId)+"&user_id=eq."+encodeURIComponent(customerId)+"&is_active=eq.true&limit=1",env,accessToken);
 if(address.error)return{success:false,data:null,error:address.error}; const a=address.data?.[0]; if(!a)return{success:false,data:null,error:"DELIVERY_ADDRESS_NOT_FOUND"};
 const ids=[...new Set(items.map(x=>x.product_id))]; const productQuery=ids.map(encodeURIComponent).join(",");
 const products=await serviceGet<ProductRow[]>("/rest/v1/products?select=id,store_id,price_minor,is_active,is_available,approval_status,stock_quantity,stores!inner(id,latitude,longitude,is_active,is_accepting_orders,merchants!inner(status))&id=in.("+productQuery+")",env);
 if(products.error)return{success:false,data:null,error:products.error}; const rows=products.data??[]; if(rows.length!==ids.length)return{success:false,data:null,error:"PRODUCT_NOT_AVAILABLE"};
 const byId=new Map(rows.map(x=>[x.id,x])); let subtotal=0;
 for(const item of items){const p=byId.get(item.product_id);if(!p||!p.is_active||!p.is_available||p.approval_status!=="approved"||p.stock_quantity<item.quantity||!p.stores.is_active||!p.stores.is_accepting_orders||p.stores.merchants.status!=="approved")return{success:false,data:null,error:"ORDER_NOT_AVAILABLE"};subtotal+=Math.round(p.price_minor*item.quantity);}
 const settings=await serviceGet<SettingRow[]>("/rest/v1/admin_settings?select=setting_key,setting_value&setting_key=in.(marketplace.delivery_fee_base_minor,marketplace.delivery_fee_included_km,marketplace.delivery_fee_per_km_minor,marketplace.delivery_fee_max_minor,marketplace.service_fee_bps,marketplace.service_fee_min_minor,marketplace.service_fee_max_minor)",env);
 if(settings.error)return{success:false,data:null,error:settings.error}; const cfg=new Map((settings.data??[]).map(x=>[x.setting_key,num(x.setting_value,0)]));
 const base=cfg.get("marketplace.delivery_fee_base_minor")??1500,included=cfg.get("marketplace.delivery_fee_included_km")??2,perKm=cfg.get("marketplace.delivery_fee_per_km_minor")??300,maxFee=cfg.get("marketplace.delivery_fee_max_minor")??4000,bps=cfg.get("marketplace.service_fee_bps")??250,minService=cfg.get("marketplace.service_fee_min_minor")??200,maxService=cfg.get("marketplace.service_fee_max_minor")??2000;
 const stores=[...new Map(rows.map(x=>[x.store_id,x.stores])).values()]; let distance=0,eta=0,routeCount=0;
 for(const store of stores){if(store.latitude==null||store.longitude==null)continue;const route=await calculateRoute({latitude:store.latitude,longitude:store.longitude},{latitude:a.latitude,longitude:a.longitude},env);if(route.success&&route.data){distance+=route.data.distance_meters;eta+=route.data.duration_seconds;routeCount++;}}
 const km=distance/1000; const deliveryFee=Math.min(maxFee,Math.max(0,base+Math.max(0,Math.ceil(km-included))*perKm)); const serviceFee=Math.min(maxService,Math.max(minService,Math.round(subtotal*bps/10000)));
 return{success:true,data:{subtotal_minor:subtotal,delivery_fee_minor:deliveryFee,service_fee_minor:serviceFee,discount_minor:0,tip_minor:0,total_minor:subtotal+deliveryFee+serviceFee,distance_meters:Math.round(distance),eta_seconds:Math.round(eta),currency:"MAD",route_count:routeCount},error:null};
}