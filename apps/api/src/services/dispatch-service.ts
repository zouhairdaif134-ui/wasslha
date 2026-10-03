import { serviceGet,servicePost,servicePatch,type ServiceAuthEnv } from "../lib/service-client";
export interface DispatchEnv extends ServiceAuthEnv {}
export interface DispatchResult<T>{success:boolean;data:T|null;error:string|null}
export async function offerDelivery(deliveryId:string,riderId:string,assignedBy:string,env:DispatchEnv):Promise<DispatchResult<unknown>>{
 const d=await serviceGet<Array<{id:string;status:string}>>(`/rest/v1/deliveries?select=id,status&id=eq.${encodeURIComponent(deliveryId)}&limit=1`,env);
 if(d.error||!d.data?.[0])return {success:false,data:null,error:d.error??"Delivery not found"};
 if(d.data[0].status!=="pending")return {success:false,data:null,error:"Delivery is not available for dispatch"};
 const rider=await serviceGet<Array<{id:string;status:string;is_online:boolean}>>(`/rest/v1/riders?select=id,status,is_online&id=eq.${encodeURIComponent(riderId)}&limit=1`,env);
 if(rider.error||!rider.data?.[0])return {success:false,data:null,error:rider.error??"Rider not found"};
 if(rider.data[0].status!=="approved"||!rider.data[0].is_online)return {success:false,data:null,error:"Rider is not eligible for dispatch"};
 const a=await servicePost("/rest/v1/delivery_assignments",env,{delivery_id:deliveryId,rider_id:riderId,assigned_by:assignedBy,status:"offered"});
 if(a.error)return {success:false,data:null,error:a.error};
 await servicePatch(`/rest/v1/deliveries?id=eq.${encodeURIComponent(deliveryId)}`,env,{status:"assigned"});
 await servicePost("/rest/v1/delivery_events",env,{delivery_id:deliveryId,rider_id:riderId,event_type:"assignment_offered",metadata:{assigned_by:assignedBy}});
 return {success:true,data:a.data?.[0]??null,error:null};
}
export async function respondToAssignment(assignmentId:string,riderId:string,status:"accepted"|"rejected",env:DispatchEnv):Promise<DispatchResult<unknown>>{
 const a=await serviceGet<Array<{id:string;delivery_id:string;rider_id:string;status:string}>>(`/rest/v1/delivery_assignments?select=id,delivery_id,rider_id,status&id=eq.${encodeURIComponent(assignmentId)}&limit=1`,env);
 if(a.error||!a.data?.[0])return {success:false,data:null,error:a.error??"Assignment not found"};
 if(a.data[0].rider_id!==riderId)return {success:false,data:null,error:"Assignment does not belong to rider"};
 if(a.data[0].status!=="offered")return {success:false,data:null,error:"Assignment is no longer available"};
 const updated=await servicePatch(`/rest/v1/delivery_assignments?id=eq.${encodeURIComponent(assignmentId)}`,env,{status,responded_at:new Date().toISOString()});
 if(updated.error)return {success:false,data:null,error:updated.error};
 const deliveryStatus=status==="accepted"?"accepted":"pending";
 await servicePatch(`/rest/v1/deliveries?id=eq.${encodeURIComponent(a.data[0].delivery_id)}`,env,{status:deliveryStatus});
 await servicePost("/rest/v1/delivery_events",env,{delivery_id:a.data[0].delivery_id,rider_id:riderId,event_type:status==="accepted"?"assignment_accepted":"assignment_rejected"});
 return {success:true,data:updated.data?.[0]??null,error:null};
}
