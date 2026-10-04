import { servicePost, type ServiceAuthEnv } from "../lib/service-client";
import { databaseGet, type DatabaseEnv } from "../lib/database";

export interface PurchaseServiceEnv extends DatabaseEnv, ServiceAuthEnv {}

export async function createPurchaseRecord(input:{get_request_id:string;rider_id:string;actual_product_amount_minor:string;reimbursement_amount_minor:string;delivery_fee_minor:string;service_fee_minor:string;total_amount_minor:string;budget_exceeded:boolean;idempotency_key:string},env:PurchaseServiceEnv){
  return servicePost<Array<Record<string,unknown>>>('/rest/v1/purchase_records',env,{...input,currency:'MAD',status:input.budget_exceeded?'pending':'approved'});
}

export async function createPurchaseApproval(input:{get_request_id:string;purchase_record_id?:string|null;requested_amount_minor:string;budget_amount_minor:string;requested_by:string;idempotency_key:string;decision_reason?:string|null},env:PurchaseServiceEnv){
  return servicePost<Array<Record<string,unknown>>>('/rest/v1/purchase_approvals',env,{...input,status:'pending'});
}

export async function addPurchaseReceipt(input:{purchase_record_id:string;get_request_id:string;uploaded_by:string;storage_path:string;receipt_number?:string|null;vendor_name?:string|null;amount_minor:string},env:PurchaseServiceEnv){
  return servicePost<Array<Record<string,unknown>>>('/rest/v1/purchase_receipts',env,{...input,currency:'MAD'});
}

export async function getAcceptedGetRequestRider(getRequestId:string,riderId:string,env:DatabaseEnv,accessToken:string){
  const result=await databaseGet<Array<{id:string}>>(`/rest/v1/get_request_offers?select=id&get_request_id=eq.${encodeURIComponent(getRequestId)}&rider_id=eq.${encodeURIComponent(riderId)}&status=eq.accepted&limit=1`,env,accessToken);
  return result.data?.[0]??null;
}

export async function getCustomerGetRequest(getRequestId:string,customerId:string,env:DatabaseEnv,accessToken:string){
  const result=await databaseGet<Array<{id:string;customer_id:string;maximum_product_amount_minor:number|string|null}>>(`/rest/v1/get_requests?select=id,customer_id,maximum_product_amount_minor&id=eq.${encodeURIComponent(getRequestId)}&customer_id=eq.${encodeURIComponent(customerId)}&limit=1`,env,accessToken);
  return result.data?.[0]??null;
}
