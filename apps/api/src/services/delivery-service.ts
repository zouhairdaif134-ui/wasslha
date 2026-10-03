/**
 * WASSLHA
 * Delivery Service
 *
 * Server-side delivery read operations.
 *
 * Berrechid MVP.
 */

import {
  databaseGet,
  databaseUpdate,
  type DatabaseEnv,
} from "../lib/database";

export interface DeliveryServiceEnv
  extends DatabaseEnv {}

export interface Delivery {
  id: string;
  master_order_id: string;
  status?: string | null;
  pickup_address?: string | null;
  delivery_address?: string | null;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  assigned_rider_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryAssignment {
  id: string;
  delivery_id: string;
  rider_id: string;
  status?: string | null;
  assigned_at?: string;
  accepted_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function getDeliveryByOrder(
  orderId: string,
  env: DeliveryServiceEnv,
  accessToken: string,
): Promise<
  DeliveryServiceResult<Delivery | null>
> {
  const result =
    await databaseGet<Delivery[]>(
      `/rest/v1/deliveries` +
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

export async function getRiderDeliveries(
  riderId: string,
  env: DeliveryServiceEnv,
  accessToken: string,
): Promise<
  DeliveryServiceResult<Delivery[]>
> {
  const result =
    await databaseGet<Delivery[]>(
      `/rest/v1/deliveries` +
        `?select=*` +
        `&assigned_rider_id=eq.${encodeURIComponent(
          riderId,
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

export async function getDeliveryAssignments(
  deliveryId: string,
  env: DeliveryServiceEnv,
  accessToken: string,
): Promise<
  DeliveryServiceResult<DeliveryAssignment[]>
> {
  const result =
    await databaseGet<DeliveryAssignment[]>(
      `/rest/v1/delivery_assignments` +
        `?select=*` +
        `&delivery_id=eq.${encodeURIComponent(
          deliveryId,
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

export async function updateDeliveryStatus(
  deliveryId: string,
  status: string,
  env: DeliveryServiceEnv,
  accessToken: string,
): Promise<
  DeliveryServiceResult<Delivery | null>
> {
  const result =
    await databaseUpdate<Delivery[]>(
      `/rest/v1/deliveries` +
        `?id=eq.${encodeURIComponent(
          deliveryId,
        )}`,
      env,
      {
        status,
      },
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
