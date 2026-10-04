import { createRequestContext, isAuthenticated } from "./lib/request-context";
import { authorize } from "./lib/authorization";
import { PERMISSIONS } from "./lib/permissions";
import { errorResponse, successResponse } from "./lib/response";
import { recordRiderLocation } from "./services/rider-location-service";
import { getRiderEarnings } from "./services/finance-service";

function tokenOf(request: Request) { const value = request.headers.get("Authorization") ?? ""; return value.startsWith("Bearer ") ? value.slice(7) : ""; }
function fail(code: string, message: string, status: number, requestId: string) { return errorResponse({ code, message, status }, requestId); }
async function bodyOf(request: Request): Promise<Record<string, unknown>> { try { const value = await request.json(); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; } catch { return {}; } }
function numberField(body: Record<string, unknown>, key: string, min: number, max: number) { const value = body[key]; return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null; }

export async function routeRider(request: Request, env: unknown, requestId: string): Promise<Response | null> {
  const url = new URL(request.url), path = url.pathname.replace(/^\/api\/v1\/?/, "").split("/").filter(Boolean), method = request.method.toUpperCase();
  if (!(path[0] === "rider" && path[1] === "me")) return null;
  const context = await createRequestContext(request, env as Parameters<typeof createRequestContext>[1]);
  if (!isAuthenticated(context)) return fail("UNAUTHORIZED", context.error ?? "Authentication required", 401, requestId);
  const token = tokenOf(request);

  if (method === "GET" && path[2] === "earnings") {
    const decision = authorize(context, PERMISSIONS.WALLET_READ);
    if (!decision.allowed) return fail("FORBIDDEN", decision.reason ?? "Permission denied", 403, requestId);
    const result = await getRiderEarnings(context.user!.id, env as any, token);
    if (!result.success) return fail("RIDER_EARNINGS_ERROR", result.error ?? "Unable to load earnings", 502, requestId);
    const rows = result.data ?? [];
    let total = 0n, pending = 0n, paid = 0n;
    for (const row of rows) {
      const amount = BigInt(row.total_minor || "0"); total += amount;
      if (["pending", "accrued", "processing"].includes(row.status)) pending += amount;
      if (["paid", "settled"].includes(row.status)) paid += amount;
    }
    return successResponse({ total_minor: total.toString(), pending_minor: pending.toString(), paid_minor: paid.toString(), currency: "MAD", entries: rows }, { requestId });
  }

  if (!(method === "POST" && path[2] === "location")) return null;
  const decision = authorize(context, PERMISSIONS.RIDER_DELIVERIES_UPDATE);
  if (!decision.allowed) return fail("FORBIDDEN", decision.reason ?? "Permission denied", 403, requestId);
  const body = await bodyOf(request);
  const latitude = numberField(body, "latitude", -90, 90), longitude = numberField(body, "longitude", -180, 180);
  const accuracy = body.accuracy_meters == null ? null : numberField(body, "accuracy_meters", 0, 10000);
  const speed = body.speed_mps == null ? null : numberField(body, "speed_mps", 0, 100);
  const heading = body.heading == null ? null : numberField(body, "heading", 0, 360);
  const deliveryId = typeof body.delivery_id === "string" && body.delivery_id.length <= 64 ? body.delivery_id : null;
  if (latitude === null || longitude === null || (body.accuracy_meters != null && accuracy === null) || (body.speed_mps != null && speed === null) || (body.heading != null && heading === null)) return fail("VALIDATION_ERROR", "Invalid location payload", 400, requestId);
  const result = await recordRiderLocation(context.user!.id, env as any, token, { delivery_id: deliveryId, latitude, longitude, accuracy_meters: accuracy, speed_mps: speed, heading });
  if (!result.success) return fail("RIDER_LOCATION_ERROR", result.error ?? "Unable to record location", 502, requestId);
  return successResponse(result.data, { requestId });
}
