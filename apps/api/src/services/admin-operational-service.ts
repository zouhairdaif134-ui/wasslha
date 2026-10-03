import { servicePost, type ServiceResult } from "../lib/service-client";
import type { ServiceAuthEnv } from "../lib/service-auth";

export type AdminListResult<T> = { items: T[]; total: number };

export type AdminOrderRow = {
  id:string; order_number:string; status:string; payment_method:string; payment_status:string;
  currency:"MAD"; total_minor:number|string; customer_id:string; customer_name:string|null;
  customer_phone:string|null; created_at:string; updated_at:string; placed_at:string|null; delivered_at:string|null;
};
export type AdminMerchantRow = {
  id:string; business_name:string; legal_name:string|null; phone:string|null; email:string|null;
  status:string; rejection_reason:string|null; approved_at:string|null; user_id:string;
  owner_name:string|null; owner_phone:string|null; store_count:number; created_at:string; updated_at:string;
};
export type AdminRiderRow = {
  id:string; status:string; vehicle_type:string|null; vehicle_plate:string|null; is_online:boolean;
  approved_at:string|null; full_name:string|null; phone:string|null; created_at:string; updated_at:string;
  open_violations:number; pending_earnings:number;
};
export type AdminPaymentRow = {
  id:string; master_order_id:string; order_number:string; customer_id:string; customer_name:string|null;
  payment_method:string; status:string; amount_minor:number|string; currency:"MAD"; provider:string|null;
  created_at:string; updated_at:string;
};
export type AdminSettlementRow = {
  id:string; merchant_id:string; business_name:string; period_start:string; period_end:string;
  gross_amount_minor:number|string; commission_minor:number|string; refund_minor:number|string;
  adjustment_minor:number|string; net_amount_minor:number|string; status:string; paid_at:string|null; created_at:string;
};
export type AdminLedgerRow = {
  id:string; master_order_id:string|null; sub_order_id:string|null; payment_id:string|null;
  entry_type:string; direction:string; amount_minor:number|string; currency:"MAD";
  reference_type:string|null; reference_id:string|null; description:string|null; created_at:string;
};
export type AdminTicketRow = {
  id:string; user_id:string; user_name:string|null; master_order_id:string|null; order_number:string|null;
  category:string; subject:string; priority:string; status:string; assigned_to:string|null; resolved_at:string|null;
  created_at:string; updated_at:string;
};
export type AdminComplaintRow = {
  id:string; user_id:string; user_name:string|null; master_order_id:string|null; order_number:string|null;
  complaint_type:string; description:string; status:string; resolution:string|null; resolved_by:string|null;
  resolved_at:string|null; created_at:string; updated_at:string;
};
export type AdminUserRow = {
  id:string; full_name:string|null; phone:string|null; preferred_language:"ar"|"fr"; is_active:boolean;
  created_at:string; updated_at:string; roles:Array<{id:string;code:string;name:string}>;
};
export type AdminAuditRow = {
  id:string; actor_user_id:string|null; actor_name:string|null; action:string; entity_type:string;
  entity_id:string|null; before_data:unknown; after_data:unknown; metadata:unknown; ip_address:string|null;
  user_agent:string|null; created_at:string;
};

async function post<T>(rpc:string, body:Record<string,unknown>, env:ServiceAuthEnv):Promise<ServiceResult<AdminListResult<T>>> {
  return servicePost<AdminListResult<T>>(`/rest/v1/rpc/${rpc}`,env,body);
}
export const getAdminOrders=(adminUserId:string,status:string|null,limit:number,offset:number,env:ServiceAuthEnv)=>post<AdminOrderRow>("admin_orders_list",{p_admin_user_id:adminUserId,p_status:status,p_limit:limit,p_offset:offset},env);
export const getAdminMerchants=(adminUserId:string,status:string|null,limit:number,offset:number,env:ServiceAuthEnv)=>post<AdminMerchantRow>("admin_merchants_list",{p_admin_user_id:adminUserId,p_status:status,p_limit:limit,p_offset:offset},env);
export const getAdminRiders=(adminUserId:string,status:string|null,limit:number,offset:number,env:ServiceAuthEnv)=>post<AdminRiderRow>("admin_riders_list",{p_admin_user_id:adminUserId,p_status:status,p_limit:limit,p_offset:offset},env);
export const getAdminFinance=(adminUserId:string,kind:string,limit:number,offset:number,env:ServiceAuthEnv)=>post<AdminPaymentRow|AdminSettlementRow|AdminLedgerRow>("admin_finance_list",{p_admin_user_id:adminUserId,p_kind:kind,p_limit:limit,p_offset:offset},env);
export const getAdminSupport=(adminUserId:string,kind:string,limit:number,offset:number,env:ServiceAuthEnv)=>post<AdminTicketRow|AdminComplaintRow>("admin_support_list",{p_admin_user_id:adminUserId,p_kind:kind,p_limit:limit,p_offset:offset},env);
export const getAdminUsers=(adminUserId:string,limit:number,offset:number,env:ServiceAuthEnv)=>post<AdminUserRow>("admin_users_list",{p_admin_user_id:adminUserId,p_limit:limit,p_offset:p_offset},env);
export const getAdminAudit=(adminUserId:string,limit:number,offset:number,env:ServiceAuthEnv)=>post<AdminAuditRow>("admin_audit_list",{p_admin_user_id:adminUserId,p_limit:limit,p_offset:offset},env);
