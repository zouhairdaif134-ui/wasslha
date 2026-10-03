/**
 * WASSLHA
 * User Service
 *
 * Server-side user profile operations.
 *
 * Berrechid MVP.
 */

import { databaseGet, databaseUpdate, type DatabaseEnv } from "../lib/database";

export interface UserServiceEnv extends DatabaseEnv {}

export interface UserProfile {
  id: string;
  phone?: string | null;
  full_name?: string | null;
  preferred_language?: "ar" | "fr" | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function getUserProfile(
  userId: string,
  env: UserServiceEnv,
  accessToken: string,
): Promise<UserServiceResult<UserProfile>> {
  const result = await databaseGet<UserProfile[]>(
    `/rest/v1/users?select=*&id=eq.${encodeURIComponent(userId)}&limit=1`,
    env,
    accessToken,
  );

  if (result.error) return { success: false, data: null, error: result.error };
  const profile = result.data?.[0] ?? null;
  if (!profile) return { success: false, data: null, error: "User profile not found" };
  return { success: true, data: profile, error: null };
}

export async function updateUserProfile(
  userId: string,
  env: UserServiceEnv,
  accessToken: string,
  updates: Partial<Pick<UserProfile, "full_name" | "phone" | "preferred_language">>,
): Promise<UserServiceResult<UserProfile | null>> {
  const result = await databaseUpdate<UserProfile[]>(
    `/rest/v1/users?id=eq.${encodeURIComponent(userId)}`,
    env,
    updates,
    accessToken,
  );
  if (result.error) return { success: false, data: null, error: result.error };
  return { success: true, data: result.data?.[0] ?? null, error: null };
}
