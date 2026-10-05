import { servicePost, type ServiceAuthEnv } from "../lib/service-client";

export interface DispatchJobEnv extends ServiceAuthEnv {
  ENVIRONMENT: string;
}

export async function runDispatchJob(env: DispatchJobEnv): Promise<void> {
  const result = await servicePost<{ assigned: number; expired_offers: number }>(
    "/rest/v1/rpc/dispatch_auto_assign_pending",
    env,
    { p_limit: 20, p_offer_timeout_seconds: 120 },
  );

  if (result.error) {
    console.error("WASSLHA dispatch job failed", {
      environment: env.ENVIRONMENT,
      error: result.error,
    });
    return;
  }

  console.log("WASSLHA dispatch job completed", {
    environment: env.ENVIRONMENT,
    assigned: result.data?.assigned ?? 0,
    expired_offers: result.data?.expired_offers ?? 0,
  });
}
