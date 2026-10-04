import { servicePost, type ServiceAuthEnv } from "../lib/service-client";

export interface OrderTransitionEnv extends ServiceAuthEnv {}

export interface OrderTransitionResult {
  id: string;
  master_order_id?: string;
  old_status: string;
  new_status: string;
}

export async function transitionMasterOrder(
  masterOrderId: string,
  newStatus: string,
  changedBy: string,
  reason: string | null,
  metadata: Record<string, unknown>,
  env: OrderTransitionEnv,
): Promise<{ success: boolean; data: OrderTransitionResult | null; error: string | null }> {
  const result = await servicePost<OrderTransitionResult>(
    "/rest/v1/rpc/transition_master_order_status",
    env,
    {
      p_master_order_id: masterOrderId,
      p_new_status: newStatus,
      p_changed_by: changedBy,
      p_reason: reason,
      p_metadata: metadata,
    },
  );
  return { success: !result.error, data: result.data, error: result.error };
}

export async function transitionSubOrder(
  subOrderId: string,
  newStatus: string,
  changedBy: string,
  reason: string | null,
  metadata: Record<string, unknown>,
  env: OrderTransitionEnv,
): Promise<{ success: boolean; data: OrderTransitionResult | null; error: string | null }> {
  const result = await servicePost<OrderTransitionResult>(
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
  return { success: !result.error, data: result.data, error: result.error };
}
