import { createRequestContext, isAuthenticated } from "./lib/request-context";
import { authorize } from "./lib/authorization";
import { PERMISSIONS } from "./lib/permissions";
import { errorResponse, successResponse } from "./lib/response";
import { databaseGet, type DatabaseEnv } from "./lib/database";
import { addRequestItem, createGetRequest } from "./services/get-request-service";

function tokenOf(request: Request) { const value = request.headers.get("Authorization") ?? ""; return value.startsWith("Bearer ") ? value.slice(7) : ""; }
function fail(code: string, message: string, status: number, requestId: string) { return errorResponse({ code, message, status }, requestId); }
function text(value: unknown, max: number, required = false) { if (typeof value !== "string") return required ? null : undefined; const v = value.trim(); if (!v || v.length > max) return required ? null : undefined; return v; }
function number(value: unknown, min: number, max: number) { return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null; }
function uuid(value: unknown) { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }

export async function routeGetRequestWrites(request: Request, env: unknown, requestId: string): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/v1\/?/, "").split("/").filter(Boolean);
  if (path[0] !== "get-requests" || request.method.toUpperCase() !== "POST") return null;

  const context = await createRequestContext(request, env as Parameters<typeof createRequestContext>[1]);
  if (!isAuthenticated(context)) return fail("UNAUTHORIZED", context.error ?? "Authentication required", 401, requestId);
  const token = tokenOf(request);
  const uid = context.user!.id;
  const createDenied = authorize(context, PERMISSIONS.GET_REQUEST_CREATE);
  if (!createDenied.allowed) return fail("FORBIDDEN", createDenied.reason ?? "Permission denied", 403, requestId);

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return fail("INVALID_JSON", "Request body must be a JSON object", 400, requestId);

  if (path.length === 1) {
    const key = request.headers.get("Idempotency-Key")?.trim() ?? "";
    if (key.length < 8 || key.length > 128) return fail("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be 8-128 characters", 400, requestId);
    const title = text(body.request_title, 160, true);
    const description = text(body.request_description, 1000);
    const pickupName = text(body.pickup_place_name, 160);
    const pickupAddress = text(body.pickup_place_address, 500);
    const deliveryAddress = text(body.delivery_address_text, 500, true);
    const lat = number(body.delivery_latitude, -90, 90);
    const lng = number(body.delivery_longitude, -180, 180);
    if (!title || !deliveryAddress || lat === null || lng === null) return fail("VALIDATION_ERROR", "request_title, delivery address and delivery coordinates are required", 400, requestId);

    const existing = await databaseGet<Array<{ id: string; customer_id: string }>>(`/rest/v1/get_requests?select=id,customer_id&customer_id=eq.${uid}&idempotency_key=eq.${encodeURIComponent(key)}&limit=1`, env as DatabaseEnv, token);
    if (existing.data?.[0]) return successResponse({ id: existing.data[0].id, reused: true }, { requestId });

    const result = await createGetRequest({ customer_id: uid, request_title: title, request_description: description ?? null, pickup_place_name: pickupName ?? null, pickup_place_address: pickupAddress ?? null, delivery_address_text: deliveryAddress, delivery_latitude: lat, delivery_longitude: lng, idempotency_key: key }, env as any);
    if (!result.success || !result.data) return fail("GET_REQUEST_CREATE_ERROR", result.error ?? "Unable to create request", 409, requestId);
    return successResponse(result.data, { requestId });
  }

  if (path.length === 3 && uuid(path[1]) && path[2] === "items") {
    const itemName = text(body.item_name, 160, true);
    const description = text(body.description, 500);
    const quantity = number(body.quantity, 1, 1000);
    const unit = text(body.unit, 40);
    const notes = text(body.notes, 500);
    if (!itemName || quantity === null) return fail("VALIDATION_ERROR", "item_name and a valid quantity are required", 400, requestId);
    const owned = await databaseGet<Array<{ id: string; customer_id: string }>>(`/rest/v1/get_requests?select=id,customer_id&id=eq.${path[1]}&customer_id=eq.${uid}&limit=1`, env as DatabaseEnv, token);
    if (!owned.data?.[0]) return fail("FORBIDDEN", "Request does not belong to the customer", 403, requestId);
    const result = await addRequestItem({ get_request_id: path[1], item_name: itemName, description: description ?? null, quantity, unit: unit ?? null, notes: notes ?? null }, env as any);
    if (!result.success || !result.data) return fail("GET_REQUEST_ITEM_CREATE_ERROR", result.error ?? "Unable to add request item", 409, requestId);
    return successResponse(result.data, { requestId });
  }

  return null;
}
