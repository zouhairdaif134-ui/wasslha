/**
 * WASSLHA
 * Backend Query Helpers
 *
 * Safe helpers for building URL query parameters
 * used by API modules.
 *
 * Berrechid MVP.
 */

export function getQueryParam(
  request: Request,
  name: string,
): string | null {
  const url =
    new URL(request.url);

  const value =
    url.searchParams.get(name);

  if (
    value === null ||
    value.trim().length === 0
  ) {
    return null;
  }

  return value.trim();
}

export function getQueryParamOrDefault(
  request: Request,
  name: string,
  defaultValue: string,
): string {
  return (
    getQueryParam(
      request,
      name,
    ) ?? defaultValue
  );
}

export function getBooleanQueryParam(
  request: Request,
  name: string,
): boolean | null {
  const value =
    getQueryParam(
      request,
      name,
    );

  if (value === null) {
    return null;
  }

  const normalized =
    value.toLowerCase();

  if (
    normalized === "true" ||
    normalized === "1"
  ) {
    return true;
  }

  if (
    normalized === "false" ||
    normalized === "0"
  ) {
    return false;
  }

  return null;
}

export function getIntegerQueryParam(
  request: Request,
  name: string,
): number | null {
  const value =
    getQueryParam(
      request,
      name,
    );

  if (value === null) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed)
  ) {
    return null;
  }

  return parsed;
}

export function getQueryParams(
  request: Request,
): URLSearchParams {
  return new URL(
    request.url,
  ).searchParams;
}
