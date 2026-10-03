/**
 * WASSLHA
 * Backend Content-Type Helpers
 *
 * Centralized validation helpers for API request
 * content types.
 *
 * Berrechid MVP.
 */

import {
  badRequest,
} from "./errors";

export function getContentType(
  request: Request,
): string | null {
  const value =
    request.headers.get(
      "Content-Type",
    );

  if (
    value === null ||
    value.trim().length === 0
  ) {
    return null;
  }

  return value.trim().toLowerCase();
}

export function isJsonContentType(
  contentType: string | null,
): boolean {
  if (!contentType) {
    return false;
  }

  return contentType.includes(
    "application/json",
  );
}

export function requireJsonContentType(
  request: Request,
): void {
  const contentType =
    getContentType(request);

  if (
    !isJsonContentType(
      contentType,
    )
  ) {
    throw badRequest(
      "Content-Type must be application/json",
    );
  }
}

export function isFormDataContentType(
  contentType: string | null,
): boolean {
  if (!contentType) {
    return false;
  }

  return contentType.includes(
    "multipart/form-data",
  );
}

export function isUrlEncodedContentType(
  contentType: string | null,
): boolean {
  if (!contentType) {
    return false;
  }

  return contentType.includes(
    "application/x-www-form-urlencoded",
  );
}
