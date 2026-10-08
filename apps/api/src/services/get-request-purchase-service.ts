import { servicePost, type ServiceAuthEnv } from "../lib/service-client";
import { databaseGet, type DatabaseEnv } from "../lib/database";

export interface PurchaseServiceEnv extends DatabaseEnv, ServiceAuthEnv {}

async function rpc<T>(name:string, body:Record<string,unknown>, env:PurchaseServiceEnv) {
  return servicePost<T[]>(`/rest/v1/rpc/${name}`, env, body);
}

export async function createPurchaseRecord(
  input:{
    get_request_id:string;
    rider_id:string;
    actual_product_amount_minor:string;
    reimbursement_amount_minor:string;
    delivery_fee_minor:string;
    service_fee_minor:string;
    total_amount_minor:string;
    idempotency_key:string;
  },
  env:PurchaseServiceEnv
){
  return rpc<Record<string,unknown>>("create_get_request_purchase", {
    p_get_request_id:input.get_request_id,
    p_rider_id:input.rider_id,
    p_actual_product_amount_minor:input.actual_product_amount_minor,
    p_reimbursement_amount_minor:input.reimbursement_amount_minor,
    p_delivery_fee_minor:input.delivery_fee_minor,
    p_service_fee_minor:input.service_fee_minor,
    p_total_amount_minor:input.total_amount_minor,
    p_idempotency_key:input.idempotency_key
  }, env);
}

export async function createPurchaseApproval(input:{
  get_request_id:string;
  requested_amount_minor:string;
  budget_amount_minor:string;
  requested_by:string;
  idempotency_key:string;
  decision_reason?:string|null
},env:PurchaseServiceEnv){
  return servicePost<Array<Record<string,unknown>>>("/rest/v1/purchase_approvals",env,{
    get_request_id:input.get_request_id,
    requested_amount_minor:input.requested_amount_minor,
    budget_amount_minor:input.budget_amount_minor,
    requested_by:input.requested_by,
    idempotency_key:input.idempotency_key,
    decision_reason:input.decision_reason??null,
    status:"pending"
  });
}

export async function decidePurchaseApproval(input:{
  approval_id:string;
  customer_id:string;
  decision:"approved"|"rejected";
  reason?:string|null
},env:PurchaseServiceEnv){
  return rpc<Record<string,unknown>>("approve_get_request_purchase", {
    p_approval_id:input.approval_id,
    p_customer_id:input.customer_id,
    p_decision:input.decision,
    p_reason:input.reason??null
  }, env);
}

export async function addPurchaseReceipt(input:{
  purchase_record_id:string;
  get_request_id:string;
  uploaded_by:string;
  storage_path:string;
  receipt_number?:string|null;
  vendor_name?:string|null;
  amount_minor:string
},env:PurchaseServiceEnv){
  return rpc<Record<string,unknown>>("add_get_request_purchase_receipt", {
    p_purchase_record_id:input.purchase_record_id,
    p_get_request_id:input.get_request_id,
    p_rider_id:input.uploaded_by,
    p_storage_path:input.storage_path,
    p_receipt_number:input.receipt_number??null,
    p_vendor_name:input.vendor_name??null,
    p_amount_minor:input.amount_minor
  }, env);
}

export async function getAcceptedGetRequestRider(getRequestId:string,riderId:string,env:DatabaseEnv,accessToken:string){
  const result=await databaseGet<Array<{id:string}>>(
    `/rest/v1/get_request_offers?select=id&get_request_id=eq.${encodeURIComponent(getRequestId)}&rider_id=eq.${encodeURIComponent(riderId)}&status=eq.accepted&limit=1`,
    env,
    accessToken
  );
  return result.data?.[0]??null;
}

export async function getCustomerGetRequest(getRequestId:string,customerId:string,env:DatabaseEnv,accessToken:string){
  const result=await databaseGet<Array<{id:string;customer_id:string;maximum_product_amount_minor:number|string|null}>>(
    `/rest/v1/get_requests?select=id,customer_id,maximum_product_amount_minor&id=eq.${encodeURIComponent(getRequestId)}&customer_id=eq.${encodeURIComponent(customerId)}&limit=1`,
    env,
    accessToken
  );
  return result.data?.[0]??null;
}
