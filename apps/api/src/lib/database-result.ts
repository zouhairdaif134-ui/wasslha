/**
 * WASSLHA
 * Backend Database Result Helpers
 *
 * Centralized helpers for handling database operation
 * results consistently across backend services.
 *
 * Berrechid MVP.
 */

import type {
  SupabaseResult,
} from "./supabase";

export interface DatabaseResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  status: number;
}

export function toDatabaseResult<T>(
  result: SupabaseResult<T>,
): DatabaseResult<T> {
  return {
    success:
      result.error === null &&
      result.status >= 200 &&
      result.status < 300,
    data:
      result.error === null
        ? result.data
        : null,
    error:
      result.error,
    status:
      result.status,
  };
}

export function isDatabaseSuccess<T>(
  result: DatabaseResult<T>,
): boolean {
  return (
    result.success &&
    result.error === null
  );
}

export function isDatabaseFailure<T>(
  result: DatabaseResult<T>,
): boolean {
  return !isDatabaseSuccess(
    result,
  );
}

export function requireDatabaseSuccess<T>(
  result: DatabaseResult<T>,
): T {
  if (
    !isDatabaseSuccess(result) ||
    result.data === null
  ) {
    throw new Error(
      result.error ||
        "Database operation failed",
    );
  }

  return result.data;
}

export function getDatabaseError(
  result: DatabaseResult<unknown>,
): string | null {
  return result.error;
}

export function getDatabaseStatus(
  result: DatabaseResult<unknown>,
): number {
  return result.status;
}
