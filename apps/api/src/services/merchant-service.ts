/**
 * WASSLHA
 * Merchant Service
 *
 * Server-side merchant profile operations.
 *
 * Berrechid MVP.
 */

import {
  databaseGet,
  databaseUpdate,
  type DatabaseEnv,
} from "../lib/database";

export interface MerchantServiceEnv
  extends DatabaseEnv {}

export interface Merchant {
  id: string;
  owner_user_id: string;
  business_name?: string | null;
  description?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MerchantServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function getMerchantByOwner(
  userId: string,
  env: MerchantServiceEnv,
  accessToken: string,
): Promise<
  MerchantServiceResult<Merchant | null>
> {
  const result =
    await databaseGet<Merchant[]>(
      `/rest/v1/merchants` +
        `?select=*` +
        `&owner_user_id=eq.${encodeURIComponent(
          userId,
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

export async function getMerchant(
  merchantId: string,
  env: MerchantServiceEnv,
  accessToken: string,
): Promise<
  MerchantServiceResult<Merchant | null>
> {
  const result =
    await databaseGet<Merchant[]>(
      `/rest/v1/merchants` +
        `?select=*` +
        `&id=eq.${encodeURIComponent(
          merchantId,
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

export async function updateMerchant(
  merchantId: string,
  env: MerchantServiceEnv,
  accessToken: string,
  updates: Partial<
    Pick<
      Merchant,
      | "business_name"
      | "description"
      | "phone"
      | "logo_url"
    >
  >,
): Promise<
  MerchantServiceResult<Merchant | null>
> {
  const result =
    await databaseUpdate<Merchant[]>(
      `/rest/v1/merchants` +
        `?id=eq.${encodeURIComponent(
          merchantId,
        )}`,
      env,
      updates,
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
