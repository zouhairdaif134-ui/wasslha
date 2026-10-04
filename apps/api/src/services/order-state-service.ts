import { servicePost, type ServiceAuthEnv } from "../lib/service-client";

export interface OrderStateServiceEnv extends ServiceAuthEnv {}

export interface OrderTransitionResult {
  id: string;
  old_status: string;
  new_status: string;
  master_order_id?: string;
}

export async function transitionMasterOrder(
  orderId: string,
  newStatus: string,
  changedBy: string,
  reason: string | null,
  metadata: Record<string, unknown> = {},
  env: OrderStateServiceEnv,
) {
  return servicePost<OrderTransitionResult>(
    "/rest/v1/rpc/transition_master_order_status",
    env,
    {
      p_master_order_id: orderId,
      p_new_status: newStatus,
      p_changed_by: changedBy,
      p_reason: reason,
      p_metadata: metadata,
    },
  );
}

export async function transitionSubOrder(
  subOrderId: string,
  newStatus: string,
  changedBy: string,
  reason: string | null,
  metadata: Record<string, unknown> = {},
  env: OrderStateServiceEnv,
) {
  return servicePost<OrderTransitionResult>(
    "/rest/v1/rpc/transition_sub_order_status",
    env,
    {
      p_sub_order_id: subOrderId,
      p_new_status: newStatus,
      p_changed_by: changedBy,
      p_reason: reason,
      p_metadata: metadata,
    },
  );
}
