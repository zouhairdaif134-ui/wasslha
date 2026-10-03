/**
 * WASSLHA
 * Order Service
 *
 * Server-side order read operations.
 *
 * Order state transitions will be handled through
 * the dedicated order state-machine service.
 *
 * Berrechid MVP.
 */

import {
  databaseGet,
  type DatabaseEnv,
} from "../lib/database";

export interface OrderServiceEnv
  extends DatabaseEnv {}

export interface MasterOrder {
  id: string;
  customer_id: string;
  status?: string | null;
  subtotal_minor?: number | null;
  discount_minor?: number | null;
  delivery_fee_minor?: number | null;
  total_minor?: number | null;
  currency?: string | null;
  delivery_address_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SubOrder {
  id: string;
  master_order_id: string;
  store_id: string;
  status?: string | null;
  subtotal_minor?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface OrderServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function getCustomerOrders(
  customerId: string,
  env: OrderServiceEnv,
  accessToken: string,
): Promise<
  OrderServiceResult<MasterOrder[]>
> {
  const result =
    await databaseGet<MasterOrder[]>(
      `/rest/v1/master_orders` +
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

export async function getOrder(
  orderId: string,
  env: OrderServiceEnv,
  accessToken: string,
): Promise<
  OrderServiceResult<MasterOrder | null>
> {
  const result =
    await databaseGet<MasterOrder[]>(
      `/rest/v1/master_orders` +
        `?select=*` +
        `&id=eq.${encodeURIComponent(
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

export async function getOrderSubOrders(
  orderId: string,
  env: OrderServiceEnv,
  accessToken: string,
): Promise<
  OrderServiceResult<SubOrder[]>
> {
  const result =
    await databaseGet<SubOrder[]>(
      `/rest/v1/sub_orders` +
        `?select=*` +
        `&master_order_id=eq.${encodeURIComponent(
          orderId,
        )}` +
        `&order=created_at.asc`,
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

export async function getOrderStatusHistory(
  orderId: string,
  env: OrderServiceEnv,
  accessToken: string,
): Promise<
  OrderServiceResult<
    Array<{
      id: string;
      master_order_id: string;
      old_status?: string | null;
      new_status?: string | null;
      changed_by?: string | null;
      reason?: string | null;
      metadata?: Record<string, unknown>;
      created_at?: string;
    }>
  >
> {
  const result =
    await databaseGet<
      Array<{
        id: string;
        master_order_id: string;
        status?: string | null;
        note?: string | null;
        created_at?: string;
      }>
    >(
      `/rest/v1/order_status_history` +
        `?select=*` +
        `&master_order_id=eq.${encodeURIComponent(
          orderId,
        )}` +
        `&order=created_at.asc`,
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
