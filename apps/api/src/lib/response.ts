/**
 * WASSLHA
 * Backend HTTP Response Foundation
 *
 * Centralized HTTP response helpers for the API.
 * Keeps response formatting consistent across modules.
 *
 * Berrechid MVP.
 */

import {
  isApiError,
  toApiError,
  toApiErrorPayload,
  type ApiError,
} from "./errors";

export interface JsonResponseOptions {
  status?: number;
  requestId?: string;
  headers?: Record<string, string>;
}

export function jsonResponse(
  data: unknown,
  options: JsonResponseOptions = {},
): Response {
  const headers = new Headers({
    "Content-Type":
      "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  if (options.requestId) {
    headers.set(
      "X-Request-ID",
      options.requestId,
    );
  }

  if (options.headers) {
    for (const [key, value] of Object.entries(
      options.headers,
    )) {
      headers.set(key, value);
    }
  }

  return new Response(
    JSON.stringify(data),
    {
      status: options.status ?? 200,
      headers,
    },
  );
}

export function successResponse<T>(
  data: T,
  options: JsonResponseOptions = {},
): Response {
  return jsonResponse(
    {
      success: true,
      data,
    },
    options,
  );
}

export function errorResponse(
  error: ApiError | unknown,
  requestId?: string,
): Response {
  const apiError = toApiError(error);

  return jsonResponse(
    {
      success: false,
      error: toApiErrorPayload(
        apiError,
      ),
      ...(requestId
        ? {
            request_id: requestId,
          }
        : {}),
    },
    {
      status: apiError.status,
      requestId,
    },
  );
}

export function emptyResponse(
  status = 204,
  requestId?: string,
): Response {
  const headers = new Headers();

  if (requestId) {
    headers.set(
      "X-Request-ID",
      requestId,
    );
  }

  return new Response(null, {
    status,
    headers,
  });
}

export function methodNotAllowedResponse(
  allowedMethods: string[],
  requestId?: string,
): Response {
  return jsonResponse(
    {
      success: false,
      error: {
        code: "BAD_REQUEST",
        message:
          "HTTP method not allowed",
      },
    },
    {
      status: 405,
      requestId,
      headers: {
        Allow: allowedMethods.join(", "),
      },
    },
  );
}

export function addCorsHeaders(
  response: Response,
): Response {
  const headers = new Headers(
    response.headers,
  );

  headers.set(
    "Access-Control-Allow-Origin",
    "*",
  );

  headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );

  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Request-ID, Idempotency-Key",
  );

  headers.set(
    "Access-Control-Max-Age",
    "86400",
  );

  return new Response(
    response.body,
    {
      status: response.status,
      statusText: response.statusText,
      headers,
    },
  );
}

export function handleApiError(
  error: unknown,
  requestId?: string,
): Response {
  if (isApiError(error)) {
    return errorResponse(
      error,
      requestId,
    );
  }

  console.error(
    "Unhandled API error",
    {
      requestId,
      error,
    },
  );

  return errorResponse(
    error,
    requestId,
  );
}
