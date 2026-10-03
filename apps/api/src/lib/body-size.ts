/**
 * WASSLHA
 * Backend Request Body Size Helpers
 *
 * Protects API endpoints from unexpectedly large
 * request bodies before JSON parsing.
 *
 * Berrechid MVP.
 */

import {
  badRequest,
} from "./errors";

const DEFAULT_MAX_BODY_SIZE =
  1024 * 1024;

export function getContentLength(
  request: Request,
): number | null {
  const value =
    request.headers.get(
      "Content-Length",
    );

  if (!value) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 0
  ) {
    return null;
  }

  return parsed;
}

export function isBodyTooLarge(
  request: Request,
  maxBytes = DEFAULT_MAX_BODY_SIZE,
): boolean {
  const contentLength =
    getContentLength(request);

  if (
    contentLength === null
  ) {
    return false;
  }

  return (
    contentLength >
    maxBytes
  );
}

export function assertBodySize(
  request: Request,
  maxBytes = DEFAULT_MAX_BODY_SIZE,
): void {
  if (
    maxBytes <= 0 ||
    !Number.isFinite(maxBytes)
  ) {
    throw badRequest(
      "Invalid maximum request body size",
    );
  }

  if (
    isBodyTooLarge(
      request,
      maxBytes,
    )
  ) {
    throw badRequest(
      "Request body is too large",
    );
  }
}

export function getDefaultMaxBodySize(): number {
  return DEFAULT_MAX_BODY_SIZE;
}
