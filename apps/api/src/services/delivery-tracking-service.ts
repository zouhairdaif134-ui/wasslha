/**
 * WASSLHA
 * Delivery Tracking Service
 *
 * Backend-controlled GPS writes for active rider service.
 * Rider locations are never written directly by the client.
 *
 * Berrechid MVP.
 */

import {
  servicePost,
  type ServiceAuthEnv,
} from "../lib/service-client";

export interface DeliveryTrackingEnv extends ServiceAuthEnv {}

export interface RiderLocationInput {
  rider_id: string;
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

export interface DeliveryTrackingResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

function validCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export async function recordRiderLocation(
  input: RiderLocationInput,
  env: DeliveryTrackingEnv,
): Promise<DeliveryTrackingResult<RiderLocation | null>> {
  if (!validCoordinate(input.latitude, input.longitude)) {
    return {
      success: false,
      data: null,
      error: "Invalid GPS coordinates",
    };
  }

  if (
    input.accuracy_meters !== undefined &&
    input.accuracy_meters !== null &&
    (!Number.isFinite(input.accuracy_meters) ||
      input.accuracy_meters < 0)
  ) {
    return {
      success: false,
      data: null,
      error: "Invalid GPS accuracy",
    };
  }

  const result = await servicePost<RiderLocation[]>(
    "/rest/v1/rider_locations",
    env,
    {
      rider_id: input.rider_id,
      delivery_id: input.delivery_id ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy_meters: input.accuracy_meters ?? null,
      speed_mps: input.speed_mps ?? null,
      heading: input.heading ?? null,
      recorded_at: input.recorded_at ?? new Date().toISOString(),
    },
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
    data: result.data?.[0] ?? null,
    error: null,
  };
}
