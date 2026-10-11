import { createRequestContext, isAuthenticated } from "./lib/request-context";
import { authorize } from "./lib/authorization";
import { PERMISSIONS } from "./lib/permissions";
import { errorResponse, successResponse } from "./lib/response";
import { servicePost, type ServiceAuthEnv } from "./lib/service-client";

/**
 * Admin finance operations (service role, always on behalf of an authenticated admin):
 *   GET  /admin/riders/cash                          rider cash balances vs limit
 *   POST /admin/riders/:id/cash-handover             rider hands cash over to the platform
 *   POST /admin/finance/settlements/generate         build merchant settlements for a closed period
 *   POST /admin/finance/settlements/:id/status       approve / pay / cancel a settlement
 * Every write is audited in the database and protected by an idempotency key
 * (cash handover) or a state machine (settlements).
 */

function fail(code: string, message: string, status: number, requestId: string): Response {
  return errorResponse({ code, message, status }, requestId);
}

async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function uuidLike(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
}

function mapError(error: string, requestId: string): Response {
  if (error.includes("ADMIN_REQUIRED") || error.includes("ADMIN_NOT_AUTHORIZED")) {
    return fail("FORBIDDEN", "Admin access required", 403, requestId);
  }
  if (error.includes("INVALID_HANDOVER_AMOUNT") || error.includes("INVALID_IDEMPOTENCY_KEY") ||
      error.includes("INVALID_SETTLEMENT_PERIOD") || error.includes("INVALID_SETTLEMENT_STATUS")) {
    return fail("VALIDATION_ERROR", error, 400, requestId);
  }
  if (error.includes("SETTLEMENT_NOT_FOUND")) return fail("SETTLEMENT_NOT_FOUND", "Settlement not found", 404, requestId);
  if (error.includes("PERIOD_NOT_SETTLEABLE")) {
    return fail("PERIOD_NOT_SETTLEABLE", "The period is still inside the settlement safety period", 409, requestId);
  }
  if (error.includes("INVALID_SETTLEMENT_TRANSITION")) {
    return fail("INVALID_SETTLEMENT_TRANSITION", "This settlement cannot move to that status", 409, requestId);
  }
  if (error.includes("INSUFFICIENT_RIDER_CASH_BALANCE")) {
    return fail("INSUFFICIENT_RIDER_CASH_BALANCE", "The amount is higher than the cash held by the rider", 409, requestId);
  }
  return fail("ADMIN_FINANCE_OPERATION_FAILED", error, 502, requestId);
}

export async function routeAdminFinance(request: Request, env: unknown, requestId: string): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/v1\/?/, "").split("/").filter(Boolean);
  const method = request.method.toUpperCase();
  if (path[0] !== "admin") return null;

  const isCashList = method === "GET" && path.length === 3 && path[1] === "riders" && path[2] === "cash";
  const isHandover = method === "POST" && path.length === 4 && path[1] === "riders" && path[3] === "cash-handover";
  const isGenerate = method === "POST" && path.length === 4 && path[1] === "finance" && path[2] === "settlements" && path[3] === "generate";
  const isStatus = method === "POST" && path.length === 5 && path[1] === "finance" && path[2] === "settlements" && path[4] === "status";
  if (!isCashList && !isHandover && !isGenerate && !isStatus) return null;

  const context = await createRequestContext(request, env as Parameters<typeof createRequestContext>[1]);
  if (!isAuthenticated(context)) return fail("UNAUTHORIZED", context.error ?? "Authentication required", 401, requestId);

  const decision = authorize(context, isCashList ? PERMISSIONS.ADMIN_FINANCE_READ : PERMISSIONS.ADMIN_FINANCE_MANAGE);
  if (!decision.allowed) return fail("FORBIDDEN", decision.reason ?? "Permission denied", 403, requestId);

  const adminId = context.user!.id;
  const serviceEnv = env as ServiceAuthEnv;

  if (isCashList) {
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50) || 50, 1), 100);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);
    const result = await servicePost<unknown>("/rest/v1/rpc/admin_rider_cash_list", serviceEnv, {
      p_admin_user_id: adminId,
      p_limit: limit,
      p_offset: offset,
    });
    if (result.error) return mapError(result.error, requestId);
    return successResponse(result.data, { requestId });
  }

  if (isHandover) {
    const riderId = path[2];
    if (!uuidLike(riderId)) return fail("VALIDATION_ERROR", "Invalid rider id", 400, requestId);

    const key = request.headers.get("Idempotency-Key")?.trim() ?? "";
    if (key.length < 8 || key.length > 128) {
      return fail("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be 8-128 characters", 400, requestId);
    }

    const body = await bodyOf(request);
    const amount = body.amount_minor;
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0 || amount > 100000000) {
      return fail("VALIDATION_ERROR", "amount_minor must be a positive integer (minor units)", 400, requestId);
    }
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : null;

    const result = await servicePost<unknown>("/rest/v1/rpc/admin_record_rider_cash_handover", serviceEnv, {
      p_admin_user_id: adminId,
      p_rider_id: riderId,
      p_amount_minor: amount,
      p_idempotency_key: key,
      p_note: note || null,
    });
    if (result.error) return mapError(result.error, requestId);
    return successResponse(result.data, { requestId });
  }

  if (isGenerate) {
    const body = await bodyOf(request);
    const start = body.period_start;
    const end = body.period_end;
    if (!validDate(start) || !validDate(end) || end < start || daysBetween(start, end) > 93) {
      return fail("VALIDATION_ERROR", "A valid period (max 93 days) is required", 400, requestId);
    }
    const result = await servicePost<unknown>("/rest/v1/rpc/admin_generate_merchant_settlements", serviceEnv, {
      p_admin_user_id: adminId,
      p_period_start: start,
      p_period_end: end,
    });
    if (result.error) return mapError(result.error, requestId);
    return successResponse(result.data, { requestId });
  }

  const settlementId = path[3];
  if (!uuidLike(settlementId)) return fail("VALIDATION_ERROR", "Invalid settlement id", 400, requestId);
  const body = await bodyOf(request);
  const status = body.status;
  if (status !== "approved" && status !== "paid" && status !== "cancelled") {
    return fail("VALIDATION_ERROR", "status must be approved, paid or cancelled", 400, requestId);
  }
  const reference = typeof body.reference === "string" ? body.reference.trim().slice(0, 120) : null;
  const result = await servicePost<unknown>("/rest/v1/rpc/admin_set_merchant_settlement_status", serviceEnv, {
    p_admin_user_id: adminId,
    p_settlement_id: settlementId,
    p_new_status: status,
    p_reference: reference || null,
  });
  if (result.error) return mapError(result.error, requestId);
  return successResponse(result.data, { requestId });
}
