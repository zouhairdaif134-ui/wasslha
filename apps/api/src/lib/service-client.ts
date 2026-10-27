/**
 * WASSLHA Backend Service Client
 * Privileged Supabase REST operations.
 */
import {
  getServiceApiUrl,
  getServiceAuthHeaders,
  type ServiceAuthEnv,
} from "./service-auth";

export type { ServiceAuthEnv } from "./service-auth";

export interface ServiceRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

// Database functions signal business errors with `raise exception 'SOME_CODE'` (optionally 'SOME_CODE:<uuid>').
// PostgREST returns that as { message: "SOME_CODE" }. Only such codes are copied into the error text, so callers can
// map them (e.g. error.includes("NO_ELIGIBLE_RIDER")) while internal details (tables, columns, SQL) stay hidden.
function businessCode(data: unknown): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const message = (data as { message?: unknown }).message;
  if (typeof message !== "string") return null;
  const match = /^([A-Z][A-Z0-9_]{2,60})(?::[0-9a-fA-F-]{36})?$/.exec(message);
  return match ? match[1] : null;
}

export async function serviceRequest<T>(
  path: string,
  env: ServiceAuthEnv,
  options: ServiceRequestOptions = {},
): Promise<ServiceResult<T>> {
  const method = options.method || "GET";
  const headers: Record<string, string> = {
    ...getServiceAuthHeaders(env),
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    if (method === "POST" || method === "PATCH" || method === "PUT") {
      headers.Prefer ??= "return=representation";
    }
  }

  try {
    const response = await fetch(getServiceApiUrl(env, path), {
      method,
      headers,
      body:
        options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
    });

    const text = await response.text();
    let data: T | null = null;

    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      const code = businessCode(data);
      return {
        data,
        error: `Supabase service request failed with status ${response.status}${code ? `: ${code}` : ""}`,
        status: response.status,
      };
    }

    return {
      data,
      error: null,
      status: response.status,
    };
  } catch (error) {
    console.error("Supabase service request error", error);
    return {
      data: null,
      error: "Supabase service unavailable",
      status: 503,
    };
  }
}

export const serviceGet = <T>(path: string, env: ServiceAuthEnv) =>
  serviceRequest<T>(path, env, { method: "GET" });

export const servicePost = <T>(
  path: string,
  env: ServiceAuthEnv,
  body: unknown,
) => serviceRequest<T>(path, env, { method: "POST", body });

export const servicePatch = <T>(
  path: string,
  env: ServiceAuthEnv,
  body: unknown,
) => serviceRequest<T>(path, env, { method: "PATCH", body });

export const serviceDelete = <T>(path: string, env: ServiceAuthEnv) =>
  serviceRequest<T>(path, env, { method: "DELETE" });
