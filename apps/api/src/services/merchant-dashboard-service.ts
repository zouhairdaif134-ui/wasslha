import {databaseGet,type DatabaseEnv} from "../lib/database";
export interface MerchantDashboardEnv extends DatabaseEnv{}
export async function getMerchantDashboard(merchantId:string,env:MerchantDashboardEnv,token:string){
 const stores=await databaseGet<any[]>(`/rest/v1/stores?select=id,name,is_active,is_accepting_orders,address_text,latitude,longitude,created_at&merchant_id=eq.${encodeURIComponent(merchantId)}&order=created_at.desc`,env,token);
 if(stores.error)return {success:false,data:null,error:stores.error};
 const storeIds=(stores.data??[]).map(x=>x.id);
 const inFilter=storeIds.length?storeIds.join(","):"00000000-0000-0000-0000-000000000000";
 const products=await databaseGet<any[]>(`/rest/v1/products?select=id,store_id,name_ar,name_fr,price_minor,currency,stock_quantity,stock_unit,is_available,is_active,approval_status,rejection_reason,created_at,updated_at&store_id=in.(${inFilter})&order=created_at.desc`,env,token);
 const orders=await databaseGet<any[]>(`/rest/v1/sub_orders?select=id,master_order_id,store_id,sub_order_number,status,subtotal_minor,discount_minor,total_minor,created_at,updated_at&store_id=in.(${inFilter})&order=created_at.desc&limit=100`,env,token);
 const settlements=await databaseGet<any[]>(`/rest/v1/merchant_settlements?select=id,period_start,period_end,gross_amount_minor,commission_minor,refund_minor,adjustment_minor,net_amount_minor,status,paid_at,created_at&merchant_id=eq.${encodeURIComponent(merchantId)}&order=created_at.desc&limit=50`,env,token);
 return {success:!products.error&&!orders.error&&!settlements.error,data:{stores:stores.data??[],products:products.data??[],orders:orders.data??[],settlements:settlements.data??[]},error:products.error??orders.error??settlements.error};
}