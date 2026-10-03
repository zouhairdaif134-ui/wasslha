/**
 * WASSLHA
 * Backend Environment Configuration
 *
 * Centralized environment access and validation.
 * Secrets must remain server-side.
 *
 * Berrechid MVP.
 */

export interface AppEnv {
  ENVIRONMENT: string;

  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;

  GOOGLE_MAPS_API_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  PAYMENT_SECRET_KEY?: string;
}

export interface EnvironmentStatus {
  valid: boolean;
  missing: string[];
}

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "ENVIRONMENT",
] as const;

export function getEnvironmentStatus(
  env: AppEnv,
): EnvironmentStatus {
  const missing: string[] = [];

  for (const name of
    REQUIRED_ENVIRONMENT_VARIABLES) {
    const value = env[name];

    if (
      typeof value !== "string" ||
      value.trim().length === 0
    ) {
      missing.push(name);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export function requireEnvironment(
  env: AppEnv,
): void {
  const status =
    getEnvironmentStatus(env);

  if (!status.valid) {
    throw new Error(
      `Missing required environment variables: ${status.missing.join(", ")}`,
    );
  }
}

export function isProduction(
  env: AppEnv,
): boolean {
  return (
    env.ENVIRONMENT
      .trim()
      .toLowerCase() ===
    "production"
  );
}

export function isDevelopment(
  env: AppEnv,
): boolean {
  return (
    env.ENVIRONMENT
      .trim()
      .toLowerCase() ===
    "development"
  );
}

export function isStaging(
  env: AppEnv,
): boolean {
  return (
    env.ENVIRONMENT
      .trim()
      .toLowerCase() ===
    "staging"
  );
}

export function hasSupabaseConfig(
  env: AppEnv,
): boolean {
  return (
    typeof env.SUPABASE_URL ===
      "string" &&
    env.SUPABASE_URL.trim()
      .length > 0 &&
    typeof env.SUPABASE_ANON_KEY ===
      "string" &&
    env.SUPABASE_ANON_KEY.trim()
      .length > 0
  );
}

export function hasSupabaseAdminConfig(
  env: AppEnv,
): boolean {
  return (
    hasSupabaseConfig(env) &&
    typeof env.SUPABASE_SERVICE_ROLE_KEY ===
      "string" &&
    env.SUPABASE_SERVICE_ROLE_KEY
      .trim()
      .length > 0
  );
}
