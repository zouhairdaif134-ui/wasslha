import { databaseGet,type DatabaseEnv } from "../lib/database";
export interface MarketplaceServiceEnv extends DatabaseEnv {}
export interface MarketplaceProduct{id:string;store_id:string;category_id?:string|null;name_ar:string;name_fr:string;description_ar?:string|null;description_fr?:string|null;sku?:string|null;price_minor:number;compare_at_price_minor?:number|null;currency:"MAD";stock_quantity:number;stock_unit:string;is_available:boolean;is_active:boolean;approval_status:string;created_at:string;updated_at:string}
export interface MarketplaceServiceResult<T>{success:boolean;data:T|null;error:string|null}
export async function getMarketplaceProducts(env:MarketplaceServiceEnv,token?:string,options:{categoryId?:string;search?:string;limit?:number;offset?:number}={}):Promise<MarketplaceServiceResult<MarketplaceProduct[]>>{
 const limit=Number.isInteger(options.limit)&&options.limit!>0&&options.limit!<=100?options.limit!:20,offset=Number.isInteger(options.offset)&&options.offset!>=0?options.offset!:0;
 const q=new URLSearchParams({select:"*",is_active:"eq.true",is_available:"eq.true",approval_status:"eq.approved",order:"created_at.desc",limit:String(limit),offset:String(offset)});
 if(options.categoryId)q.set("category_id",`eq.${options.categoryId}`);
 if(options.search?.trim()){const term=options.search.trim().replace(/[(),]/g," ");q.set("or",`(name_ar.ilike.*${term}*,name_fr.ilike.*${term}*)`);}
 const r=await databaseGet<MarketplaceProduct[]>(`/rest/v1/products?${q.toString()}`,env,token);
 return {success:!r.error,data:r.data??[],error:r.error};
}
export async function getMarketplaceProduct(id:string,env:MarketplaceServiceEnv,token?:string):Promise<MarketplaceServiceResult<MarketplaceProduct|null>>{
 const r=await databaseGet<MarketplaceProduct[]>(`/rest/v1/products?select=*&id=eq.${encodeURIComponent(id)}&is_active=eq.true&is_available=eq.true&approval_status=eq.approved&limit=1`,env,token);
 return {success:!r.error,data:r.data?.[0]??null,error:r.error};
}
