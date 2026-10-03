/**
 * WASSLHA
 * Backend Security Helpers
 *
 * Common security helpers for API requests.
 * Secrets and authentication credentials must never
 * be exposed through logs or API responses.
 *
 * Berrechid MVP.
 */

const SENSITIVE_HEADERS = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-service-key",
];

const SENSITIVE_KEYS = [
  "password",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  "api_key",
  "apikey",
  "service_role_key",
  "payment_secret",
  "card_number",
  "cvv",
  "cvc",
];

export function getClientIp(
  request: Request,
): string | null {
  const forwarded =
    request.headers.get(
      "CF-Connecting-IP",
    );

  if (
    forwarded &&
    forwarded.trim().length > 0
  ) {
    return forwarded.trim();
  }

  return null;
}

export function hasAuthorizationHeader(
  request: Request,
): boolean {
  const authorization =
    request.headers.get(
      "Authorization",
    );

  return Boolean(
    authorization &&
      authorization.trim().length > 0,
  );
}

export function sanitizeForLog(
  value: unknown,
): unknown {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    typeof value !== "object"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(
      sanitizeForLog,
    );
  }

  const source =
    value as Record<
      string,
      unknown
    >;

  const result: Record<
    string,
    unknown
  > = {};

  for (const [key, item] of Object.entries(
    source,
  )) {
    const normalizedKey =
      key
        .trim()
        .toLowerCase();

    if (
      SENSITIVE_KEYS.includes(
        normalizedKey,
      )
    ) {
      result[key] =
        "[REDACTED]";
      continue;
    }

    result[key] =
      sanitizeForLog(item);
  }

  return result;
}

export function sanitizeHeaders(
  headers: Headers,
): Record<string, string> {
  const result: Record<
    string,
    string
  > = {};

  for (const [key, value] of headers.entries()) {
    if (
      SENSITIVE_HEADERS.includes(
        key.toLowerCase(),
      )
    ) {
      result[key] =
        "[REDACTED]";
      continue;
    }

    result[key] = value;
  }

  return result;
}

export function isSecureRequest(
  request: Request,
): boolean {
  const url =
    new URL(request.url);

  return (
    url.protocol === "https:"
  );
}

export function getSecurityHeaders(): Record<
  string,
  string
> {
  return {
    "X-Content-Type-Options":
      "nosniff",
    "X-Frame-Options":
      "DENY",
    "Referrer-Policy":
      "no-referrer",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(self)",
  };
        }
