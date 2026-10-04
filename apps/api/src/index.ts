/**
 * WASSLHA API
 * Cloudflare Worker entrypoint
 *
 * Final integration boundary for the Berrechid MVP API.
 */

import { routeApi } from "./api-router";
import { routeCatalog } from "./catalog-router";
import { routeCoreBusiness } from "./core-business-router";
import { routeMerchantOperations } from "./merchant-operations-router";
import { routeOrders } from "./order-router";
import { routeRider } from "./rider-router";
import { API_PREFIX } from "./lib/constants";
import { getSecurityHeaders } from "./lib/security";

export interface Env {
  ENVIRONMENT: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GOOGLE_MAPS_API_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  PAYMENT_SECRET_KEY?: string;
  ALLOWED_ORIGINS?: string;
  API_RATE_LIMITER?: { limit(input: { key: string }): Promise<{ success: boolean }> };
}

const HEALTH_PATH = `${API_PREFIX}/health`;
const READY_PATH = `${API_PREFIX}/ready`;
const AUTH_ME_PATH = `${API_PREFIX}/auth/me`;

function requestIdOf(request: Request): string { const supplied = request.headers.get("X-Request-ID")?.trim(); return supplied && supplied.length <= 128 ? supplied : crypto.randomUUID(); }
function configuredOrigins(env: Env): string[] { return (env.ALLOWED_ORIGINS ?? "").split(",").map(v => v.trim()).filter(Boolean); }
function allowedOrigin(origin: string | null, env: Env): string { const configured = configuredOrigins(env); if (env.ENVIRONMENT === "production" && configured.length === 0) return "null"; if (!origin) return configured[0] ?? "*"; if (configured.length === 0) return env.ENVIRONMENT === "development" ? origin : "null"; return configured.includes(origin) ? origin : "null"; }
function withCors(response: Response, env: Env, origin: string | null): Response { const headers = new Headers(response.headers); headers.set("Access-Control-Allow-Origin", allowedOrigin(origin, env)); headers.set("Vary", "Origin"); headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS"); headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID, Idempotency-Key"); headers.set("Access-Control-Max-Age", "86400"); headers.set("Access-Control-Expose-Headers", "X-Request-ID"); for (const [name, value] of Object.entries(getSecurityHeaders())) headers.set(name, value); return new Response(response.body, { status: response.status, statusText: response.statusText, headers }); }
function json(data: unknown, status: number, requestId: string): Response { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Request-ID": requestId, ...getSecurityHeaders() } }); }
function methodNotAllowed(requestId: string, allowed: string[]): Response { return new Response(JSON.stringify({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "HTTP method not allowed", allowed_methods: allowed } }), { status: 405, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Request-ID": requestId, Allow: allowed.join(", "), ...getSecurityHeaders() } }); }
function publicApiRoot(env: Env, requestId: string): Response { return json({ success: true, data: { name: "WASSLHA API", version: "v1", environment: env.ENVIRONMENT, status: "ok" } }, 200, requestId); }
function health(env: Env, requestId: string): Response { return json({ success: true, data: { status: "ok", service: "wasslha-api", version: "v1", environment: env.ENVIRONMENT, timestamp: new Date().toISOString(), request_id: requestId } }, 200, requestId); }
function readiness(env: Env, requestId: string): Response { const supabaseUrlConfigured = Boolean(env.SUPABASE_URL?.trim()), supabaseAnonConfigured = Boolean(env.SUPABASE_ANON_KEY?.trim()), supabaseServiceRoleConfigured = Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim()), originsConfigured = configuredOrigins(env).length > 0; const ready = supabaseUrlConfigured && supabaseAnonConfigured && supabaseServiceRoleConfigured && (env.ENVIRONMENT !== "production" || originsConfigured); return json({ success: ready, data: { status: ready ? "ready" : "degraded", service: "wasslha-api", environment: env.ENVIRONMENT, checks: { api: "ok", supabase_url: supabaseUrlConfigured ? "configured" : "not_configured", supabase_anon_key: supabaseAnonConfigured ? "configured" : "not_configured", supabase_service_role_key: supabaseServiceRoleConfigured ? "configured" : "not_configured", cors_allow_list: originsConfigured ? "configured" : "not_configured" }, timestamp: new Date().toISOString(), request_id: requestId } }, ready ? 200 : 503, requestId); }

async function handle(request: Request, env: Env, requestId: string): Promise<Response> {
  const url = new URL(request.url), path = url.pathname, method = request.method.toUpperCase();
  if (path === API_PREFIX || path === `${API_PREFIX}/`) return method === "GET" ? publicApiRoot(env, requestId) : methodNotAllowed(requestId, ["GET"]);
  if (path === HEALTH_PATH) return method === "GET" ? health(env, requestId) : methodNotAllowed(requestId, ["GET"]);
  if (path === READY_PATH) return method === "GET" ? readiness(env, requestId) : methodNotAllowed(requestId, ["GET"]);
  if (path === AUTH_ME_PATH && method !== "GET") return methodNotAllowed(requestId, ["GET"]);
  if (path.startsWith(`${API_PREFIX}/`)) {
    const catalog = await routeCatalog(request, env, requestId); if (catalog) return catalog;
    const order = await routeOrders(request, env, requestId); if (order) return order;
    const merchantOperations = await routeMerchantOperations(request, env, requestId); if (merchantOperations) return merchantOperations;
    const core = await routeCoreBusiness(request, env, requestId); if (core) return core;
    const rider = await routeRider(request, env, requestId); if (rider) return rider;
    return routeApi(request, env, requestId);
  }
  return json({ success: false, error: { code: "NOT_FOUND", message: "API route not found" } }, 404, requestId);
}

export default { async fetch(request: Request, env: Env): Promise<Response> { const requestId = requestIdOf(request); try { if (request.method.toUpperCase() === "OPTIONS") return withCors(new Response(null, { status: 204, headers: { "X-Request-ID": requestId, ...getSecurityHeaders() } }), env, request.headers.get("Origin")); return withCors(await handle(request, env, requestId), env, request.headers.get("Origin")); } catch (error) { console.error("Unhandled WASSLHA API error", { requestId, error }); return withCors(json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" }, request_id: requestId }, 500, requestId), env, request.headers.get("Origin")); } } };