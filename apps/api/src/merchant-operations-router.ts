import { createRequestContext, isAuthenticated } from "./lib/request-context";
import { authorize } from "./lib/authorization";
import { PERMISSIONS } from "./lib/permissions";
import { errorResponse, successResponse } from "./lib/response";
import { getMerchantByOwner } from "./services/merchant-service";
import { getStore, updateStore } from "./services/store-service";

function tokenOf(request: Request): string {
  const value = request.headers.get("Authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}
function fail(code:string,message:string,status:number,requestId:string){return errorResponse({code,message,status},requestId);}
function uuidLike(value:string){return /^[0-9a-f-]{36}$/i.test(value);}
function validHours(value:unknown){
  if(!value || typeof value!=="object" || Array.isArray(value)) return false;
  const days=["mon","tue","wed","thu","fri","sat","sun"];
  for(const day of Object.keys(value as Record<string,unknown>)){
    if(!days.includes(day)) return false;
    const row=(value as Record<string,unknown>)[day];
    if(row===null) continue;
    if(!row || typeof row!=="object" || Array.isArray(row)) return false;
    const r=row as Record<string,unknown>;
    if(typeof r.open!=="string"||typeof r.close!=="string"||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(r.open)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(r.close)) return false;
  }
  return true;
}

export async function routeMerchantOperations(request:Request,env:unknown,requestId:string):Promise<Response|null>{
  const url=new URL(request.url),path=url.pathname.replace(/^\/api\/v1\/?/,"").split("/").filter(Boolean),method=request.method.toUpperCase();
  if(path[0]!=="stores"||path[2]!=="operations"||path.length!==3)return null;
  const context=await createRequestContext(request,env as Parameters<typeof createRequestContext>[1]);
  if(!isAuthenticated(context))return fail("UNAUTHORIZED",context.error??"Authentication required",401,requestId);
  const denied=authorize(context,PERMISSIONS.MERCHANT_STORES_MANAGE);if(!denied.allowed)return fail("FORBIDDEN",denied.reason??"Permission denied",403,requestId);
  const storeId=path[1];if(!uuidLike(storeId))return fail("VALIDATION_ERROR","Invalid store id",400,requestId);
  const token=tokenOf(request),uid=context.user!.id,merchant=await getMerchantByOwner(uid,env as any,token);if(!merchant.data)return fail("MERCHANT_NOT_FOUND","Merchant account not found",404,requestId);
  const store=await getStore(storeId,env as any,token);if(!store.data||store.data.merchant_id!==merchant.data.id)return fail("NOT_FOUND","Store not found",404,requestId);
  if(method==="GET")return successResponse({opening_hours:store.data.opening_hours??{},orders_paused:store.data.orders_paused??false,orders_pause_reason:store.data.orders_pause_reason??null,is_accepting_orders:store.data.is_accepting_orders},{requestId});
  if(method!=="PATCH")return fail("METHOD_NOT_ALLOWED","Method not allowed",405,requestId);
  let body:Record<string,unknown>;try{const value=await request.json();if(!value||typeof value!=="object"||Array.isArray(value))throw new Error();body=value as Record<string,unknown>}catch{return fail("VALIDATION_ERROR","Invalid JSON body",400,requestId)}
  const updates:Record<string,unknown>={};
  if(body.opening_hours!==undefined){if(!validHours(body.opening_hours))return fail("VALIDATION_ERROR","opening_hours must contain valid mon-sun HH:MM ranges",400,requestId);updates.opening_hours=body.opening_hours;}
  if(body.orders_paused!==undefined){if(typeof body.orders_paused!=="boolean")return fail("VALIDATION_ERROR","orders_paused must be boolean",400,requestId);updates.orders_paused=body.orders_paused;updates.is_accepting_orders=body.orders_paused?false:(typeof body.is_accepting_orders==="boolean"?body.is_accepting_orders:true);}
  else if(body.is_accepting_orders!==undefined){if(typeof body.is_accepting_orders!=="boolean")return fail("VALIDATION_ERROR","is_accepting_orders must be boolean",400,requestId);updates.is_accepting_orders=body.is_accepting_orders;}
  if(body.orders_pause_reason!==undefined){if(body.orders_pause_reason!==null&&(typeof body.orders_pause_reason!=="string"||body.orders_pause_reason.trim().length>300))return fail("VALIDATION_ERROR","Invalid orders_pause_reason",400,requestId);updates.orders_pause_reason=body.orders_pause_reason===null?null:String(body.orders_pause_reason).trim()||null;}
  if(Object.keys(updates).length===0)return fail("VALIDATION_ERROR","No operational changes supplied",400,requestId);
  if(updates.orders_paused===true && updates.orders_pause_reason===undefined)updates.orders_pause_reason=store.data.orders_pause_reason??"Paused by merchant";
  if(updates.orders_paused===false)updates.orders_pause_reason=null;
  return successResponse(await updateStore(storeId,merchant.data.id,env as any,token,updates as any),{requestId});
}
