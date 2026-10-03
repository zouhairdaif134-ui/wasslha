/**
 * WASSLHA
 * Backend HTTP Header Helpers
 *
 * Centralized helpers for reading and writing
 * standard API headers.
 *
 * Berrechid MVP.
 */

import {
  REQUEST_ID_HEADER,
} from "./constants";

export function getHeader(
  request: Request,
  name: string,
): string | null {
  const value =
    request.headers.get(name);

  if (
    value === null ||
    value.trim().length === 0
  ) {
    return null;
  }

  return value.trim();
}

export function setHeader(
  headers: Headers,
  name: string,
  value: string,
): void {
  headers.set(
    name,
    value,
  );
}

export function setRequestIdHeader(
  headers: Headers,
  requestId: string,
): void {
  setHeader(
    headers,
    REQUEST_ID_HEADER,
    requestId,
  );
}

export function getContentType(
  request: Request,
): string | null {
  return getHeader(
    request,
    "Content-Type",
  );
}

export function isJsonRequest(
  request: Request,
): boolean {
  const contentType =
    getContentType(request);

  if (!contentType) {
    return false;
  }

  return contentType
    .toLowerCase()
    .includes(
      "application/json",
    );
}
