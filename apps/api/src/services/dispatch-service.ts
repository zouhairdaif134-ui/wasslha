import { servicePost, type ServiceAuthEnv } from "../lib/service-client";

export interface DispatchEnv extends ServiceAuthEnv {}

export interface DispatchResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

interface DispatchAssignmentResult {
  assignment_id: string;
  delivery_id: string;
  rider_id: string;
  status: string;
  delivery_status?: string;
}

export async function offerDelivery(
  deliveryId: string,
  riderId: string,
  assignedBy: string,
  env: DispatchEnv,
): Promise<DispatchResult<DispatchAssignmentResult>> {
  const result = await servicePost<DispatchAssignmentResult[]>(
    "/rest/v1/rpc/dispatch_offer_delivery",
    env,
    {
      p_delivery_id: deliveryId,
      p_rider_id: riderId,
      p_assigned_by: assignedBy,
    },
  );

  if (result.error) {
    return { success: false, data: null, error: result.error };
  }

  return { success: true, data: result.data?.[0] ?? null, error: null };
}

export async function respondToAssignment(
  assignmentId: string,
  riderId: string,
  status: "accepted" | "rejected",
  env: DispatchEnv,
): Promise<DispatchResult<DispatchAssignmentResult>> {
  const result = await servicePost<DispatchAssignmentResult[]>(
    "/rest/v1/rpc/dispatch_respond_to_assignment",
    env,
    {
      p_assignment_id: assignmentId,
      p_rider_id: riderId,
      p_status: status,
    },
  );

  if (result.error) {
    return { success: false, data: null, error: result.error };
  }

  return { success: true, data: result.data?.[0] ?? null, error: null };
}
