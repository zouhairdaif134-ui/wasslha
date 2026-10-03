/**
 * WASSLHA
 * Store Service
 *
 * Server-side merchant store operations.
 *
 * Berrechid MVP.
 */

import {
  databaseGet,
  databaseInsert,
  databaseUpdate,
  type DatabaseEnv,
} from "../lib/database";

export interface StoreServiceEnv
  extends DatabaseEnv {}

export interface Store {
  id: string;
  merchant_id: string;
  name?: string | null;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StoreServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function getMerchantStores(
  merchantId: string,
  env: StoreServiceEnv,
  accessToken: string,
): Promise<
  StoreServiceResult<Store[]>
> {
  const result =
    await databaseGet<Store[]>(
      `/rest/v1/stores` +
        `?select=*` +
        `&merchant_id=eq.${encodeURIComponent(
          merchantId,
        )}` +
        `&order=created_at.desc`,
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
    data: result.data ?? [],
    error: null,
  };
}

export async function getStore(
  storeId: string,
  env: StoreServiceEnv,
  accessToken: string,
): Promise<
  StoreServiceResult<Store | null>
> {
  const result =
    await databaseGet<Store[]>(
      `/rest/v1/stores` +
        `?select=*` +
        `&id=eq.${encodeURIComponent(
          storeId,
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

export async function createStore(
  merchantId: string,
  env: StoreServiceEnv,
  accessToken: string,
  store: Omit<
    Store,
    "id" |
      "merchant_id" |
      "created_at" |
      "updated_at"
  >,
): Promise<
  StoreServiceResult<Store | null>
> {
  const result =
    await databaseInsert<Store[]>(
      `/rest/v1/stores`,
      env,
      {
        ...store,
        merchant_id:
          merchantId,
      },
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

export async function updateStore(
  storeId: string,
  merchantId: string,
  env: StoreServiceEnv,
  accessToken: string,
  updates: Partial<
    Pick<
      Store,
      | "name"
      | "description"
      | "address"
      | "latitude"
      | "longitude"
      | "phone"
      | "is_active"
    >
  >,
): Promise<
  StoreServiceResult<Store | null>
> {
  const result =
    await databaseUpdate<Store[]>(
      `/rest/v1/stores` +
        `?id=eq.${encodeURIComponent(
          storeId,
        )}` +
        `&merchant_id=eq.${encodeURIComponent(
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
