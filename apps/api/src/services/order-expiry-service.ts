import { servicePost, type ServiceAuthEnv } from "../lib/service-client";

/**
 * Cancels online orders that are still pending and unpaid after the time limit.
 * Runs from the scheduled handler with the service role. Never throws, so a
 * failure here cannot break the other scheduled jobs.
 */
export async function expireUnpaidOnlineOrders(env: unknown, maxAgeMinutes = 30): Promise<void> {
  try {
    const result = await servicePost<unknown>(
      "/rest/v1/rpc/expire_unpaid_online_orders",
      env as ServiceAuthEnv,
      { p_max_age_minutes: maxAgeMinutes }
    );
    if (result.error) {
      console.error("expire_unpaid_online_orders failed", result.error);
    }
  } catch (error) {
    console.error("expire_unpaid_online_orders crashed", error);
  }
}

/**
 * Records the financials (COD cash collection, rider earning, ledger) of any
 * delivered COD order that was not finalized when the delivery completed.
 * Never throws.
 */
export async function finalizeDeliveredCodOrders(env: unknown, limit = 50): Promise<void> {
  try {
    const result = await servicePost<unknown>(
      "/rest/v1/rpc/finalize_delivered_cod_orders",
      env as ServiceAuthEnv,
      { p_limit: limit }
    );
    if (result.error) {
      console.error("finalize_delivered_cod_orders failed", result.error);
    }
  } catch (error) {
    console.error("finalize_delivered_cod_orders crashed", error);
  }
}
