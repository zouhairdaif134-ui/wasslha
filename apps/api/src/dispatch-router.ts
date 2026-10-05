import { createRequestContext, isAuthenticated } from "./lib/request-context";
import { authorize } from "./lib/authorization";
import { PERMISSIONS } from "./lib/permissions";
import { errorResponse, successResponse } from "./lib/response";
import { databaseGet, type DatabaseEnv } from "./lib/database";
import { autoOfferDelivery, offerDelivery } from "./services/dispatch-service";
import type { ServiceAuthEnv } from "./lib/service-client";

function tokenOf(request: Request) { const value=request.headers.get("Authorization")??""; return value.startsWith("Bearer ")?value.slice(7):""; }
function fail(code:string,message:string,status:number,requestId:string){return errorResponse({code,message,status},requestId)}
function uuidLike(value:unknown){return typeof value==="string"&&/^[0-9a-f-]{36}$/i.test(value)}
interface DeliveryRow{id:string;master_order_id:string;status:string|null;pickup_address_text:string|null;delivery_address_text:string|null;delivery_latitude:number|null;delivery_longitude:number|null;created_at:string}
interface RiderRow{id:string;status:string|null;is_online:boolean;vehicle_type:string|null;vehicle_plate:string|null}
export async function routeDispatch(request:Request,env:unknown,requestId:string):Promise<Response|null>{
 const url=new URL(request.url),path=url.pathname.replace(/^\/api\/v1\/?/,"").split("/").filter(Boolean),method=request.method.toUpperCase();
 if(path[0]!=="admin"||path[1]!=="dispatch")return null;
 const context=await createRequestContext(request,env as Parameters<typeof createRequestContext>[1]);
 if(!isAuthenticated(context))return fail("UNAUTHORIZED",context.error??"Authentication required",401,requestId);
 const decision=authorize(context,PERMISSIONS.ADMIN_RIDERS_MANAGE);if(!decision.allowed)return fail("FORBIDDEN",decision.reason??"Permission denied",403,requestId);
 const token=tokenOf(request),db=env as DatabaseEnv&ServiceAuthEnv,adminId=context.user!.id;
 if(method==="GET"&&path[2]==="deliveries"){const result=await databaseGet<DeliveryRow[]>("/rest/v1/deliveries?select=id,master_order_id,status,pickup_address_text,delivery_address_text,delivery_latitude,delivery_longitude,created_at&status=eq.pending&order=created_at.asc&limit=100",db,token);if(result.error)return fail("DISPATCH_DELIVERIES_ERROR",result.error,502,requestId);return successResponse(result.data??[],{requestId})}
 if(method==="GET"&&path[2]==="riders"){const result=await databaseGet<RiderRow[]>("/rest/v1/riders?select=id,status,is_online,vehicle_type,vehicle_plate&status=eq.approved&is_online=eq.true&order=updated_at.desc&limit=100",db,token);if(result.error)return fail("DISPATCH_RIDERS_ERROR",result.error,502,requestId);return successResponse(result.data??[],{requestId})}
 if(method==="POST"&&path[2]==="auto-offer"){const body=await request.json().catch(()=>null) as Record<string,unknown>|null;if(!body||!uuidLike(body.delivery_id))return fail("VALIDATION_ERROR","delivery_id is required UUID",400,requestId);const result=await autoOfferDelivery(body.delivery_id as string,db);if(!result.success)return fail("DISPATCH_AUTO_OFFER_ERROR",result.error??"Unable to auto-dispatch",409,requestId);return successResponse(result.data,{requestId})}
 if(method==="POST"&&path[2]==="offer"){const body=await request.json().catch(()=>null) as Record<string,unknown>|null;if(!body||!uuidLike(body.delivery_id)||!uuidLike(body.rider_id))return fail("VALIDATION_ERROR","delivery_id and rider_id are required UUIDs",400,requestId);const result=await offerDelivery(body.delivery_id as string,body.rider_id as string,adminId,db);if(!result.success)return fail("DISPATCH_OFFER_ERROR",result.error??"Unable to offer delivery",409,requestId);return successResponse(result.data,{requestId})}
 return null;
}
