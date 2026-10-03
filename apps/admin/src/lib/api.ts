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
