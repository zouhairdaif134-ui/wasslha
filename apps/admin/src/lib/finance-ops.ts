const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export type RiderCashRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  status: string;
  balance_minor: number | string;
  limit_minor: number | string;
  remaining_minor: number | string;
  cash_status: string;
  blocked: boolean;
};

export type CashHandoverResult = {
  transaction_id: string;
  amount_minor: number | string;
  balance_before_minor: number | string;
  balance_after_minor: number | string;
};

export type SettlementGenerationResult = { created: number; skipped: number };
export type SettlementStatusResult = { id: string; status: string; paid_at: string | null; net_amount_minor: number | string };

async function call<T>(accessToken: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/api/v1/admin/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const payload = (await response.json()) as { success?: boolean; data?: T; error?: { message?: string } };
  if (!response.ok || !payload.success || payload.data === undefined) {
    throw new Error(payload.error?.message ?? "Operation failed.");
  }
  return payload.data;
}

export async function getRiderCash(accessToken: string): Promise<{ items: RiderCashRow[]; total: number }> {
  return call(accessToken, "riders/cash?limit=100");
}

export async function recordCashHandover(
  accessToken: string,
  riderId: string,
  amountMinor: number,
  idempotencyKey: string,
  note: string,
): Promise<CashHandoverResult> {
  return call(accessToken, `riders/${encodeURIComponent(riderId)}/cash-handover`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ amount_minor: amountMinor, note: note.trim() || undefined }),
  });
}

export async function generateSettlements(
  accessToken: string,
  periodStart: string,
  periodEnd: string,
): Promise<SettlementGenerationResult> {
  return call(accessToken, "finance/settlements/generate", {
    method: "POST",
    body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
  });
}

export async function setSettlementStatus(
  accessToken: string,
  settlementId: string,
  status: "approved" | "paid" | "cancelled",
  reference?: string,
): Promise<SettlementStatusResult> {
  return call(accessToken, `finance/settlements/${encodeURIComponent(settlementId)}/status`, {
    method: "POST",
    body: JSON.stringify({ status, reference: reference?.trim() || undefined }),
  });
}
