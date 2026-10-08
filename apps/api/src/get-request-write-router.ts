import { createRequestContext, isAuthenticated } from "./lib/request-context";
import { authorize } from "./lib/authorization";
import { PERMISSIONS } from "./lib/permissions";
import { errorResponse, successResponse } from "./lib/response";
import { databaseGet, type DatabaseEnv } from "./lib/database";
import { addRequestItem, createGetRequest } from "./services/get-request-service";
import { addPurchaseReceipt, createPurchaseApproval, createPurchaseRecord, decidePurchaseApproval, getAcceptedGetRequestRider, getCustomerGetRequest } from "./services/get-request-purchase-service";

function tokenOf(request: Request) { const value = request.headers.get("Authorization") ?? ""; return value.startsWith("Bearer ") ? value.slice(7) : ""; }
function fail(code: string, message: string, status: number, requestId: string) { return errorResponse({ code, message, status }, requestId); }
function text(value: unknown, max: number, required = false) { if (typeof value !== "string") return required ? null : undefined; const v = value.trim(); if (!v || v.length > max) return required ? null : undefined; return v; }
function number(value: unknown, min: number, max: number) { return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null; }
function minor(value: unknown) { return typeof value === "string" && /^[0-9]+$/.test(value) && BigInt(value) >= 0n ? value : null; }
function uuid(value: unknown) { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }

