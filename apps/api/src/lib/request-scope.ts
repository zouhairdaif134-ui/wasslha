/**
 * WASSLHA
 * Backend Request Scope
 *
 * Represents the trusted server-side scope of a request.
 * Keeps identity, request tracing, and authorization context
 * together without exposing privileged credentials.
 *
 * Berrechid MVP.
 */

import type {
  RequestContext,
} from "./request-context";

export interface RequestScope {
  requestId: string;
  context: RequestContext;
}

export function createRequestScope(
  requestId: string,
  context: RequestContext,
): RequestScope {
  return {
    requestId,
    context,
  };
}

export function isRequestScopeAuthenticated(
  scope: RequestScope,
): boolean {
  return (
    scope.context.authenticated &&
    scope.context.user !== null &&
    scope.context.accessToken !== null
  );
}

export function getScopeUserId(
  scope: RequestScope,
): string | null {
  return (
    scope.context.user?.id ??
    null
  );
}

export function getScopeAccessToken(
  scope: RequestScope,
): string | null {
  return (
    scope.context.accessToken ??
    null
  );
}
