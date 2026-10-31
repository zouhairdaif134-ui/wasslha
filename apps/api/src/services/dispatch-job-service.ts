import { servicePost, type ServiceAuthEnv } from "../lib/service-client";

export interface DispatchJobEnv extends ServiceAuthEnv {
  ENVIRONMENT: string;
}

// A rider whose app stopped reporting a position for this long is no longer "online".
const STALE_ONLINE_MINUTES = 10;

// Housekeeping that must never block dispatching: a failure here is logged and the job goes on.
async function housekeeping(env: DispatchJobEnv): Promise<void> {
  const expired = await servicePost<number>(
    "/rest/v1/rpc/rider_expire_stale_online",
    env,
    { p_stale_minutes: STALE_ONLINE_MINUTES },
  );

  if (expired.error) {
    console.error("WASSLHA stale rider cleanup failed", {
      environment: env.ENVIRONMENT,
      error: expired.error,
    });
  } else if (typeof expired.data === "number" && expired.data > 0) {
    console.log("WASSLHA riders set offline (no position reported)", {
      environment: env.ENVIRONMENT,
      riders: expired.data,
    });
  }

  // Cancels orders the merchant never confirmed (disabled while
  // admin_settings marketplace.merchant_confirmation_timeout_minutes = 0).
  const unconfirmed = await servicePost<number>(
    "/rest/v1/rpc/expire_unconfirmed_sub_orders",
    env,
    {},
  );

  if (unconfirmed.error) {
    console.error("WASSLHA unconfirmed order cleanup failed", {
      environment: env.ENVIRONMENT,
      error: unconfirmed.error,
    });
  } else if (typeof unconfirmed.data === "number" && unconfirmed.data > 0) {
    console.log("WASSLHA unconfirmed orders cancelled (merchant did not respond)", {
      environment: env.ENVIRONMENT,
      orders: unconfirmed.data,
    });
  }
}

export async function runDispatchJob(env: DispatchJobEnv): Promise<void> {
  await housekeeping(env);

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