export async function routeGetRequestWrites(request: Request, env: unknown, requestId: string): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/v1\/?/, "").split("/").filter(Boolean);
  if (path[0] !== "get-requests" || request.method.toUpperCase() !== "POST") return null;
  const context = await createRequestContext(request, env as Parameters<typeof createRequestContext>[1]);
  if (!isAuthenticated(context)) return fail("UNAUTHORIZED", context.error ?? "Authentication required", 401, requestId);
  const token = tokenOf(request); const uid = context.user!.id;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return fail("INVALID_JSON", "Request body must be a JSON object", 400, requestId);

  const purchasePath = path.length === 3 && uuid(path[1]);
  const purchase = purchasePath && path[2] === "purchase";
  const approvalRequest = purchasePath && path[2] === "purchase-approval";
  const approvalDecision = path.length === 4 && uuid(path[1]) && path[2] === "purchase-approval" && path[3] === "decision";
  const receipt = purchasePath && path[2] === "purchase-receipts";

  if (purchase || approvalRequest || receipt) {
    const denied = authorize(context, PERMISSIONS.RIDER_DELIVERIES_UPDATE);
    if (!denied.allowed) return fail("FORBIDDEN", denied.reason ?? "Permission denied", 403, requestId);
    if (!await getAcceptedGetRequestRider(path[1], uid, env as DatabaseEnv, token)) return fail("FORBIDDEN", "Rider is not the accepted fulfiller for this request", 403, requestId);
  } else {
    const denied = authorize(context, PERMISSIONS.GET_REQUEST_CREATE);
    if (!denied.allowed) return fail("FORBIDDEN", denied.reason ?? "Permission denied", 403, requestId);
  }

  if (path.length === 1) {
    const key = request.headers.get("Idempotency-Key")?.trim() ?? "";
    if (key.length < 8 || key.length > 128) return fail("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be 8-128 characters", 400, requestId);
    const title = text(body.request_title, 160, true), description = text(body.request_description, 1000), pickupName = text(body.pickup_place_name, 160), pickupAddress = text(body.pickup_place_address, 500), deliveryAddress = text(body.delivery_address_text, 500, true);
    const lat = number(body.delivery_latitude, -90, 90), lng = number(body.delivery_longitude, -180, 180);
    const budget = minor(body.maximum_product_amount_minor);
    if (!title || !deliveryAddress || lat === null || lng === null) return fail("VALIDATION_ERROR", "request_title, delivery address and delivery coordinates are required", 400, requestId);
    const existing = await databaseGet<Array<{ id: string; customer_id: string }>>(`/rest/v1/get_requests?select=id,customer_id&customer_id=eq.${uid}&idempotency_key=eq.${encodeURIComponent(key)}&limit=1`, env as DatabaseEnv, token);
    if (existing.data?.[0]) return successResponse({ id: existing.data[0].id, reused: true }, { requestId });
    const result = await createGetRequest({ customer_id: uid, request_title: title, request_description: description ?? null, pickup_place_name: pickupName ?? null, pickup_place_address: pickupAddress ?? null, delivery_address_text: deliveryAddress, delivery_latitude: lat, delivery_longitude: lng, maximum_product_amount_minor: budget, idempotency_key: key }, env as any);
    if (!result.success || !result.data) return fail("GET_REQUEST_CREATE_ERROR", result.error ?? "Unable to create request", 409, requestId);
    return successResponse(result.data, { requestId });
  }

  if (path.length === 3 && uuid(path[1]) && path[2] === "items") {
    const itemName = text(body.item_name, 160, true), description = text(body.description, 500), quantity = number(body.quantity, 1, 1000), unit = text(body.unit, 40), notes = text(body.notes, 500);
    if (!itemName || quantity === null) return fail("VALIDATION_ERROR", "item_name and a valid quantity are required", 400, requestId);
    const owned = await databaseGet<Array<{ id: string }>>(`/rest/v1/get_requests?select=id&id=eq.${path[1]}&customer_id=eq.${uid}&limit=1`, env as DatabaseEnv, token);
    if (!owned.data?.[0]) return fail("FORBIDDEN", "Request does not belong to the customer", 403, requestId);
    const result = await addRequestItem({ get_request_id: path[1], item_name: itemName, description: description ?? null, quantity, unit: unit ?? null, notes: notes ?? null }, env as any);
    if (!result.success || !result.data) return fail("GET_REQUEST_ITEM_CREATE_ERROR", result.error ?? "Unable to add request item", 409, requestId);
    return successResponse(result.data, { requestId });
  }

  if (purchase) {
    const key = request.headers.get("Idempotency-Key")?.trim() ?? "";
    if (key.length < 8 || key.length > 128) return fail("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be 8-128 characters", 400, requestId);
    const actual = minor(body.actual_product_amount_minor), reimbursement = minor(body.reimbursement_amount_minor), deliveryFee = minor(body.delivery_fee_minor), serviceFee = minor(body.service_fee_minor), total = minor(body.total_amount_minor);
    if ([actual,reimbursement,deliveryFee,serviceFee,total].some(v => v === null)) return fail("VALIDATION_ERROR", "Financial amounts must be non-negative integer minor units", 400, requestId);
    const requestRow = await databaseGet<Array<{ id:string; maximum_product_amount_minor:number|string|null }>>(`/rest/v1/get_requests?select=id,maximum_product_amount_minor&id=eq.${path[1]}&limit=1`, env as DatabaseEnv, token);
    if (!requestRow.data?.[0]) return fail("NOT_FOUND", "Get Request not found", 404, requestId);
    const budget = requestRow.data[0].maximum_product_amount_minor == null ? null : BigInt(String(requestRow.data[0].maximum_product_amount_minor));
    if (budget !== null && BigInt(actual!) > budget) return fail("APPROVAL_REQUIRED", "Actual purchase exceeds the customer budget; request approval first", 409, requestId);
    const result = await createPurchaseRecord({ get_request_id:path[1],rider_id:uid,actual_product_amount_minor:actual!,reimbursement_amount_minor:reimbursement!,delivery_fee_minor:deliveryFee!,service_fee_minor:serviceFee!,total_amount_minor:total!,budget_exceeded:false,idempotency_key:key },env as any);
    if (result.error) return fail("PURCHASE_CREATE_ERROR",result.error,409,requestId);
    return successResponse(result.data?.[0]??null,{requestId});
  }

  if (approvalRequest) {
    const key = request.headers.get("Idempotency-Key")?.trim() ?? "";
    if (key.length < 8 || key.length > 128) return fail("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be 8-128 characters", 400, requestId);
    const requested = minor(body.requested_amount_minor);
    if (requested === null || BigInt(requested) <= 0n) return fail("VALIDATION_ERROR", "requested_amount_minor must be positive integer minor units", 400, requestId);
    const result = await createPurchaseApproval({get_request_id:path[1],requested_amount_minor:requested,requested_by:uid,idempotency_key:key,decision_reason:text(body.decision_reason,500)??null},env as any);
    if (result.error) return fail("PURCHASE_APPROVAL_ERROR",result.error,409,requestId);
    return successResponse(result.data?.[0]??null,{requestId});
  }

  if (approvalDecision) {
    const decision = body.decision;
    if (decision !== "approved" && decision !== "rejected") return fail("VALIDATION_ERROR", "decision must be approved or rejected", 400, requestId);
    const approvalId = path[1];
    const owned = await databaseGet<Array<{ id:string }>>(`/rest/v1/purchase_approvals?select=id&id=${encodeURIComponent(approvalId)}&status=eq.pending&limit=1`, env as DatabaseEnv, token);
    if (!owned.data?.[0]) return fail("FORBIDDEN", "Purchase approval is not pending for this customer", 403, requestId);
    const result = await decidePurchaseApproval({ approval_id:approvalId, customer_id:uid, decision, reason:text(body.reason,500)??null },env as any);
    if (result.error) return fail("PURCHASE_APPROVAL_DECISION_ERROR",result.error,409,requestId);
    return successResponse(result.data?.[0]??null,{requestId});
  }

  if (receipt) {
    const purchaseRecordId = text(body.purchase_record_id, 64, true), storagePath = text(body.storage_path, 500, true), amount = minor(body.amount_minor);
    if (!purchaseRecordId || !storagePath || amount === null || BigInt(amount) <= 0n) return fail("VALIDATION_ERROR", "purchase_record_id, storage_path and positive amount are required", 400, requestId);
    const result = await addPurchaseReceipt({purchase_record_id:purchaseRecordId,get_request_id:path[1],uploaded_by:uid,storage_path:storagePath,receipt_number:text(body.receipt_number,120)??null,vendor_name:text(body.vendor_name,160)??null,amount_minor:amount},env as any);
    if (result.error) return fail("PURCHASE_RECEIPT_ERROR",result.error,409,requestId);
    return successResponse(result.data?.[0]??null,{requestId});
  }
  return null;
}
