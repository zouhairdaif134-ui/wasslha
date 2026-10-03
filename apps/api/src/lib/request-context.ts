/**
 * WASSLHA
 * Backend Request Context
 *
 * Combines authentication and RBAC
 * into one server-side request context.
 *
 * Berrechid MVP.
 */

import {
  authenticateRequest,
  type AuthEnv,
  type AuthUser,
} from "./auth";

import {
  resolveUserRoles,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  type UserRole,
} from "./rbac";

export interface RequestContext {
  authenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  roles: UserRole[];
  error: string | null;
}

export interface ContextEnv extends AuthEnv {}

export async function createRequestContext(
  request: Request,
  env: ContextEnv,
): Promise<RequestContext> {
  const auth = await authenticateRequest(
    request,
    env,
  );

  if (
    !auth.authenticated ||
    !auth.user ||
    !auth.accessToken
  ) {
    return {
      authenticated: false,
      user: null,
      accessToken: null,
      roles: [],
      error: auth.error || "Authentication required",
    };
  }

  const rbac = await resolveUserRoles(
    auth.user.id,
    auth.accessToken,
    env,
  );

  if (!rbac.resolved) {
    return {
      authenticated: true,
      user: auth.user,
      accessToken: auth.accessToken,
      roles: [],
      error: rbac.error || "Unable to resolve user roles",
    };
  }

  return {
    authenticated: true,
    user: auth.user,
    accessToken: auth.accessToken,
    roles: rbac.roles,
    error: null,
  };
}

export function isAuthenticated(
  context: RequestContext,
): boolean {
  return (
    context.authenticated &&
    context.user !== null &&
    context.accessToken !== null
  );
}

export function contextHasRole(
  context: RequestContext,
  roleName: string,
): boolean {
  return hasRole(
    context.roles,
    roleName,
  );
}

export function contextHasAnyRole(
  context: RequestContext,
  roleNames: string[],
): boolean {
  return hasAnyRole(
    context.roles,
    roleNames,
  );
}

export function contextHasAllRoles(
  context: RequestContext,
  roleNames: string[],
): boolean {
  return hasAllRoles(
    context.roles,
    roleNames,
  );
}
