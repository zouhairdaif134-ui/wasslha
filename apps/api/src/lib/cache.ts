/**
 * WASSLHA
 * Backend Cache-Control Helpers
 *
 * Centralized helpers for controlling HTTP caching.
 * Sensitive API responses must remain non-cacheable.
 *
 * Berrechid MVP.
 */

import {
  NO_STORE_CACHE_CONTROL,
} from "./constants";

export function setNoStore(
  headers: Headers,
): void {
  headers.set(
    "Cache-Control",
    NO_STORE_CACHE_CONTROL,
  );
}

export function setPrivateNoCache(
  headers: Headers,
): void {
  headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate",
  );
}

export function setPublicCache(
  headers: Headers,
  maxAgeSeconds: number,
): void {
  const safeMaxAge =
    Number.isInteger(
      maxAgeSeconds,
    ) &&
    maxAgeSeconds >= 0
      ? maxAgeSeconds
      : 0;

  headers.set(
    "Cache-Control",
    `public, max-age=${safeMaxAge}`,
  );
}

export function isNoStoreResponse(
  response: Response,
): boolean {
  const value =
    response.headers.get(
      "Cache-Control",
    );

  return (
    value?.toLowerCase()
      .includes("no-store") ??
    false
  );
}

export function withNoStore(
  response: Response,
): Response {
  const headers = new Headers(
    response.headers,
  );

  setNoStore(headers);

  return new Response(
    response.body,
    {
      status: response.status,
      statusText: response.statusText,
      headers,
    },
  );
}
