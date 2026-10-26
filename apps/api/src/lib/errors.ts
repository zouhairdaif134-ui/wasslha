/**
 * WASSLHA
 * Backend API Error Foundation
 *
 * Centralized application errors for the API.
 * Keeps HTTP error responses consistent across modules.
 *
 * Berrechid MVP.
 */

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "UNPROCESSABLE_ENTITY"
  | "INTERNAL_SERVER_ERROR"
  | "SERVICE_UNAVAILABLE";

export interface ApiErrorDetails {
  field?: string;
  value?: unknown;
  reason?: string;
}

export interface ApiErrorPayload {
  code: ApiErrorCode;
  message: string;
  details?: ApiErrorDetails[];
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: ApiErrorDetails[];

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details: ApiErrorDetails[] = [],
  ) {
    super(message);

    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function badRequest(
  message = "Bad request",
  details: ApiErrorDetails[] = [],
): ApiError {
  return new ApiError(
    "BAD_REQUEST",
    message,
    400,
    details,
  );
}

export function unauthorized(
  message = "Authentication required",
): ApiError {
  return new ApiError(
    "UNAUTHORIZED",
    message,
    401,
  );
}

export function forbidden(
  message = "Access denied",
): ApiError {
  return new ApiError(
    "FORBIDDEN",
    message,
    403,
  );
}

export function notFound(
  message = "Resource not found",
): ApiError {
  return new ApiError(
    "NOT_FOUND",
    message,
    404,
  );
}

export function conflict(
  message = "Resource conflict",
): ApiError {
  return new ApiError(
    "CONFLICT",
    message,
    409,
  );
}

export function validationError(
  message = "Request validation failed",
  details: ApiErrorDetails[] = [],
): ApiError {
  return new ApiError(
    "VALIDATION_ERROR",
    message,
    422,
    details,
  );
}

export function rateLimited(
  message = "Too many requests",
): ApiError {
  return new ApiError(
    "RATE_LIMITED",
    message,
    429,
  );
}

export function serviceUnavailable(
  message = "Service temporarily unavailable",
): ApiError {
  return new ApiError(
    "SERVICE_UNAVAILABLE",
    message,
    503,
  );
}

export function internalServerError(
  message = "An unexpected error occurred",
): ApiError {
  return new ApiError(
    "INTERNAL_SERVER_ERROR",
    message,
    500,
  );
}

export function isApiError(
  error: unknown,
): error is ApiError {
  return error instanceof ApiError;
}

export function toApiError(
  error: unknown,
): ApiError {
  if (isApiError(error)) {
    return error;
  }

  // Routers build errors as plain { code, message, status } objects (their local `fail()` helpers).
  // Those used to fall through to a generic 500 "An unexpected error occurred", hiding the real
  // status and message from every client. Keep them as the intended error instead.
  if (error && typeof error === "object" && !(error instanceof Error)) {
    const candidate = error as {
      code?: unknown;
      message?: unknown;
      status?: unknown;
    };

    if (
      typeof candidate.code === "string" &&
      typeof candidate.message === "string" &&
      typeof candidate.status === "number" &&
      Number.isInteger(candidate.status) &&
      candidate.status >= 400 &&
      candidate.status <= 599
    ) {
      return new ApiError(
        candidate.code as ApiErrorCode,
        candidate.message,
        candidate.status,
      );
    }
  }

  if (error instanceof Error) {
    return internalServerError(
      error.message ||
        "An unexpected error occurred",
    );
  }

  return internalServerError();
}

export function toApiErrorPayload(
  error: ApiError,
): ApiErrorPayload {
  return {
    code: error.code,
    message: error.message,
    ...(error.details.length > 0
      ? {
          details: error.details,
        }
      : {}),
  };
}
