/**
 * WASSLHA
 * Backend Service Result Helpers
 *
 * Standard result types for backend business services.
 *
 * Berrechid MVP.
 */

export interface ServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export function serviceSuccess<T>(
  data: T,
): ServiceResult<T> {
  return {
    success: true,
    data,
    error: null,
  };
}

export function serviceFailure<T>(
  error: string,
): ServiceResult<T> {
  return {
    success: false,
    data: null,
    error,
  };
}

export function isServiceSuccess<T>(
  result: ServiceResult<T>,
): boolean {
  return (
    result.success &&
    result.error === null
  );
}

export function isServiceFailure<T>(
  result: ServiceResult<T>,
): boolean {
  return !isServiceSuccess(
    result,
  );
}

export function requireServiceSuccess<T>(
  result: ServiceResult<T>,
): T {
  if (
    !isServiceSuccess(result) ||
    result.data === null
  ) {
    throw new Error(
      result.error ||
        "Service operation failed",
    );
  }

  return result.data;
}
