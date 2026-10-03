/**
 * WASSLHA
 * Authentication Service
 *
 * Business-level authentication operations built
 * on top of the backend authentication foundation.
 *
 * Berrechid MVP.
 */

import {
  authenticateRequest,
  type AuthEnv,
  type AuthResult,
} from "../lib/auth";

import {
  resolveUserRoles,
  type RbacEnv,
} from "../lib/rbac";

export interface AuthServiceEnv
  extends AuthEnv,
    RbacEnv {}

export interface AuthSession {
  user: AuthResult["user"];
  accessToken: string;
  roles: Array<{
    id: string;
    name: string;
  }>;
}

export interface AuthServiceResult {
  success: boolean;
  session: AuthSession | null;
  error: string | null;
}

export async function getAuthenticatedSession(
  request: Request,
  env: AuthServiceEnv,
): Promise<AuthServiceResult> {
  const authentication =
    await authenticateRequest(
      request,
      env,
    );

  if (
    !authentication.authenticated ||
    !authentication.user ||
    !authentication.accessToken
  ) {
    return {
      success: false,
      session: null,
      error:
        authentication.error ||
        "Authentication required",
    };
  }

  const roleResult =
    await resolveUserRoles(
      authentication.user.id,
      authentication.accessToken,
      env,
    );

  if (!roleResult.resolved) {
    return {
      success: false,
      session: null,
      error:
        roleResult.error ||
        "Unable to resolve user roles",
    };
  }

  return {
    success: true,
    session: {
      user:
        authentication.user,
      accessToken:
        authentication.accessToken,
      roles:
        roleResult.roles,
    },
    error: null,
  };
}
