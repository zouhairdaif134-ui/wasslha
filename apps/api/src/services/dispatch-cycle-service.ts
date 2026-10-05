import { servicePost, type ServiceAuthEnv } from "../lib/service-client";

export interface DispatchCycleEnv extends ServiceAuthEnv {}

export async function runDispatchCycle(
  env: DispatchCycleEnv,
  limit = 20,
  offerTimeoutSeconds = 120,
) {
  const result = await servicePost<unknown>(
    "/rest/v1/rpc/dispatch_auto_assign_pending",
    env,
    {
      p_limit: limit,
      p_offer_timeout_seconds: offerTimeoutSeconds,
    },
  );

  if (result.error) throw new Error(result.error);
  return result.data;
}
