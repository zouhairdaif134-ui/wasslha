/**
 * WASSLHA
 * Payment Service
 *
 * Server-side payment read operations.
 * Financial writes remain backend-controlled.
 *
 * Berrechid MVP.
 */

import {
  databaseGet,
  type DatabaseEnv,
} from "../lib/database";

export interface PaymentServiceEnv
  extends DatabaseEnv {}

export interface Payment {
  id: string;
  master_order_id: string;
  customer_id: string;
  amount_minor: number;
  currency: string;
  method?: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentTransaction {
  id: string;
  payment_id: string;
  transaction_type?: string | null;
  amount_minor?: number | null;
  currency?: string | null;
  status?: string | null;
  provider_reference?: string | null;
  created_at?: string;
}

export interface PaymentServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function getPaymentByOrder(
  orderId: string,
  env: PaymentServiceEnv,
  accessToken: string,
): Promise<
  PaymentServiceResult<Payment | null>
> {
  const result =
    await databaseGet<Payment[]>(
      `/rest/v1/payments` +
        `?select=*` +
        `&master_order_id=eq.${encodeURIComponent(
          orderId,
        )}` +
        `&limit=1`,
      env,
      accessToken,
    );

  if (result.error) {
    return {
      success: false,
      data: null,
      error: result.error,
    };
  }

  return {
    success: true,
    data:
      result.data?.[0] ?? null,
    error: null,
  };
}

export async function getCustomerPayments(
  customerId: string,
  env: PaymentServiceEnv,
  accessToken: string,
): Promise<
  PaymentServiceResult<Payment[]>
> {
  const result =
    await databaseGet<Payment[]>(
      `/rest/v1/payments` +
        `?select=*` +
        `&customer_id=eq.${encodeURIComponent(
          customerId,
        )}` +
        `&order=created_at.desc`,
      env,
      accessToken,
    );

  if (result.error) {
    return {
      success: false,
      data: null,
      error: result.error,
    };
  }

  return {
    success: true,
    data: result.data ?? [],
    error: null,
  };
}

export async function getPaymentTransactions(
  paymentId: string,
  env: PaymentServiceEnv,
  accessToken: string,
): Promise<
  PaymentServiceResult<PaymentTransaction[]>
> {
  const result =
    await databaseGet<PaymentTransaction[]>(
      `/rest/v1/payment_transactions` +
        `?select=*` +
        `&payment_id=eq.${encodeURIComponent(
          paymentId,
        )}` +
        `&order=created_at.desc`,
      env,
      accessToken,
    );

  if (result.error) {
    return {
      success: false,
      data: null,
      error: result.error,
    };
  }

  return {
    success: true,
    data: result.data ?? [],
    error: null,
  };
}
