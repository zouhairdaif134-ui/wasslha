/**
 * WASSLHA
 * Address Service
 *
 * Server-side customer address operations.
 *
 * Berrechid MVP.
 */

import {
  databaseGet,
  databaseInsert,
  databaseUpdate,
  databaseDelete,
  type DatabaseEnv,
} from "../lib/database";

export interface AddressServiceEnv
  extends DatabaseEnv {}

export interface UserAddress {
  id: string;
  user_id: string;
  label?: string | null;
  address_text: string;
  apartment?: string | null;
  floor?: string | null;
  landmark?: string | null;
  delivery_note?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AddressServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function getUserAddresses(
  userId: string,
  env: AddressServiceEnv,
  accessToken: string,
): Promise<
  AddressServiceResult<UserAddress[]>
> {
  const result =
    await databaseGet<UserAddress[]>(
      `/rest/v1/addresses` +
        `?select=*` +
        `&user_id=eq.${encodeURIComponent(
          userId,
        )}` +
        `&order=is_default.desc,created_at.desc`,
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

export async function createUserAddress(
  userId: string,
  env: AddressServiceEnv,
  accessToken: string,
  address: Omit<
    UserAddress,
    "id" |
      "user_id" |
      "created_at" |
      "updated_at"
  >,
): Promise<
  AddressServiceResult<UserAddress>
> {
  const result =
    await databaseInsert<UserAddress[]>(
      `/rest/v1/addresses`,
      env,
      {
        ...address,
        user_id: userId,
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

export async function updateUserAddress(
  addressId: string,
  userId: string,
  env: AddressServiceEnv,
  accessToken: string,
  updates: Partial<
    Pick<
      UserAddress,
      | "label"
      | "address_text"
      | "apartment"
      | "floor"
      | "landmark"
      | "delivery_note"
      | "latitude"
      | "longitude"
      | "is_default"
      | "is_active"
    >
  >,
): Promise<
  AddressServiceResult<UserAddress>
> {
  const result =
    await databaseUpdate<UserAddress[]>(
      `/rest/v1/addresses` +
        `?id=eq.${encodeURIComponent(
          addressId,
        )}` +
        `&user_id=eq.${encodeURIComponent(
          userId,
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

export async function deleteUserAddress(
  addressId: string,
  userId: string,
  env: AddressServiceEnv,
  accessToken: string,
): Promise<
  AddressServiceResult<boolean>
> {
  const result =
    await databaseDelete<unknown>(
      `/rest/v1/addresses` +
        `?id=eq.${encodeURIComponent(
          addressId,
        )}` +
        `&user_id=eq.${encodeURIComponent(
          userId,
        )}`,
      env,
      accessToken,
    );

  if (result.error) {
    return {
      success: false,
      data: false,
      error: result.error,
    };
  }

  return {
    success: true,
    data: true,
    error: null,
  };
}
