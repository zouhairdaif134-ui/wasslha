/**
 * WASSLHA
 * Backend Database Helpers
 *
 * Centralized database helpers for server-side
 * Supabase operations.
 *
 * Berrechid MVP.
 */

import {
  supabaseGet,
  supabasePost,
  supabasePatch,
  supabaseDelete,
  type SupabaseEnv,
  type SupabaseResult,
} from "./supabase";

export interface DatabaseEnv
  extends SupabaseEnv {}

export async function databaseGet<T>(
  path: string,
  env: DatabaseEnv,
  accessToken?: string,
): Promise<SupabaseResult<T>> {
  return supabaseGet<T>(
    path,
    env,
    accessToken,
  );
}

export async function databaseInsert<T>(
  path: string,
  env: DatabaseEnv,
  data: unknown,
  accessToken?: string,
): Promise<SupabaseResult<T>> {
  return supabasePost<T>(
    path,
    env,
    data,
    accessToken,
  );
}

export async function databaseUpdate<T>(
  path: string,
  env: DatabaseEnv,
  data: unknown,
  accessToken?: string,
): Promise<SupabaseResult<T>> {
  return supabasePatch<T>(
    path,
    env,
    data,
    accessToken,
  );
}

export async function databaseDelete<T>(
  path: string,
  env: DatabaseEnv,
  accessToken?: string,
): Promise<SupabaseResult<T>> {
  return supabaseDelete<T>(
    path,
    env,
    accessToken,
  );
}

export function databaseError(
  result: SupabaseResult<unknown>,
): Error | null {
  if (!result.error) {
    return null;
  }

  return new Error(
    result.error,
  );
}
