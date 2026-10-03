export type AdminDashboardOverview = {
  generated_at: string;
  currency: "MAD";
  scope: string;
  today: {
    orders: number;
    gmv_minor: number | string;
    delivered_orders: number;
    refunds_minor: number | string;
  };
  operations: {
    active_orders: number;
    active_deliveries: number;
    failed_deliveries_today: number;
    approved_riders: number;
    online_riders: number;
    approved_merchants: number;
    pending_merchants: number;
  };
  finance: {
    commission_minor_today: number | string;
    delivery_fees_minor_today: number | string;
    rider_earnings_minor_today: number | string;
    ledger_entries_today: number;
  };
  users: {
    total: number;
    new_today: number;
  };
};

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export type AdminSession = {
  user: {
    id: string;
    email?: string | null;
    phone?: string | null;
  };
  roles: Array<{ id: string; name: string }>;
  admin: boolean;
};

export async function getAdminSession(accessToken: string): Promise<AdminSession> {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const payload = (await response.json()) as {
    success?: boolean;
    data?: AdminSession;
    error?: { message?: string };
  };

  if (!response.ok || !payload.success || !payload.data?.admin) {
    throw new Error(payload.error?.message ?? "Admin authorization denied.");
  }

  return payload.data;
}


export async function getAdminDashboardOverview(
  accessToken: string,
): Promise<AdminDashboardOverview> {
  const response = await fetch(`${apiBaseUrl}/api/v1/admin/overview`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const payload = (await response.json()) as {
    success?: boolean;
    data?: AdminDashboardOverview;
    error?: { message?: string };
  };

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? "Unable to load admin overview.");
  }

  return payload.data;
}

export type AdminListResult<T> = { items: T[]; total: number };

async function getAdminList<T>(accessToken: string, path: string): Promise<AdminListResult<T>> {
  const response = await fetch(`${apiBaseUrl}/api/v1/admin/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  const payload = (await response.json()) as { success?: boolean; data?: AdminListResult<T>; error?: { message?: string } };
  if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message ?? "Unable to load admin data.");
  return payload.data;
}

export async function getAdminOrders(accessToken:string,status?:string):Promise<AdminListResult<AdminOrderRow>> {
  return getAdminList(accessToken,`orders?limit=50${status ? `&status=${encodeURIComponent(status)}` : ""}`);
}
export async function getAdminMerchants(accessToken:string,status?:string):Promise<AdminListResult<AdminMerchantRow>> {
  return getAdminList(accessToken,`merchants?limit=50${status ? `&status=${encodeURIComponent(status)}` : ""}`);
}
export async function getAdminRiders(accessToken:string,status?:string):Promise<AdminListResult<AdminRiderRow>> {
  return getAdminList(accessToken,`riders?limit=50${status ? `&status=${encodeURIComponent(status)}` : ""}`);
}
export async function getAdminFinance(accessToken:string,kind:"payments"|"settlements"|"ledger"):Promise<AdminListResult<AdminPaymentRow|AdminSettlementRow|AdminLedgerRow>> {
  return getAdminList(accessToken,`finance?kind=${kind}&limit=50`);
}
export async function getAdminSupport(accessToken:string,kind:"tickets"|"complaints"):Promise<AdminListResult<AdminTicketRow|AdminComplaintRow>> {
  return getAdminList(accessToken,`support?kind=${kind}&limit=50`);
}
export async function getAdminUsers(accessToken:string):Promise<AdminListResult<AdminUserRow>> {
  return getAdminList(accessToken,"users?limit=50");
}
export async function getAdminAudit(accessToken:string):Promise<AdminListResult<AdminAuditRow>> {
  return getAdminList(accessToken,"audit?limit=100");
}

export type AdminOrderRow = { id:string; order_number:string; status:string; payment_method:string; payment_status:string; currency:string; total_minor:number|string; customer_id:string; customer_name:string|null; customer_phone:string|null; created_at:string; updated_at:string; placed_at:string|null; delivered_at:string|null; }; 
export type AdminMerchantRow = { id:string; business_name:string; legal_name:string|null; phone:string|null; email:string|null; status:string; rejection_reason:string|null; approved_at:string|null; user_id:string; owner_name:string|null; owner_phone:string|null; store_count:number; created_at:string; updated_at:string; };
export type AdminRiderRow = { id:string; status:string; vehicle_type:string|null; vehicle_plate:string|null; is_online:boolean; approved_at:string|null; full_name:string|null; phone:string|null; created_at:string; updated_at:string; open_violations:number; pending_earnings:number; };
export type AdminPaymentRow = { id:string; master_order_id:string; order_number:string; customer_id:string; customer_name:string|null; payment_method:string; status:string; amount_minor:number|string; currency:string; provider:string|null; created_at:string; updated_at:string; };
export type AdminSettlementRow = { id:string; merchant_id:string; business_name:string; period_start:string; period_end:string; gross_amount_minor:number|string; commission_minor:number|string; refund_minor:number|string; adjustment_minor:number|string; net_amount_minor:number|string; status:string; paid_at:string|null; created_at:string; };
export type AdminLedgerRow = { id:string; master_order_id:string|null; sub_order_id:string|null; payment_id:string|null; entry_type:string; direction:string; amount_minor:number|string; currency:string; reference_type:string|null; reference_id:string|null; description:string|null; created_at:string; };
export type AdminTicketRow = { id:string; user_id:string; user_name:string|null; master_order_id:string|null; order_number:string|null; category:string; subject:string; priority:string; status:string; assigned_to:string|null; resolved_at:string|null; created_at:string; updated_at:string; };
export type AdminComplaintRow = { id:string; user_id:string; user_name:string|null; master_order_id:string|null; order_number:string|null; complaint_type:string; description:string; status:string; resolution:string|null; resolved_by:string|null; resolved_at:string|null; created_at:string; updated_at:string; };
export type AdminUserRow = { id:string; full_name:string|null; phone:string|null; preferred_language:string; is_active:boolean; created_at:string; updated_at:string; roles:Array<{id:string;code:string;name:string}>; };
export type AdminAuditRow = { id:string; actor_user_id:string|null; actor_name:string|null; action:string; entity_type:string; entity_id:string|null; before_data:unknown; after_data:unknown; metadata:unknown; ip_address:string|null; user_agent:string|null; created_at:string; };

export type AdminGovernanceOverview={settings:number;sensitive_settings:number;open_risk_flags:number;critical_risk_flags:number;active_app_versions:number;latest_releases:number;setting_changes_today:number};
export async function getAdminGovernanceOverview(accessToken:string):Promise<AdminGovernanceOverview>{
 const response=await fetch(`${apiBaseUrl}/api/v1/admin/governance`,{headers:{Authorization:`Bearer ${accessToken}`,Accept:"application/json"}});
 const payload=await response.json() as {success?:boolean;data?:AdminGovernanceOverview;error?:{message?:string}};
 if(!response.ok||!payload.success||!payload.data)throw new Error(payload.error?.message??"Unable to load governance.");
 return payload.data;
}
