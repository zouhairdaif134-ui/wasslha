/**
 * WASSLHA
 * Backend Authorization Guard
 *
 * Server-side authorization helpers.
 * Role resolution comes from the database.
 *
 * Berrechid MVP.
 */

import type { RequestContext } from "./request-context";
import {
  hasRole,
  hasAnyRole,
  type UserRole,
} from "./rbac";
import type { Permission } from "./permissions";

export interface AuthorizationResult {
  allowed: boolean;
  reason: string | null;
}

/**
 * Temporary role-to-permission mapping.
 *
 * This is intentionally centralized.
 * It will later be replaced/extended by the
 * database-backed permission model.
 */
const ROLE_PERMISSIONS: Record<
  string,
  readonly Permission[]
> = {
  admin: [
    "admin.dashboard.view",
    "admin.users.read",
    "admin.users.manage",
    "merchant.dashboard.view",
    "merchant.profile.read",
    "merchant.profile.update",
    "merchant.stores.manage",
    "merchant.products.manage",
    "merchant.orders.read",
    "merchant.orders.update",
    "rider.app.access",
    "rider.profile.read",
    "rider.profile.update",
    "rider.slots.read",
    "rider.slots.manage",
    "rider.deliveries.read",
    "rider.deliveries.update",
    "rider.location.update",
    "customer.app.access",
    "customer.profile.read",
    "customer.profile.update",
    "customer.addresses.manage",
    "customer.orders.read",
    "customer.orders.create",
    "get_request.create",
    "get_request.read",
    "get_request.manage",
    "payments.read",
    "payments.create",
    "payments.manage",
    "wallet.read",
    "wallet.manage",
    "support.create",
    "support.read",
    "support.manage",
    "reviews.create",
    "reviews.manage",
    "notifications.read",
    "notifications.manage",
  ],

  merchant: [
    "merchant.dashboard.view",
    "merchant.profile.read",
    "merchant.profile.update",
    "merchant.stores.manage",
    "merchant.products.manage",
    "merchant.orders.read",
    "merchant.orders.update",
    "support.create",
    "support.read",
    "reviews.read",
    "notifications.read",
  ],

  rider: [
    "rider.app.access",
    "rider.profile.read",
    "rider.profile.update",
    "rider.slots.read",
    "rider.slots.manage",
    "rider.deliveries.read",
    "rider.deliveries.update",
    "rider.location.update",
    "wallet.read",
    "support.create",
    "support.read",
    "notifications.read",
  ],

  customer: [
    "customer.app.access",
    "customer.profile.read",
    "customer.profile.update",
    "customer.addresses.manage",
    "customer.orders.read",
    "customer.orders.create",
    "get_request.create",
    "get_request.read",
    "payments.read",
    "payments.create",
    "wallet.read",
    "support.create",
    "support.read",
    "reviews.create",
    "notifications.read",
  ],
};

function roleHasPermission(
  role: UserRole,
  permission: Permission,
): boolean {
  return (
    ROLE_PERMISSIONS[role.name]?.includes(
      permission,
    ) ?? false
  );
}

export function hasPermission(
  context: RequestContext,
  permission: Permission,
): boolean {
  if (!context.authenticated) {
    return false;
  }

  return context.roles.some((role) =>
    roleHasPermission(role, permission),
  );
}

export function hasAnyPermission(
  context: RequestContext,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) =>
    hasPermission(context, permission),
  );
}

export function hasRoleAccess(
  context: RequestContext,
  roleName: string,
): boolean {
  return hasRole(
    context.roles,
    roleName,
  );
}

export function hasAnyRoleAccess(
  context: RequestContext,
  roleNames: string[],
): boolean {
  return hasAnyRole(
    context.roles,
    roleNames,
  );
}

export function authorize(
  context: RequestContext,
  permission: Permission,
): AuthorizationResult {
  if (!context.authenticated) {
    return {
      allowed: false,
      reason: "Authentication required",
    };
  }

  if (
    !context.roles ||
    context.roles.length === 0
  ) {
    return {
      allowed: false,
      reason: "No role assigned",
    };
  }

  if (!hasPermission(context, permission)) {
    return {
      allowed: false,
      reason: "Permission denied",
    };
  }

  return {
    allowed: true,
    reason: null,
  };
}
