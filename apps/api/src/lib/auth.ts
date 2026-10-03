/**
 * WASSLHA
 * Backend Authentication Foundation
 *
 * Validates Supabase access tokens at the API boundary.
 * Berrechid MVP.
 */

export interface AuthEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  role?: string;
  user_metadata?: Record<string, unknown>;
}

export interface AuthResult {
  authenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  error: string | null;
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization");

  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return null;
  }

  const token = match[1].trim();

  return token.length > 0 ? token : null;
}

export async function authenticateRequest(
  request: Request,
  env: AuthEnv,
): Promise<AuthResult> {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return {
      authenticated: false,
      user: null,
      accessToken: null,
      error: "Missing or invalid Authorization header",
    };
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return {
      authenticated: false,
      user: null,
      accessToken: null,
      error: "Supabase authentication is not configured",
    };
  }

  try {
    const response = await fetch(
      `${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: env.SUPABASE_ANON_KEY,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return {
        authenticated: false,
        user: null,
        accessToken: null,
        error: "Invalid or expired access token",
      };
    }

    const data = (await response.json()) as {
      id?: string;
      email?: string;
      phone?: string;
      user_metadata?: Record<string, unknown>;
    };

    if (!data.id) {
      return {
        authenticated: false,
        user: null,
        accessToken: null,
        error: "Authenticated user ID is missing",
      };
    }

    return {
      authenticated: true,
      user: {
        id: data.id,
        email: data.email,
        phone: data.phone,
        user_metadata: data.user_metadata,
      },
      accessToken,
      error: null,
    };
  } catch (error) {
    console.error("Supabase authentication error", error);

    return {
      authenticated: false,
      user: null,
      accessToken: null,
      error: "Authentication service unavailable",
    };
  }
}

export function requireAuthentication(
  result: AuthResult,
): asserts result is AuthResult & {
  authenticated: true;
  user: AuthUser;
  accessToken: string;
} {
  if (!result.authenticated || !result.user || !result.accessToken) {
    throw new Error(result.error || "Authentication required");
  }
}
