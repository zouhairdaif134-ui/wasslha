import { servicePost, type ServiceResult } from "../lib/service-client";
import type { ServiceAuthEnv } from "../lib/service-auth";

export interface AdminDashboardOverview {
  generated_at: string;
  currency: "MAD";
  scope: "Berrechid MVP";
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
}

export async function getAdminDashboardOverview(
  adminUserId: string,
  env: ServiceAuthEnv,
): Promise<ServiceResult<AdminDashboardOverview>> {
  return servicePost<AdminDashboardOverview>(
    "/rest/v1/rpc/admin_dashboard_overview",
    env,
    { p_admin_user_id: adminUserId },
  );
}
