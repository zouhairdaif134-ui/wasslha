/**
 * WASSLHA
 * Finance Service
 *
 * Financial read operations plus controlled withdrawal/refund requests.
 * Monetary bigint values are represented as strings at the API boundary.
 *
 * Berrechid MVP.
 */

import {
  databaseGet,
  databaseInsert,
  type DatabaseEnv,
} from "../lib/database";

export interface FinanceServiceEnv extends DatabaseEnv {}

export interface MerchantSettlement {
  id: string;
  merchant_id: string;
  period_start: string;
  period_end: string;
  gross_amount_minor: string;
  commission_minor: string;
  refund_minor: string;
  adjustment_minor: string;
  net_amount_minor: string;
  currency: "MAD";
  status: string;
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RiderEarning {
  id: string;
  rider_id: string;
  delivery_id?: string | null;
  amount_minor: string;
  bonus_minor: string;
  adjustment_minor: string;
  total_minor: string;
  currency: "MAD";
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface RiderWithdrawal {
  id: string;
  rider_id: string;
  amount_minor: string;
  currency: "MAD";
  status: string;
  idempotency_key: string;
  requested_at: string;
  processed_at?: string | null;
  processed_by?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
}

export interface Refund {
  id: string;
  master_order_id: string;
  payment_id?: string | null;
  amount_minor: string;
  currency: "MAD";
  reason_code: string;
  reason_text?: string | null;
  status: string;
  idempotency_key: string;
  requested_by?: string | null;
  approved_by?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FinanceServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

function positiveMinorUnits(value: string): boolean {
  return /^[0-9]+$/.test(value) && BigInt(value) > 0n;
}

export async function getMerchantSettlements(
  merchantId: string,
  env: FinanceServiceEnv,
  accessToken: string,
): Promise<FinanceServiceResult<MerchantSettlement[]>> {
  const result = await databaseGet<MerchantSettlement[]>(
    `/rest/v1/merchant_settlements?select=*&merchant_id=eq.${encodeURIComponent(merchantId)}&order=period_start.desc`,
    env,
    accessToken,
  );

  if (result.error) return { success: false, data: null, error: result.error };
  return { success: true, data: result.data ?? [], error: null };
}

export async function getRiderEarnings(
  riderId: string,
  env: FinanceServiceEnv,
  accessToken: string,
): Promise<FinanceServiceResult<RiderEarning[]>> {
  const result = await databaseGet<RiderEarning[]>(
    `/rest/v1/rider_earnings?select=*&rider_id=eq.${encodeURIComponent(riderId)}&order=created_at.desc`,
    env,
    accessToken,
  );

  if (result.error) return { success: false, data: null, error: result.error };
  return { success: true, data: result.data ?? [], error: null };
}

export async function getRiderWithdrawals(
  riderId: string,
  env: FinanceServiceEnv,
  accessToken: string,
): Promise<FinanceServiceResult<RiderWithdrawal[]>> {
  const result = await databaseGet<RiderWithdrawal[]>(
    `/rest/v1/rider_withdrawals?select=*&rider_id=eq.${encodeURIComponent(riderId)}&order=created_at.desc`,
    env,
    accessToken,
  );

  if (result.error) return { success: false, data: null, error: result.error };
  return { success: true, data: result.data ?? [], error: null };
}

export async function requestRiderWithdrawal(
  riderId: string,
  amountMinor: string,
  idempotencyKey: string,
  env: FinanceServiceEnv,
  accessToken: string,
): Promise<FinanceServiceResult<RiderWithdrawal | null>> {
  if (!positiveMinorUnits(amountMinor)) {
    return { success: false, data: null, error: "Invalid withdrawal amount" };
  }

  if (!idempotencyKey.trim()) {
    return { success: false, data: null, error: "Idempotency key is required" };
  }

  const result = await databaseInsert<RiderWithdrawal[]>(
    "/rest/v1/rider_withdrawals",
    env,
    {
      rider_id: riderId,
      amount_minor: amountMinor,
      currency: "MAD",
      status: "requested",
      idempotency_key: idempotencyKey,
    },
    accessToken,
  );

  if (result.error) return { success: false, data: null, error: result.error };
  return { success: true, data: result.data?.[0] ?? null, error: null };
}

export async function getOrderRefunds(
  orderId: string,
  env: FinanceServiceEnv,
  accessToken: string,
): Promise<FinanceServiceResult<Refund[]>> {
  const result = await databaseGet<Refund[]>(
    `/rest/v1/refunds?select=*&master_order_id=eq.${encodeURIComponent(orderId)}&order=created_at.desc`,
    env,
    accessToken,
  );

  if (result.error) return { success: false, data: null, error: result.error };
  return { success: true, data: result.data ?? [], error: null };
}
