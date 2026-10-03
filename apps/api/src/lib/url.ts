/**
 * WASSLHA
 * Backend URL Helpers
 *
 * Centralized URL and API path helpers.
 *
 * Berrechid MVP.
 */

import {
  API_PREFIX,
} from "./constants";

export function getRequestUrl(
  request: Request,
): URL {
  return new URL(
    request.url,
  );
}

export function getRequestPath(
  request: Request,
): string {
  return getRequestUrl(
    request,
  ).pathname;
}

export function getRequestSearchParams(
  request: Request,
): URLSearchParams {
  return getRequestUrl(
    request,
  ).searchParams;
}

export function isApiPath(
  path: string,
): boolean {
  return (
    path === API_PREFIX ||
    path.startsWith(
      `${API_PREFIX}/`,
    )
  );
}

export function buildApiPath(
  path: string,
): string {
  const normalized =
    path.trim();

  if (
    normalized.length === 0
  ) {
    return API_PREFIX;
  }

  const withoutLeadingSlash =
    normalized.replace(
      /^\/+/,
      "",
    );

  return `${API_PREFIX}/${withoutLeadingSlash}`;
}
