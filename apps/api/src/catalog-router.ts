import { errorResponse, successResponse } from "./lib/response";
import { databaseGet, type DatabaseEnv } from "./lib/database";

interface CatalogEnv extends DatabaseEnv {}
type StoreRow={id:string;merchant_id:string;name:string;description?:string|null;address_text?:string|null;latitude?:number|null;longitude?:number|null;is_active:boolean;is_accepting_orders:boolean;created_at?:string};
type ReviewRow={merchant_id:string;rating:number};
type ProductRow={id:string;store_id:string;category_id?:string|null;name_ar:string;name_fr:string;description_ar?:string|null;description_fr?:string|null;price_minor:number;compare_at_price_minor?:number|null;currency:string;stock_unit:string;is_available:boolean;created_at?:string};
type VariantRow={id:string;product_id:string;name_ar:string;name_fr:string;price_minor:number;stock_quantity:number;is_available:boolean;is_active:boolean};

function fail(code:string,message:string,status:number,requestId:string){return errorResponse({code,message,status},requestId)}
function intParam(value:string|null,fallback:number,max:number){const n=Number(value);return Number.isInteger(n)&&n>=0?Math.min(n,max):fallback}
function cleanSearch(value:string|null){return (value??"").trim().replace(/[^\p{L}\p{N}\s-]/gu,"").slice(0,80)}
function coordinate(value:string|null){const n=Number(value);return Number.isFinite(n)?n:null}
function haversineKm(aLat:number,aLon:number,bLat:number,bLon:number){const r=6371,dLat=(bLat-aLat)*Math.PI/180,dLon=(bLon-aLon)*Math.PI/180;const x=Math.sin(dLat/2)**2+Math.cos(aLat*Math.PI/180)*Math.cos(bLat*Math.PI/180)*Math.sin(dLon/2)**2;return r*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function ageScore(createdAt?:string){if(!createdAt)return 0;const parsed=Date.parse(createdAt);if(!Number.isFinite(parsed))return 0;const ageDays=Math.max(0,(Date.now()-parsed)/86400000);return Math.max(0,1-Math.min(ageDays,90)/90)}
function storeScore(store:StoreRow,rating:number,distanceKm:number|null){const availability=store.is_accepting_orders?1:0;const proximity=distanceKm==null?0.5:Math.max(0,1-Math.min(distanceKm,15)/15);const freshness=ageScore(store.created_at);return availability*0.35+proximity*0.35+(rating/5)*0.20+freshness*0.10}

async function merchantRatings(db:CatalogEnv,token:string,merchantIds:string[]){
  if(!merchantIds.length)return new Map<string,number>();
  const ids=[...new Set(merchantIds)].filter(x=>/^[0-9a-f-]{36}$/i.test(x));
  if(!ids.length)return new Map<string,number>();
  const r=await databaseGet<ReviewRow[]>(`/rest/v1/reviews?select=merchant_id,rating&is_published=eq.true&merchant_id=in.(${ids.join(",")})&limit=1000`,db,token);
  if(r.error)return new Map<string,number>();
  const acc=new Map<string,{sum:number;count:number}>();
  for(const row of r.data??[]){const x=acc.get(row.merchant_id)??{sum:0,count:0};x.sum+=Number(row.rating);x.count++;acc.set(row.merchant_id,x)}
  return new Map([...acc.entries()].map(([id,x])=>[id,x.count?x.sum/x.count:0]));
}

export async function routeCatalog(request:Request,env:unknown,requestId:string):Promise<Response|null>{
  if(request.method.toUpperCase()!=="GET")return null;
  const u=new URL(request.url),path=u.pathname.replace(/^\/api\/v1\/?/,"").split("/").filter(Boolean);
  const token=request.headers.get("Authorization")?.replace(/^Bearer\s+/i,"")??"";
  if(path[0]!=="catalog")return null;
  const limit=intParam(u.searchParams.get("limit"),20,50),offset=intParam(u.searchParams.get("offset"),0,10000);
  const db=env as CatalogEnv;
  const lat=coordinate(u.searchParams.get("lat")),lon=coordinate(u.searchParams.get("lon"));
  const sort=u.searchParams.get("sort")??"recommended";

  if(path[1]==="stores"){
    const r=await databaseGet<StoreRow[]>(`/rest/v1/stores?select=id,merchant_id,name,description,address_text,latitude,longitude,is_active,is_accepting_orders,created_at&is_active=eq.true&order=created_at.desc&limit=200`,db,token);
    if(r.error)return fail("CATALOG_STORES_ERROR",r.error,502,requestId);
    const rows=r.data??[];
    const ratings=await merchantRatings(db,token,rows.map(x=>x.merchant_id));
    const ranked=rows.map(store=>{const rating=ratings.get(store.merchant_id)??0;const distanceKm=lat!=null&&lon!=null&&store.latitude!=null&&store.longitude!=null?haversineKm(lat,lon,Number(store.latitude),Number(store.longitude)):null;return {...store,rating:Math.round(rating*10)/10,distance_meters:distanceKm==null?null:Math.round(distanceKm*1000),ranking_score:storeScore(store,rating,distanceKm)}});
    ranked.sort((a,b)=>sort==="distance"?((a.distance_meters??Number.MAX_SAFE_INTEGER)-(b.distance_meters??Number.MAX_SAFE_INTEGER)):sort==="rating"?(b.rating-a.rating):(sort==="newest"?Date.parse(b.created_at??"")-Date.parse(a.created_at??""):b.ranking_score-a.ranking_score));
    return successResponse(ranked.slice(offset,offset+limit),{requestId});
  }

  if(path[1]==="products"){
    const q=cleanSearch(u.searchParams.get("q")),storeId=u.searchParams.get("store_id"),categoryId=u.searchParams.get("category_id");
    const filters=["is_active=eq.true","approval_status=eq.approved","is_available=eq.true"];
    if(storeId&&/^[0-9a-f-]{36}$/i.test(storeId))filters.push(`store_id=eq.${storeId}`);
    if(categoryId&&/^[0-9a-f-]{36}$/i.test(categoryId))filters.push(`category_id=eq.${categoryId}`);
    if(q){const encoded=encodeURIComponent(`*${q}*`);filters.push(`or=(name_ar.ilike.${encoded},name_fr.ilike.${encoded})`)}
    const r=await databaseGet<ProductRow[]>(`/rest/v1/products?select=id,store_id,category_id,name_ar,name_fr,description_ar,description_fr,price_minor,compare_at_price_minor,currency,stock_unit,is_available,created_at&${filters.join("&")}&order=created_at.desc&limit=200`,db,token);
    if(r.error)return fail("CATALOG_PRODUCTS_ERROR",r.error,502,requestId);
    const productIds=[...new Set((r.data??[]).map(x=>x.id))];
    const variantMap=new Map<string,VariantRow[]>();
    if(productIds.length){const vr=await databaseGet<VariantRow[]>(`/rest/v1/product_variants?select=id,product_id,name_ar,name_fr,price_minor,stock_quantity,is_available,is_active&product_id=in.(${productIds.join(",")})&is_active=eq.true&is_available=eq.true&order=created_at.asc&limit=1000`,db,token);if(vr.error)return fail("CATALOG_VARIANTS_ERROR",vr.error,502,requestId);for(const v of vr.data??[]){const list=variantMap.get(v.product_id)??[];list.push(v);variantMap.set(v.product_id,list)}}
    const storeIds=[...new Set((r.data??[]).map(x=>x.store_id))];
    let stores:StoreRow[]=[];
    if(storeIds.length){const sr=await databaseGet<StoreRow[]>(`/rest/v1/stores?select=id,merchant_id,name,is_accepting_orders,latitude,longitude,created_at&id=in.(${storeIds.join(",")})&is_active=eq.true&limit=200`,db,token);if(sr.error)return fail("CATALOG_STORE_RANKING_ERROR",sr.error,502,requestId);stores=sr.data??[]}
    const storeMap=new Map(stores.map(x=>[x.id,x]));
    const ratings=await merchantRatings(db,token,stores.map(x=>x.merchant_id));
    const ranked=(r.data??[]).map(product=>{const store=storeMap.get(product.store_id);const rating=store?ratings.get(store.merchant_id)??0:0;const distanceKm=lat!=null&&lon!=null&&store?.latitude!=null&&store?.longitude!=null?haversineKm(lat,lon,Number(store.latitude),Number(store.longitude)):null;const match=q?((product.name_ar+" "+product.name_fr+" "+(product.description_ar??"")+" "+(product.description_fr??"")).toLocaleLowerCase().includes(q.toLocaleLowerCase())?1:0):0;const score=match*0.25+(store?.is_accepting_orders?0.2:0)+((rating/5)*0.2)+(distanceKm==null?0.1:Math.max(0,1-Math.min(distanceKm,15)/15)*0.35);return {...product,variants:variantMap.get(product.id)??[],store_name:store?.name??null,rating:Math.round(rating*10)/10,distance_meters:distanceKm==null?null:Math.round(distanceKm*1000),ranking_score:score}});
    ranked.sort((a,b)=>sort==="distance"?((a.distance_meters??Number.MAX_SAFE_INTEGER)-(b.distance_meters??Number.MAX_SAFE_INTEGER)):sort==="rating"?(b.rating-a.rating):(sort==="newest"?Date.parse(b.created_at??"")-Date.parse(a.created_at??""):b.ranking_score-a.ranking_score));
    return successResponse(ranked.slice(offset,offset+limit),{requestId});
  }
  return fail("NOT_FOUND","Catalog route not found",404,requestId);
}
