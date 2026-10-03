/**
 * WASSLHA
 * Backend Idempotency Helpers
 *
 * Prevents accidental duplicate processing of sensitive API operations.
 * The persistence layer will be connected through the service layer.
 *
 * Berrechid MVP.
 */

import {
  badRequest,
} from "./errors";

import {
  hashJson,
} from "./hash";

const IDEMPOTENCY_KEY_HEADER =
  "Idempotency-Key";

const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

export function getIdempotencyKey(
  request: Request,
): string | null {
  const value =
    request.headers.get(
      IDEMPOTENCY_KEY_HEADER,
    );

  if (!value) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}

export function validateIdempotencyKey(
  value: unknown,
): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const normalized =
    value.trim();

  if (
    normalized.length === 0 ||
    normalized.length >
      MAX_IDEMPOTENCY_KEY_LENGTH
  ) {
    return false;
  }

  return /^[A-Za-z0-9._:-]+$/.test(
    normalized,
  );
}

export function requireIdempotencyKey(
  request: Request,
): string {
  const key =
    getIdempotencyKey(request);

  if (!key) {
    throw badRequest(
      `${IDEMPOTENCY_KEY_HEADER} header is required`,
    );
  }

  if (
    !validateIdempotencyKey(key)
  ) {
    throw badRequest(
      `${IDEMPOTENCY_KEY_HEADER} is invalid`,
    );
  }

  return key;
}

export function isIdempotencyRequiredMethod(
  method: string,
): boolean {
  const normalized =
    method.trim().toUpperCase();

  return (
    normalized === "POST" ||
    normalized === "PUT" ||
    normalized === "PATCH" ||
    normalized === "DELETE"
  );
}

export async function createRequestHash(
  body: unknown,
): Promise<string> {
  return hashJson(body);
}

export function getIdempotencyKeyHeaderName(): string {
  return IDEMPOTENCY_KEY_HEADER;
}
