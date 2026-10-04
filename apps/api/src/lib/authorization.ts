/**
 * WASSLHA
 * Backend Authorization Guard
 *
 * Central server-side authorization layer.
 * Authentication and role resolution are handled
 * by the request context.
 *
 * Database RLS remains authoritative.
 * Berrechid MVP.
 */

import type { RequestContext } from "./request-context";
import type { Permission } from "./permissions";

export interface AuthorizationResult {
  allowed: boolean;
  reason: string | null;
}

/**
 * Temporary role-to-permission mapping.
 *
 * This mapping is centralized so that API authorization
 * remains consistent across backend modules.
 *
 * The database/RLS layer remains authoritative for
 * actual data access.
 */
const ROLE_PERMISSIONS: Record<
  string,
  readonly Permission[]
> = {
  admin: [
    "admin.dashboard.view",
    "admin.users.read",
    "admin.users.manage",
    "admin.orders.read",
    "admin.orders.update",
    "admin.merchants.read",
    "admin.merchants.manage",
    "admin.riders.read",
    "admin.riders.manage",
    "admin.finance.read",
    "admin.finance.manage",
    "admin.support.read",
    "admin.support.manage",
    "admin.reports.read",
    "admin.settings.read",
    "admin.settings.manage",
    "admin.audit.read",

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
    "customer.orders.cancel",

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

    "reviews.manage",

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
  roleName: string,
  permission: Permission,
): boolean {
  return (
    ROLE_PERMISSIONS[roleName]?.includes(
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
    roleHasPermission(
      role.name,
      permission,
    ),
  );
}

export function hasAnyPermission(
  context: RequestContext,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) =>
    hasPermission(
      context,
      permission,
    ),
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

  if (context.roles.length === 0) {
    return {
      allowed: false,
      reason: "No role assigned",
    };
  }

  if (
    !hasPermission(
      context,
      permission,
    )
  ) {
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
