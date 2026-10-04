import { createRequestContext, isAuthenticated } from "./lib/request-context";
import { authorize } from "./lib/authorization";
import { PERMISSIONS } from "./lib/permissions";
import { errorResponse, successResponse } from "./lib/response";
import { createOrder, getOrder, getSubOrderOwnership } from "./services/order-service";
import { transitionMasterOrder, transitionSubOrder } from "./services/order-transition-service";

function tokenOf(request: Request): string {
  const value = request.headers.get("Authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

function ok<T>(data: T, requestId: string): Response {
  return successResponse(data, { requestId });
}

function fail(code: string, message: string, status: number, requestId: string): Response {
  return errorResponse({ code, message, status }, requestId);
}

function guard(context: Parameters<typeof authorize>[0], permission: Parameters<typeof authorize>[1], requestId: string): Response | null {
  const decision = authorize(context, permission);
  return decision.allowed ? null : fail("FORBIDDEN", decision.reason ?? "Permission denied", 403, requestId);
}

function jsonError(requestId: string, message: string): Response {
  return fail("INVALID_JSON", message, 400, requestId);
}

function mapOrderError(error: string | null, requestId: string): Response {
  if (!error) return fail("ORDER_ERROR", "Order operation failed", 502, requestId);
  if (error.includes("INVALID_ORDER_REQUEST") || error.includes("INVALID_PAYMENT_METHOD") ||
      error.includes("INVALID_ORDER_ITEM") || error.includes("INVALID_ORDER_QUANTITY") ||
      error.includes("INVALID_ORDER_AMOUNT") || error.includes("ORDER_ITEMS_REQUIRED")) {
    return fail("INVALID_ORDER_REQUEST", error, 400, requestId);
  }
  if (error.includes("DELIVERY_ADDRESS_NOT_FOUND") || error.includes("PRODUCT_NOT_AVAILABLE") ||
      error.includes("STORE_NOT_ACCEPTING_ORDERS") || error.includes("INSUFFICIENT_STOCK")) {
    return fail("ORDER_NOT_AVAILABLE", error, 409, requestId);
  }
  if (error.includes("DISCOUNT_EXCEEDS_SUBTOTAL")) {
    return fail("INVALID_ORDER_DISCOUNT", error, 400, requestId);
  }
  if (error.includes("MASTER_ORDER_NOT_FOUND")) {
    return fail("ORDER_NOT_FOUND", error, 404, requestId);
  }
  if (error.includes("ORDER_STATUS_UNCHANGED")) {
    return fail("ORDER_STATUS_UNCHANGED", error, 409, requestId);
  }
  if (error.includes("INVALID_MASTER_ORDER_TRANSITION")) {
    return fail("INVALID_ORDER_TRANSITION", error, 409, requestId);
  }
  return fail("ORDER_OPERATION_FAILED", error, 502, requestId);
}

async function bodyOf(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function routeOrders(request: Request, env: unknown, requestId: string): Promise<Response | null> {
  const u = new URL(request.url);
  const path = u.pathname.replace(/^\/api\/v1\/?/, "").split("/").filter(Boolean);
  if (path[0] !== "orders") return null;

  const context = await createRequestContext(request, env as Parameters<typeof createRequestContext>[1]);
  if (!isAuthenticated(context)) return fail("UNAUTHORIZED", context.error ?? "Authentication required", 401, requestId);

  const token = tokenOf(request);
  const uid = context.user!.id;
  const method = request.method.toUpperCase();

  if (method === "POST" && path.length === 1) {
    const denied = guard(context, PERMISSIONS.CUSTOMER_ORDERS_CANCEL, requestId);
    if (denied) return denied;

    const key = request.headers.get("Idempotency-Key")?.trim() ?? "";
    if (key.length < 8 || key.length > 128) return fail("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be 8-128 characters", 400, requestId);

    const body = await bodyOf(request);
    if (!body) return jsonError(requestId, "Request body must be a JSON object");

    const addressId = body.delivery_address_id;
    const paymentMethod = body.payment_method;
    const items = body.items;

    if (!isUuid(addressId) || (paymentMethod !== "cod" && paymentMethod !== "online") ||
        !Array.isArray(items) || items.length === 0 || items.length > 100) {
      return fail("INVALID_ORDER_REQUEST", "Invalid delivery address, payment method, or items", 400, requestId);
    }

    const normalizedItems = items.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const x = item as Record<string, unknown>;
      if (!isUuid(x.product_id) || typeof x.quantity !== "number" || !Number.isFinite(x.quantity) ||
          x.quantity <= 0 || x.quantity > 1000) return null;
      return {
        product_id: x.product_id,
        quantity: x.quantity,
        notes: typeof x.notes === "string" ? x.notes.trim().slice(0, 500) : undefined,
      };
    });
    if (normalizedItems.some((item) => item === null)) return fail("INVALID_ORDER_REQUEST", "One or more order items are invalid", 400, requestId);

    const result = await createOrder(uid, {
      delivery_address_id: addressId,
      payment_method: paymentMethod,
      customer_note: typeof body.customer_note === "string" ? body.customer_note.trim().slice(0, 1000) : undefined,
      items: normalizedItems as NonNullable<(typeof normalizedItems)[number]>[],
    }, key, env as any);

    if (!result.success || !result.data) return mapOrderError(result.error, requestId);
    return ok(result.data, requestId);
  }

  if (method === "POST" && path.length === 3 && path[2] === "status") {
    const orderId = path[1];
    if (!isUuid(orderId)) return fail("INVALID_ORDER_ID", "Invalid order id", 400, requestId);

    const body = await bodyOf(request);
    if (!body || !nonEmpty(body.status)) return jsonError(requestId, "status is required");
    const status = body.status.trim();

    const order = await getOrder(orderId, env as any, token);
    if (!order.data) return fail("ORDER_NOT_FOUND", "Order not found", 404, requestId);

    const isOwner = order.data.customer_id === uid;
    const isAdmin = context.roles.some((role) => role.name === "admin");
    if (isOwner && status !== "cancelled") {
      return fail("FORBIDDEN", "Customer may only cancel an order", 403, requestId);
    }
    if (!isOwner && !isAdmin) {
      return fail("FORBIDDEN", "Only the customer or admin may change master order status", 403, requestId);
    }
    if (isOwner) {
      const denied = guard(context, PERMISSIONS.CUSTOMER_ORDERS_CREATE, requestId);
      if (denied) return denied;
    } else {
      const denied = guard(context, PERMISSIONS.ADMIN_ORDERS_UPDATE, requestId);
      if (denied) return denied;
    }

    const result = await transitionMasterOrder(orderId, status, uid, typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null,
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : {}, env as any);
    if (!result.success) return mapOrderError(result.error, requestId);
    return ok(result.data, requestId);
  }

  if (method === "POST" && path.length === 3 && path[2] === "sub-status") {
    const subOrderId = path[1];
    if (!isUuid(subOrderId)) return fail("INVALID_SUB_ORDER_ID", "Invalid sub-order id", 400, requestId);
    const denied = guard(context, PERMISSIONS.MERCHANT_ORDERS_UPDATE, requestId);
    if (denied) return denied;
    const ownership = await getSubOrderOwnership(subOrderId, env as any, token);
    if (!ownership.data) return ownership.error ? fail("ORDER_OPERATION_FAILED", ownership.error, 502, requestId) : fail("SUB_ORDER_NOT_FOUND", "Sub-order not found", 404, requestId);
    const isAdmin = context.roles.some((role) => role.name === "admin");
    if (!isAdmin && ownership.data.merchant_user_id !== uid) return fail("FORBIDDEN", "Merchant does not own this sub-order", 403, requestId);
    const body = await bodyOf(request);
    if (!body || !nonEmpty(body.status)) return jsonError(requestId, "status is required");
    const result = await transitionSubOrder(subOrderId, body.status.trim(), uid,
      typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null,
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : {}, env as any);
    if (!result.success) {
      const e = result.error ?? "";
      if (e.includes("SUB_ORDER_NOT_FOUND")) return fail("SUB_ORDER_NOT_FOUND", e, 404, requestId);
      if (e.includes("INVALID_SUB_ORDER_TRANSITION")) return fail("INVALID_ORDER_TRANSITION", e, 409, requestId);
      return fail("ORDER_OPERATION_FAILED", e || "Sub-order transition failed", 502, requestId);
    }
    return ok(result.data, requestId);
  }

  return null;
}
