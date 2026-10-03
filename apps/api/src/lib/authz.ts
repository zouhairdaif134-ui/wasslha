/**
 * WASSLHA
 * Backend Authorization Utilities
 *
 * Centralized authorization helpers built on top
 * of the authenticated request context.
 *
 * Database RLS remains authoritative.
 *
 * Berrechid MVP.
 */

import {
  authorize,
  hasAnyPermission,
  hasPermission,
} from "./authorization";

import type {
  Permission,
} from "./permissions";

import type {
  RequestContext,
} from "./request-context";

export function can(
  context: RequestContext,
  permission: Permission,
): boolean {
  return hasPermission(
    context,
    permission,
  );
}

export function canAny(
  context: RequestContext,
  permissions: Permission[],
): boolean {
  return hasAnyPermission(
    context,
    permissions,
  );
}

export function assertCan(
  context: RequestContext,
  permission: Permission,
): void {
  const result =
    authorize(
      context,
      permission,
    );

  if (!result.allowed) {
    throw new Error(
      result.reason ||
        "Permission denied",
    );
  }
}

export function assertCanAny(
  context: RequestContext,
  permissions: Permission[],
): void {
  if (
    !canAny(
      context,
      permissions,
    )
  ) {
    throw new Error(
      "Permission denied",
    );
  }
}
