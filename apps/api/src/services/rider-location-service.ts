import { databaseInsert, type DatabaseEnv } from "../lib/database";

export interface RiderLocationEnv extends DatabaseEnv {}

export interface RiderLocationInput {
  delivery_id?: string | null;
  latitude: number;
  longitude: number;
  accuracy_meters?: number | null;
  speed_mps?: number | null;
  heading?: number | null;
  recorded_at?: string;
}

export interface RiderLocation {
  id: string;
  rider_id: string;
  delivery_id?: string | null;
  latitude: number;
  longitude: number;
  accuracy_meters?: number | null;
  speed_mps?: number | null;
  heading?: number | null;
  recorded_at: string;
}

export interface RiderLocationResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function recordRiderLocation(
  riderId: string,
  env: RiderLocationEnv,
  accessToken: string,
  location: RiderLocationInput,
): Promise<RiderLocationResult<RiderLocation | null>> {
  const result = await databaseInsert<RiderLocation[]>(
    "/rest/v1/rider_locations",
    env,
    {
      rider_id: riderId,
      delivery_id: location.delivery_id ?? null,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy_meters: location.accuracy_meters ?? null,
      speed_mps: location.speed_mps ?? null,
      heading: location.heading ?? null,
      recorded_at: location.recorded_at ?? new Date().toISOString(),
    },
    accessToken,
  );

  if (result.error) {
    return { success: false, data: null, error: result.error };
  }

  return { success: true, data: result.data?.[0] ?? null, error: null };
}
