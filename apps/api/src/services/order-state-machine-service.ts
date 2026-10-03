/**
 * WASSLHA
 * Order State Machine Service
 *
 * All order status transitions go through atomic database functions.
 * Direct status PATCH operations must not be used for workflow changes.
 *
 * Berrechid MVP.
 */

import {
  servicePost,
  type ServiceResult,
} from "../lib/service-client";
import type { ServiceAuthEnv } from "../lib/service-auth";

export type MasterOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "assigned"
  | "picked_up"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

export type SubOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "assigned"
  | "picked_up"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface OrderTransitionResult {
  id: string;
  master_order_id?: string;
  old_status: string;
  new_status: string;
}

export interface OrderStateMachineResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface OrderStateMachineEnv
  extends ServiceAuthEnv {}

function toResult<T>(
  result: ServiceResult<T>,
): OrderStateMachineResult<T> {
  if (result.error) {
    return {
      success: false,
      data: null,
      error: result.error,
    };
  }

  return {
    success: true,
    data: result.data,
    error: null,
  };
}

export function isMasterOrderTransitionAllowed(
  from: MasterOrderStatus,
  to: MasterOrderStatus,
): boolean {
  const transitions: Record<
    MasterOrderStatus,
    MasterOrderStatus[]
  > = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready_for_pickup", "cancelled"],
    ready_for_pickup: ["assigned", "cancelled"],
    assigned: ["picked_up", "cancelled"],
    picked_up: ["out_for_delivery"],
    out_for_delivery: ["delivered", "cancelled"],
    delivered: ["refunded"],
    cancelled: ["refunded"],
    refunded: [],
  };

  return transitions[from].includes(to);
}

export function isSubOrderTransitionAllowed(
  from: SubOrderStatus,
  to: SubOrderStatus,
): boolean {
  const transitions: Record<
    SubOrderStatus,
    SubOrderStatus[]
  > = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready_for_pickup", "cancelled"],
    ready_for_pickup: ["assigned", "cancelled"],
    assigned: ["picked_up", "cancelled"],
    picked_up: ["out_for_delivery"],
    out_for_delivery: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
  };

  return transitions[from].includes(to);
}

export async function transitionMasterOrderStatus(
  masterOrderId: string,
  newStatus: MasterOrderStatus,
  env: OrderStateMachineEnv,
  changedBy?: string | null,
  reason?: string | null,
  metadata: Record<string, unknown> = {},
): Promise<OrderStateMachineResult<OrderTransitionResult>> {
  const result = await servicePost<OrderTransitionResult[]>(
    "/rest/v1/rpc/transition_master_order_status",
    env,
    {
      p_master_order_id: masterOrderId,
      p_new_status: newStatus,
      p_changed_by: changedBy ?? null,
      p_reason: reason ?? null,
      p_metadata: metadata,
    },
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
    data: Array.isArray(result.data)
      ? result.data[0] ?? null
      : result.data,
    error: null,
  };
}

export async function transitionSubOrderStatus(
  subOrderId: string,
  newStatus: SubOrderStatus,
  env: OrderStateMachineEnv,
  changedBy?: string | null,
  reason?: string | null,
  metadata: Record<string, unknown> = {},
): Promise<OrderStateMachineResult<OrderTransitionResult>> {
  const result = await servicePost<OrderTransitionResult[]>(
    "/rest/v1/rpc/transition_sub_order_status",
    env,
    {
      p_sub_order_id: subOrderId,
      p_new_status: newStatus,
      p_changed_by: changedBy ?? null,
      p_reason: reason ?? null,
      p_metadata: metadata,
    },
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
    data: Array.isArray(result.data)
      ? result.data[0] ?? null
      : result.data,
    error: null,
  };
}

export function transitionFailureMessage(
  error: string | null,
): string {
  if (!error) {
    return "Order transition failed";
  }

  if (error.includes("INVALID_MASTER_ORDER_TRANSITION")) {
    return "Invalid master order status transition";
  }

  if (error.includes("INVALID_SUB_ORDER_TRANSITION")) {
    return "Invalid sub-order status transition";
  }

  if (error.includes("ORDER_STATUS_UNCHANGED")) {
    return "Order is already in the requested status";
  }

  if (
    error.includes("MASTER_ORDER_NOT_FOUND") ||
    error.includes("SUB_ORDER_NOT_FOUND")
  ) {
    return "Order not found";
  }

  return error;
}
