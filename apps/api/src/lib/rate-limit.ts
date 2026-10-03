/**
 * WASSLHA
 * Backend Rate Limiting Helpers
 *
 * Centralized helpers for Cloudflare Workers Rate Limiting.
 * Rate limiting protects API resources from excessive requests.
 *
 * Berrechid MVP.
 */

export interface RateLimitBinding {
  limit(input: {
    key: string;
  }): Promise<{
    success: boolean;
  }>;
}

export interface RateLimitResult {
  allowed: boolean;
  key: string;
}

export async function checkRateLimit(
  limiter: RateLimitBinding,
  key: string,
): Promise<RateLimitResult> {
  const normalizedKey =
    key.trim();

  if (normalizedKey.length === 0) {
    return {
      allowed: true,
      key: "anonymous",
    };
  }

  const result =
    await limiter.limit({
      key: normalizedKey,
    });

  return {
    allowed: result.success,
    key: normalizedKey,
  };
}

export function buildRateLimitKey(
  request: Request,
  userId?: string | null,
): string {
  const url =
    new URL(request.url);

  const route =
    url.pathname;

  if (
    userId &&
    userId.trim().length > 0
  ) {
    return `user:${userId.trim()}:route:${route}`;
  }

  return `anonymous:route:${route}`;
}
