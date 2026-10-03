/**
 * WASSLHA
 * Rider Service
 *
 * Server-side rider profile and vehicle operations.
 *
 * Berrechid MVP.
 */

import {
  databaseGet,
  databaseUpdate,
  databaseInsert,
  type DatabaseEnv,
} from "../lib/database";

export interface RiderServiceEnv
  extends DatabaseEnv {}

export interface Rider {
  id: string;
  status?: string | null;
  vehicle_type?: string | null;
  vehicle_plate?: string | null;
  national_id_last4?: string | null;
  is_online?: boolean;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RiderVehicle {
  id: string;
  rider_id: string;
  vehicle_type: string;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  plate_number?: string | null;
  is_primary?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RiderServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function getRider(
  riderId: string,
  env: RiderServiceEnv,
  accessToken: string,
): Promise<
  RiderServiceResult<Rider | null>
> {
  const result =
    await databaseGet<Rider[]>(
      `/rest/v1/riders` +
        `?select=*` +
        `&id=eq.${encodeURIComponent(
          riderId,
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

export async function getRiderVehicles(
  riderId: string,
  env: RiderServiceEnv,
  accessToken: string,
): Promise<
  RiderServiceResult<RiderVehicle[]>
> {
  const result =
    await databaseGet<RiderVehicle[]>(
      `/rest/v1/vehicles` +
        `?select=*` +
        `&rider_id=eq.${encodeURIComponent(
          riderId,
        )}` +
        `&order=is_primary.desc,created_at.desc`,
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

export async function createRiderVehicle(
  riderId: string,
  env: RiderServiceEnv,
  accessToken: string,
  vehicle: Omit<
    RiderVehicle,
    "id" |
      "rider_id" |
      "created_at" |
      "updated_at"
  >,
): Promise<
  RiderServiceResult<RiderVehicle | null>
> {
  const result =
    await databaseInsert<RiderVehicle[]>(
      `/rest/v1/vehicles`,
      env,
      {
        ...vehicle,
        rider_id: riderId,
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

export async function updateRider(
  riderId: string,
  env: RiderServiceEnv,
  accessToken: string,
  updates: Partial<
    Pick<
      Rider,
      | "vehicle_type"
      | "vehicle_plate"
      | "is_online"
    >
  >,
): Promise<
  RiderServiceResult<Rider | null>
> {
  const result =
    await databaseUpdate<Rider[]>(
      `/rest/v1/riders` +
        `?id=eq.${encodeURIComponent(
          riderId,
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
