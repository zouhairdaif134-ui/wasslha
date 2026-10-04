/**
 * WASSLHA
 * Delivery Service
 *
 * Server-side delivery read operations.
 *
 * Delivery state changes are handled by the order/delivery workflow.
 * Berrechid MVP.
 */

import {
  databaseGet,
  type DatabaseEnv,
} from "../lib/database";
import {
  servicePost,
  servicePatch,
  type ServiceAuthEnv,
} from "../lib/service-client";

export interface DeliveryServiceEnv extends DatabaseEnv, ServiceAuthEnv {}

export interface Delivery {
  id: string;
  master_order_id: string;
  pickup_address_text?: string | null;
  delivery_address_text: string;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  distance_meters?: number | null;
  eta_seconds?: number | null;
  status?: string | null;
  customer_note?: string | null;
  started_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryAssignment {
  id: string;
  delivery_id: string;
  rider_id: string;
  assigned_by?: string | null;
  status?: string | null;
  offered_at?: string;
  responded_at?: string | null;
  completed_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
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
): Promise<DeliveryServiceResult<Delivery | null>> {
  const result = await databaseGet<Delivery[]>(
    `/rest/v1/deliveries?select=*&master_order_id=eq.${encodeURIComponent(orderId)}&limit=1`,
    env,
    accessToken,
  );

  if (result.error) {
    return { success: false, data: null, error: result.error };
  }

  return {
    success: true,
    data: result.data?.[0] ?? null,
    error: null,
  };
}

export async function getRiderDeliveries(
  riderId: string,
  env: DeliveryServiceEnv,
  accessToken: string,
): Promise<DeliveryServiceResult<Delivery[]>> {
  const assignmentsResult = await databaseGet<DeliveryAssignment[]>(
    `/rest/v1/delivery_assignments?select=delivery_id&` +
      `rider_id=eq.${encodeURIComponent(riderId)}&` +
      `status=in.(offered,accepted,completed)&order=created_at.desc`,
    env,
    accessToken,
  );

  if (assignmentsResult.error) {
    return {
      success: false,
      data: null,
      error: assignmentsResult.error,
    };
  }

  const deliveryIds = [
    ...new Set(
      (assignmentsResult.data ?? [])
        .map((assignment) => assignment.delivery_id)
        .filter(Boolean),
    ),
  ];

  if (deliveryIds.length === 0) {
    return { success: true, data: [], error: null };
  }

  const inFilter = deliveryIds.map(encodeURIComponent).join(",");

  const result = await databaseGet<Delivery[]>(
    `/rest/v1/deliveries?select=*&id=in.(${inFilter})&order=created_at.desc`,
    env,
    accessToken,
  );

  if (result.error) {
    return { success: false, data: null, error: result.error };
  }

  return {
    success: true,
    data: result.data ?? [],
    error: null,
  };
}


export async function getRiderAssignments(
  riderId: string,
  env: DeliveryServiceEnv,
  accessToken: string,
): Promise<DeliveryServiceResult<DeliveryAssignment[]>> {
  const result = await databaseGet<DeliveryAssignment[]>(
    `/rest/v1/delivery_assignments?select=*&rider_id=eq.${encodeURIComponent(riderId)}&status=in.(offered,accepted)&order=created_at.desc`,
    env,
    accessToken,
  );
  if (result.error) return { success: false, data: null, error: result.error };
  return { success: true, data: result.data ?? [], error: null };
}

export async function getDeliveryAssignments(
  deliveryId: string,
  env: DeliveryServiceEnv,
  accessToken: string,
): Promise<DeliveryServiceResult<DeliveryAssignment[]>> {
  const result = await databaseGet<DeliveryAssignment[]>(
    `/rest/v1/delivery_assignments?select=*&delivery_id=eq.${encodeURIComponent(
      deliveryId,
    )}&order=created_at.desc`,
    env,
    accessToken,
  );

  if (result.error) {
    return { success: false, data: null, error: result.error };
  }

  return {
    success: true,
    data: result.data ?? [],
    error: null,
  };
}


export type DeliveryAssignmentStatus =
  | "offered"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed";

export async function offerDeliveryToRider(
  deliveryId: string,
  riderId: string,
  assignedBy: string,
  env: DeliveryServiceEnv,
): Promise<DeliveryServiceResult<DeliveryAssignment | null>> {
  const result = await servicePost<DeliveryAssignment[]>(
    "/rest/v1/delivery_assignments",
    env,
    {
      delivery_id: deliveryId,
      rider_id: riderId,
      assigned_by: assignedBy,
      status: "offered",
    },
  );

  if (result.error) {
    return { success: false, data: null, error: result.error };
  }

  return { success: true, data: result.data?.[0] ?? null, error: null };
}

export async function updateDeliveryAssignmentStatus(
  assignmentId: string,
  status: DeliveryAssignmentStatus,
  env: DeliveryServiceEnv,
  rejectionReason?: string,
): Promise<DeliveryServiceResult<DeliveryAssignment | null>> {
  const body: Record<string, unknown> = {
    status,
    responded_at:
      status === "accepted" || status === "rejected"
        ? new Date().toISOString()
        : undefined,
    completed_at:
      status === "completed" ? new Date().toISOString() : undefined,
  };

  if (status === "rejected" && rejectionReason) {
    body.rejection_reason = rejectionReason;
  }

  const result = await servicePatch<DeliveryAssignment[]>(
    `/rest/v1/delivery_assignments?id=eq.${encodeURIComponent(assignmentId)}`,
    env,
    body,
  );

  if (result.error) {
    return { success: false, data: null, error: result.error };
  }

  return { success: true, data: result.data?.[0] ?? null, error: null };
}
