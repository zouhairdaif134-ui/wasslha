/**
 * WASSLHA
 * Backend Permission Foundation
 *
 * Central permission names used by the API.
 * Database/RLS authorization remains authoritative.
 *
 * Berrechid MVP.
 */

export const PERMISSIONS = {
  ADMIN_DASHBOARD_VIEW: "admin.dashboard.view",
  ADMIN_USERS_READ: "admin.users.read",
  ADMIN_USERS_MANAGE: "admin.users.manage",

  MERCHANT_DASHBOARD_VIEW: "merchant.dashboard.view",
  MERCHANT_PROFILE_READ: "merchant.profile.read",
  MERCHANT_PROFILE_UPDATE: "merchant.profile.update",
  MERCHANT_STORES_MANAGE: "merchant.stores.manage",
  MERCHANT_PRODUCTS_MANAGE: "merchant.products.manage",
  MERCHANT_ORDERS_READ: "merchant.orders.read",
  MERCHANT_ORDERS_UPDATE: "merchant.orders.update",

  RIDER_APP_ACCESS: "rider.app.access",
  RIDER_PROFILE_READ: "rider.profile.read",
  RIDER_PROFILE_UPDATE: "rider.profile.update",
  RIDER_SLOTS_READ: "rider.slots.read",
  RIDER_SLOTS_MANAGE: "rider.slots.manage",
  RIDER_DELIVERIES_READ: "rider.deliveries.read",
  RIDER_DELIVERIES_UPDATE: "rider.deliveries.update",
  RIDER_LOCATION_UPDATE: "rider.location.update",

  CUSTOMER_APP_ACCESS: "customer.app.access",
  CUSTOMER_PROFILE_READ: "customer.profile.read",
  CUSTOMER_PROFILE_UPDATE: "customer.profile.update",
  CUSTOMER_ADDRESSES_MANAGE: "customer.addresses.manage",
  CUSTOMER_ORDERS_READ: "customer.orders.read",
  CUSTOMER_ORDERS_CREATE: "customer.orders.create",

  GET_REQUEST_CREATE: "get_request.create",
  GET_REQUEST_READ: "get_request.read",
  GET_REQUEST_MANAGE: "get_request.manage",

  PAYMENTS_READ: "payments.read",
  PAYMENTS_CREATE: "payments.create",
  PAYMENTS_MANAGE: "payments.manage",

  WALLET_READ: "wallet.read",
  WALLET_MANAGE: "wallet.manage",

  SUPPORT_CREATE: "support.create",
  SUPPORT_READ: "support.read",
  SUPPORT_MANAGE: "support.manage",

  REVIEWS_CREATE: "reviews.create",
  REVIEWS_MANAGE: "reviews.manage",

  NOTIFICATIONS_READ: "notifications.read",
  NOTIFICATIONS_MANAGE: "notifications.manage",
} as const;

export type Permission =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function isPermission(
  value: string,
): value is Permission {
  return Object.values(PERMISSIONS).includes(
    value as Permission,
  );
}
