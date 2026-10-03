/**
 * WASSLHA
 * Backend Rate Limit Response
 *
 * Standard HTTP 429 response for rate-limited API requests.
 *
 * Berrechid MVP.
 */

import {
  jsonResponse,
} from "./response";

export function rateLimitResponse(
  requestId?: string,
): Response {
  return jsonResponse(
    {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message:
          "Too many requests. Please try again later.",
      },
    },
    {
      status: 429,
      requestId,
      headers: {
        "Retry-After": "60",
      },
    },
  );
}
