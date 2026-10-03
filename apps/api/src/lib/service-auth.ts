/**
 * WASSLHA
 * Backend Service Authentication Helpers
 *
 * Provides controlled server-side authentication
 * for privileged Supabase operations.
 *
 * Privileged credentials must remain server-side.
 *
 * Berrechid MVP.
 */

export interface ServiceAuthEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export interface ServiceAuthHeaders {
  apikey: string;
  Authorization: string;
  Accept: string;
}

export function hasServiceAuthConfig(
  env: ServiceAuthEnv,
): boolean {
  return (
    typeof env.SUPABASE_URL ===
      "string" &&
    env.SUPABASE_URL.trim()
      .length > 0 &&
    typeof env.SUPABASE_SERVICE_ROLE_KEY ===
      "string" &&
    env.SUPABASE_SERVICE_ROLE_KEY
      .trim()
      .length > 0
  );
}

export function getServiceAuthHeaders(
  env: ServiceAuthEnv,
): ServiceAuthHeaders {
  if (
    !hasServiceAuthConfig(env)
  ) {
    throw new Error(
      "Supabase service authentication is not configured",
    );
  }

  const serviceKey =
    env.SUPABASE_SERVICE_ROLE_KEY!.trim();

  return {
    apikey: serviceKey,
    Authorization:
      `Bearer ${serviceKey}`,
    Accept:
      "application/json",
  };
}

export function getServiceApiUrl(
  env: ServiceAuthEnv,
  path: string,
): string {
  if (
    !env.SUPABASE_URL ||
    env.SUPABASE_URL.trim()
      .length === 0
  ) {
    throw new Error(
      "Supabase URL is not configured",
    );
  }

  const baseUrl =
    env.SUPABASE_URL.replace(
      /\/$/,
      "",
    );

  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}
