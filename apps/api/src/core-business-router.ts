import { createRequestContext, isAuthenticated } from "./lib/request-context";
import { authorize } from "./lib/authorization";
import { PERMISSIONS } from "./lib/permissions";
import { errorResponse, successResponse } from "./lib/response";
import { getMerchantByOwner, updateMerchant } from "./services/merchant-service";
import { createStore, getMerchantStores, updateStore } from "./services/store-service";
import { createProduct, getStoreProducts, updateProduct } from "./services/product-service";

function tokenOf(request: Request): string {
  const value = request.headers.get("Authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

function fail(code: string, message: string, status: number, requestId: string): Response {
  return errorResponse({ code, message, status }, requestId);
}

function ok<T>(data: T, requestId: string): Response {
  return successResponse(data, { requestId });
}

function guard(context: Parameters<typeof authorize>[0], permission: Parameters<typeof authorize>[1], requestId: string): Response | null {
  const decision = authorize(context, permission);
  return decision.allowed ? null : fail("FORBIDDEN", decision.reason ?? "Permission denied", 403, requestId);
}

function jsonBody(request: Request): Promise<Record<string, unknown>> {
  return request.json().then((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid JSON object");
    return value as Record<string, unknown>;
  });
}

function stringField(body: Record<string, unknown>, name: string, required = false): string | undefined {
  const value = body[name];
  if (value === undefined || value === null) {
    if (required) throw new Error(`${name} is required`);
    return undefined;
  }
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${name} must be a non-empty string`);
  return value.trim();
}

function numberField(body: Record<string, unknown>, name: string, required = false): number | undefined {
  const value = body[name];
  if (value === undefined || value === null) {
    if (required) throw new Error(`${name} is required`);
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${name} must be a finite number`);
  return value;
}

function booleanField(body: Record<string, unknown>, name: string): boolean | undefined {
  const value = body[name];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") throw new Error(`${name} must be boolean`);
  return value;
}

export async function routeCoreBusiness(request: Request, env: unknown, requestId: string): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/v1\/?/, "").split("/").filter(Boolean);
  const method = request.method.toUpperCase();
  const token = tokenOf(request);

  const isCorePath =
    path[0] === "merchant" ||
    path[0] === "stores" ||
    path[0] === "products";
  if (!isCorePath) return null;

  const context = await createRequestContext(request, env as Parameters<typeof createRequestContext>[1]);
  if (!isAuthenticated(context)) return fail("UNAUTHORIZED", context.error ?? "Authentication required", 401, requestId);

  const uid = context.user!.id;
  const id = path[1];

  try {
    if (path[0] === "merchant" && id === "me" && path.length === 2) {
      if (method === "GET") {
        const denied = guard(context, PERMISSIONS.MERCHANT_PROFILE_READ, requestId);
        if (denied) return denied;
        return ok(await getMerchantByOwner(uid, env as any, token), requestId);
      }

      if (method === "PATCH") {
        const denied = guard(context, PERMISSIONS.MERCHANT_PROFILE_UPDATE, requestId);
        if (denied) return denied;
        const merchant = await getMerchantByOwner(uid, env as any, token);
        if (!merchant.data) return fail("MERCHANT_NOT_FOUND", "Merchant account not found", 404, requestId);
        const body = await jsonBody(request);
        const updates: Record<string, string> = {};
        for (const key of ["business_name", "legal_name", "phone", "email"] as const) {
          const value = stringField(body, key);
          if (value !== undefined) updates[key] = value;
        }
        if (Object.keys(updates).length === 0) return fail("VALIDATION_ERROR", "At least one merchant field is required", 400, requestId);
        return ok(await updateMerchant(merchant.data.id, env as any, token, updates), requestId);
      }

      return fail("METHOD_NOT_ALLOWED", "Method not allowed", 405, requestId);
    }

    if (path[0] === "stores" && id === "me") {
      const merchant = await getMerchantByOwner(uid, env as any, token);
      if (!merchant.data) return fail("MERCHANT_NOT_FOUND", "Merchant account not found", 404, requestId);
      if (method === "GET" && path.length === 2) {
        const denied = guard(context, PERMISSIONS.MERCHANT_STORES_MANAGE, requestId);
        if (denied) return denied;
        return ok(await getMerchantStores(merchant.data.id, env as any, token), requestId);
      }
      if (method === "POST" && path.length === 2) {
        const denied = guard(context, PERMISSIONS.MERCHANT_STORES_MANAGE, requestId);
        if (denied) return denied;
        const body = await jsonBody(request);
        const store = {
          name: stringField(body, "name", true)!,
          description: stringField(body, "description"),
          phone: stringField(body, "phone"),
          address_text: stringField(body, "address_text", true)!,
          latitude: numberField(body, "latitude"),
          longitude: numberField(body, "longitude"),
          is_active: booleanField(body, "is_active") ?? true,
          is_accepting_orders: booleanField(body, "is_accepting_orders") ?? true,
        };
        return ok(await createStore(merchant.data.id, env as any, token, store), requestId);
      }
    }

    if (path[0] === "stores" && id && path.length === 2 && method === "PATCH") {
      const denied = guard(context, PERMISSIONS.MERCHANT_STORES_MANAGE, requestId);
      if (denied) return denied;
      const merchant = await getMerchantByOwner(uid, env as any, token);
      if (!merchant.data) return fail("MERCHANT_NOT_FOUND", "Merchant account not found", 404, requestId);
      const body = await jsonBody(request);
      const updates: Record<string, unknown> = {};
      for (const key of ["name", "description", "phone", "address_text"] as const) {
        const value = stringField(body, key);
        if (value !== undefined) updates[key] = value;
      }
      for (const key of ["latitude", "longitude"] as const) {
        const value = numberField(body, key);
        if (value !== undefined) updates[key] = value;
      }
      for (const key of ["is_active", "is_accepting_orders"] as const) {
        const value = booleanField(body, key);
        if (value !== undefined) updates[key] = value;
      }
      if (Object.keys(updates).length === 0) return fail("VALIDATION_ERROR", "At least one store field is required", 400, requestId);
      return ok(await updateStore(id, merchant.data.id, env as any, token, updates), requestId);
    }

    if (path[0] === "products" && id === "me") {
      const storeId = url.searchParams.get("store_id");
      if (!storeId) return fail("VALIDATION_ERROR", "store_id query parameter is required", 400, requestId);
      if (method === "GET" && path.length === 2) {
        const denied = guard(context, PERMISSIONS.MERCHANT_PRODUCTS_MANAGE, requestId);
        if (denied) return denied;
        return ok(await getStoreProducts(storeId, env as any, token), requestId);
      }
      if (method === "POST" && path.length === 2) {
        const denied = guard(context, PERMISSIONS.MERCHANT_PRODUCTS_MANAGE, requestId);
        if (denied) return denied;
        const body = await jsonBody(request);
        const priceMinor = numberField(body, "price_minor", true)!;
        if (!Number.isInteger(priceMinor) || priceMinor < 0) return fail("VALIDATION_ERROR", "price_minor must be a non-negative integer", 400, requestId);
        const stockQuantity = numberField(body, "stock_quantity", true)!;
        if (!Number.isInteger(stockQuantity) || stockQuantity < 0) return fail("VALIDATION_ERROR", "stock_quantity must be a non-negative integer", 400, requestId);
        const product = {
          category_id: stringField(body, "category_id"),
          name_ar: stringField(body, "name_ar", true)!,
          name_fr: stringField(body, "name_fr", true)!,
          description_ar: stringField(body, "description_ar"),
          description_fr: stringField(body, "description_fr"),
          sku: stringField(body, "sku"),
          price_minor: priceMinor,
          compare_at_price_minor: numberField(body, "compare_at_price_minor"),
          currency: "MAD" as const,
          stock_quantity: stockQuantity,
          stock_unit: stringField(body, "stock_unit", true)!,
          is_available: booleanField(body, "is_available") ?? true,
          is_active: booleanField(body, "is_active") ?? true,
          approval_status: "pending",
        };
        return ok(await createProduct(storeId, env as any, token, product), requestId);
      }
    }

    if (path[0] === "products" && id && path.length === 2 && method === "PATCH") {
      const denied = guard(context, PERMISSIONS.MERCHANT_PRODUCTS_MANAGE, requestId);
      if (denied) return denied;
      const storeId = url.searchParams.get("store_id");
      if (!storeId) return fail("VALIDATION_ERROR", "store_id query parameter is required", 400, requestId);
      const body = await jsonBody(request);
      const updates: Record<string, unknown> = {};
      for (const key of ["category_id", "name_ar", "name_fr", "description_ar", "description_fr", "sku", "stock_unit"] as const) {
        const value = stringField(body, key);
        if (value !== undefined) updates[key] = value;
      }
      for (const key of ["price_minor", "compare_at_price_minor", "stock_quantity"] as const) {
        const value = numberField(body, key);
        if (value !== undefined) {
          if (!Number.isInteger(value) || value < 0) return fail("VALIDATION_ERROR", `${key} must be a non-negative integer`, 400, requestId);
          updates[key] = value;
        }
      }
      for (const key of ["is_available", "is_active"] as const) {
        const value = booleanField(body, key);
        if (value !== undefined) updates[key] = value;
      }
      if (Object.keys(updates).length === 0) return fail("VALIDATION_ERROR", "At least one product field is required", 400, requestId);
      return ok(await updateProduct(id, storeId, env as any, token, updates), requestId);
    }

    return fail("NOT_FOUND", "Core business route not found", 404, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return fail("VALIDATION_ERROR", message, 400, requestId);
  }
}
