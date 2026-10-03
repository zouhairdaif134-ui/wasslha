/**
 * WASSLHA
 * Backend Request ID Foundation
 *
 * Provides a stable request identifier for API tracing.
 *
 * Berrechid MVP.
 */

const REQUEST_ID_HEADER = "X-Request-ID";

export function getRequestId(
  request: Request,
): string {
  const providedId =
    request.headers.get(
      REQUEST_ID_HEADER,
    );

  if (
    providedId &&
    isValidRequestId(providedId)
  ) {
    return providedId;
  }

  return crypto.randomUUID();
}

export function isValidRequestId(
  value: string,
): boolean {
  const normalized =
    value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > 128
  ) {
    return false;
  }

  return /^[A-Za-z0-9._:-]+$/.test(
    normalized,
  );
}

export function setRequestId(
  headers: Headers,
  requestId: string,
): void {
  headers.set(
    REQUEST_ID_HEADER,
    requestId,
  );
}

export { REQUEST_ID_HEADER };
