import { errorResponse, successResponse } from "./lib/response";
import { databaseGet, type DatabaseEnv } from "./lib/database";

interface CatalogEnv extends DatabaseEnv {}
function fail(code:string,message:string,status:number,requestId:string){return errorResponse({code,message,status},requestId)}
function intParam(value:string|null,fallback:number,max:number){const n=Number(value);return Number.isInteger(n)&&n>=0?Math.min(n,max):fallback}
function cleanSearch(value:string|null){return (value??"").trim().replace(/[^\p{L}\p{N}\s-]/gu,"").slice(0,80)}

export async function routeCatalog(request:Request,env:unknown,requestId:string):Promise<Response|null>{
  if(request.method.toUpperCase()!=="GET")return null;
  const u=new URL(request.url),path=u.pathname.replace(/^\/api\/v1\/?/,"").split("/").filter(Boolean);
  const token=request.headers.get("Authorization")?.replace(/^Bearer\s+/i,"")??"";
  if(path[0]!=="catalog")return null;
  const limit=intParam(u.searchParams.get("limit"),20,50),offset=intParam(u.searchParams.get("offset"),0,10000);
  const db=env as CatalogEnv;

  if(path[1]==="stores"){
    const r=await databaseGet<unknown[]>(`/rest/v1/stores?select=id,name,description,address_text,latitude,longitude,is_active,is_accepting_orders&is_active=eq.true&order=created_at.desc&limit=${limit}&offset=${offset}`,db,token);
    if(r.error)return fail("CATALOG_STORES_ERROR",r.error,502,requestId);
    return successResponse(r.data??[],{requestId});
  }

  if(path[1]==="products"){
    const q=cleanSearch(u.searchParams.get("q")),storeId=u.searchParams.get("store_id"),categoryId=u.searchParams.get("category_id");
    const filters=["is_active=eq.true","approval_status=eq.approved","is_available=eq.true"];
    if(storeId&&/^[0-9a-f-]{36}$/i.test(storeId))filters.push(`store_id=eq.${storeId}`);
    if(categoryId&&/^[0-9a-f-]{36}$/i.test(categoryId))filters.push(`category_id=eq.${categoryId}`);
    if(q){const encoded=encodeURIComponent(`*${q}*`);filters.push(`or=(name_ar.ilike.${encoded},name_fr.ilike.${encoded})`)}
    const r=await databaseGet<unknown[]>(`/rest/v1/products?select=id,store_id,category_id,name_ar,name_fr,description_ar,description_fr,price_minor,compare_at_price_minor,currency,stock_unit,is_available&${filters.join("&")}&order=created_at.desc&limit=${limit}&offset=${offset}`,db,token);
    if(r.error)return fail("CATALOG_PRODUCTS_ERROR",r.error,502,requestId);
    return successResponse(r.data??[],{requestId});
  }
  return fail("NOT_FOUND","Catalog route not found",404,requestId);
}
