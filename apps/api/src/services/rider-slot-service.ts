/**
 * WASSLHA
 * Rider Slot Service
 *
 * Slot availability, waitlist and attendance reads/writes.
 * Privileged attendance changes remain backend-controlled.
 *
 * Berrechid MVP.
 */

import {
  databaseGet,
  databaseInsert,
  databaseUpdate,
  type DatabaseEnv,
} from "../lib/database";

export interface RiderSlotServiceEnv extends DatabaseEnv {}

export interface RiderSlot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  status: "open" | "closed" | "cancelled";
  created_at?: string;
  updated_at?: string;
}

export interface SlotWaitlistEntry {
  id: string;
  slot_id: string;
  rider_id: string;
  position?: number | null;
  status: "waiting" | "accepted" | "expired" | "cancelled";
  joined_at: string;
  resolved_at?: string | null;
}

export interface SlotAttendance {
  id: string;
  slot_id: string;
  rider_id: string;
  status:
    | "scheduled"
    | "checked_in"
    | "late"
    | "absent"
    | "completed"
    | "cancelled";
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RiderSlotServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function getOpenRiderSlots(
  env: RiderSlotServiceEnv,
  accessToken: string,
  fromDate?: string,
): Promise<RiderSlotServiceResult<RiderSlot[]>> {
  const dateFilter = fromDate
    ? `&slot_date=gte.${encodeURIComponent(fromDate)}`
    : "";

  const result = await databaseGet<RiderSlot[]>(
    `/rest/v1/rider_slots?select=*&status=eq.open${dateFilter}&order=slot_date.asc,start_time.asc`,
    env,
    accessToken,
  );

  if (result.error) {
    return { success: false, data: null, error: result.error };
  }

  return { success: true, data: result.data ?? [], error: null };
}

export async function getRiderSlot(
  slotId: string,
  env: RiderSlotServiceEnv,
  accessToken: string,
): Promise<RiderSlotServiceResult<RiderSlot | null>> {
  const result = await databaseGet<RiderSlot[]>(
    `/rest/v1/rider_slots?select=*&id=eq.${encodeURIComponent(slotId)}&limit=1`,
    env,
    accessToken,
  );

  if (result.error) {
    return { success: false, data: null, error: result.error };
  }

  return { success: true, data: result.data?.[0] ?? null, error: null };
}

export async function joinSlotWaitlist(
  slotId: string,
  riderId: string,
  env: RiderSlotServiceEnv,
  accessToken: string,
): Promise<RiderSlotServiceResult<SlotWaitlistEntry | null>> {
  const result = await databaseInsert<SlotWaitlistEntry[]>(
    "/rest/v1/slot_waitlist",
    env,
    {
      slot_id: slotId,
      rider_id: riderId,
      status: "waiting",
    },
    accessToken,
  );

  if (result.error) {
    return { success: false, data: null, error: result.error };
  }

  return { success: true, data: result.data?.[0] ?? null, error: null };
}

export async function getRiderWaitlist(
  riderId: string,
  env: RiderSlotServiceEnv,
  accessToken: string,
): Promise<RiderSlotServiceResult<SlotWaitlistEntry[]>> {
  const result = await databaseGet<SlotWaitlistEntry[]>(
    `/rest/v1/slot_waitlist?select=*&rider_id=eq.${encodeURIComponent(riderId)}&order=joined_at.desc`,
    env,
    accessToken,
  );

  if (result.error) {
    return { success: false, data: null, error: result.error };
  }

  return { success: true, data: result.data ?? [], error: null };
}

export async function getRiderAttendance(
  riderId: string,
  env: RiderSlotServiceEnv,
  accessToken: string,
): Promise<RiderSlotServiceResult<SlotAttendance[]>> {
  const result = await databaseGet<SlotAttendance[]>(
    `/rest/v1/slot_attendance?select=*&rider_id=eq.${encodeURIComponent(riderId)}&order=created_at.desc`,
    env,
    accessToken,
  );

  if (result.error) {
    return { success: false, data: null, error: result.error };
  }

  return { success: true, data: result.data ?? [], error: null };
}

export async function updateOwnWaitlistStatus(
  waitlistId: string,
  riderId: string,
  status: "cancelled",
  env: RiderSlotServiceEnv,
  accessToken: string,
): Promise<RiderSlotServiceResult<SlotWaitlistEntry | null>> {
  const result = await databaseUpdate<SlotWaitlistEntry[]>(
    `/rest/v1/slot_waitlist?id=eq.${encodeURIComponent(waitlistId)}&rider_id=eq.${encodeURIComponent(riderId)}&status=eq.waiting`,
    env,
    { status, resolved_at: new Date().toISOString() },
    accessToken,
  );

  if (result.error) {
    return { success: false, data: null, error: result.error };
  }

  return { success: true, data: result.data?.[0] ?? null, error: null };
}
