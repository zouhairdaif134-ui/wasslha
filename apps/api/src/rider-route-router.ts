import { createRequestContext, isAuthenticated } from "./lib/request-context";
import { authorize } from "./lib/authorization";
import { PERMISSIONS } from "./lib/permissions";
import { errorResponse, successResponse } from "./lib/response";
import { databaseGet, type DatabaseEnv } from "./lib/database";
import { calculateRoute, type MapsServiceEnv } from "./services/maps-service";

function tokenOf(request: Request): string { const value=request.headers.get("Authorization")??""; return value.startsWith("Bearer ")?value.slice(7):""; }
function fail(code:string,message:string,status:number,requestId:string){return errorResponse({code,message,status},requestId)}
function uuidLike(value:string){return /^[0-9a-f-]{36}$/i.test(value)}
interface AssignmentRow{delivery_id:string;status:string|null}
interface DeliveryRow{id:string;status:string|null;pickup_latitude:number|string|null;pickup_longitude:number|string|null;delivery_latitude:number|string|null;delivery_longitude:number|string|null}
interface LocationRow{latitude:number|string;longitude:number|string;recorded_at:string}

export async function routeRiderRoute(request:Request,env:unknown,requestId:string):Promise<Response|null>{
 const url=new URL(request.url),path=url.pathname.replace(/^\/api\/v1\/?/,"").split("/").filter(Boolean);
 if(path[0]!=="rider"||path[1]!=="me"||path[2]!=="deliveries"||path[4]!=="route")return null;
 if(request.method.toUpperCase()!=="GET")return fail("METHOD_NOT_ALLOWED","Method not allowed",405,requestId);
 const context=await createRequestContext(request,env as Parameters<typeof createRequestContext>[1]);
 if(!isAuthenticated(context))return fail("UNAUTHORIZED",context.error??"Authentication required",401,requestId);
 const decision=authorize(context,PERMISSIONS.RIDER_DELIVERIES_READ);if(!decision.allowed)return fail("FORBIDDEN",decision.reason??"Permission denied",403,requestId);
 const deliveryId=path[3];if(!deliveryId||!uuidLike(deliveryId))return fail("VALIDATION_ERROR","Invalid delivery id",400,requestId);
 const token=tokenOf(request),dbEnv=env as DatabaseEnv,riderId=context.user!.id;
 const assignment=await databaseGet<AssignmentRow[]>(`/rest/v1/delivery_assignments?delivery_id=eq.${deliveryId}&rider_id=eq.${riderId}&status=eq.accepted&select=delivery_id,status&limit=1`,dbEnv,token);
 if(assignment.error)return fail("RIDER_ROUTE_ERROR",assignment.error,502,requestId);if(!assignment.data?.length)return fail("DELIVERY_NOT_OWNED","Delivery is not assigned to this rider",403,requestId);
 const delivery=await databaseGet<DeliveryRow[]>(`/rest/v1/deliveries?id=eq.${deliveryId}&select=id,status,pickup_latitude,pickup_longitude,delivery_latitude,delivery_longitude&limit=1`,dbEnv,token);
 if(delivery.error)return fail("RIDER_ROUTE_ERROR",delivery.error,502,requestId);const row=delivery.data?.[0];if(!row)return fail("DELIVERY_NOT_FOUND","Delivery not found",404,requestId);
 const location=await databaseGet<LocationRow[]>(`/rest/v1/rider_locations?rider_id=eq.${riderId}&delivery_id=eq.${deliveryId}&select=latitude,longitude,recorded_at&order=recorded_at.desc&limit=1`,dbEnv,token);
 if(location.error)return fail("RIDER_ROUTE_ERROR",location.error,502,requestId);const current=location.data?.[0];if(!current)return fail("GPS_LOCATION_REQUIRED","A recent rider location is required",409,requestId);
 const pickedUp=["picked_up","in_transit"].includes(row.status??"");const destination=pickedUp?{latitude:Number(row.delivery_latitude),longitude:Number(row.delivery_longitude)}:{latitude:Number(row.pickup_latitude),longitude:Number(row.pickup_longitude)};
 if(!Number.isFinite(destination.latitude)||!Number.isFinite(destination.longitude))return fail("ROUTE_DESTINATION_UNAVAILABLE","Route destination coordinates are unavailable",409,requestId);
 const route=await calculateRoute({latitude:Number(current.latitude),longitude:Number(current.longitude)},destination,env as MapsServiceEnv);
 if(!route.success||!route.data)return fail("MAPS_ROUTE_ERROR",route.error??"Unable to calculate route",502,requestId);
 return successResponse({delivery_id:deliveryId,phase:pickedUp?"delivery":"pickup",origin:{latitude:Number(current.latitude),longitude:Number(current.longitude),recorded_at:current.recorded_at},destination,distance_meters:route.data.distance_meters,duration_seconds:route.data.duration_seconds,polyline:route.data.polyline??null},{requestId});
}
