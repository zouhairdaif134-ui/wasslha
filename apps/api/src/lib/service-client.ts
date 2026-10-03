/**
 * WASSLHA
 * Backend Service Client
 *
 * Controlled server-side client for privileged
 * Supabase REST operations.
 *
 * Berrechid MVP.
 */

import {
  getServiceApiUrl,
  getServiceAuthHeaders,
  type ServiceAuthEnv,
} from "./service-auth";

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

export async function serviceRequest<T>(
  path: string,
  env: ServiceAuthEnv,
  options: ServiceRequestOptions = {},
): Promise<ServiceResult<T>> {
  const headers: Record<
    string,
    string
  > = {
    ...getServiceAuthHeaders(env),
    ...(options.headers || {}),
  };

  if (
    options.body !== undefined
  ) {
    headers["Content-Type"] =
      "application/json";
  }

  try {
    const response =
      await fetch(
        getServiceApiUrl(
          env,
          path,
        ),
        {
          method:
            options.method || "GET",
          headers,
          body:
            options.body !== undefined
              ? JSON.stringify(
                  options.body,
                )
              : undefined,
        },
      );

    const text =
      await response.text();

    let data: T | null = null;

    if (text.length > 0) {
      try {
        data = JSON.parse(
          text,
        ) as T;
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      return {
        data,
        error:
          `Supabase service request failed with status ${response.status}`,
        status:
          response.status,
      };
    }

    return {
      data,
      error: null,
      status:
        response.status,
    };
  } catch (error) {
    console.error(
      "Supabase service request error",
      error,
    );

    return {
      data: null,
      error:
        "Supabase service unavailable",
      status: 503,
    };
  }
}

export async function serviceGet<T>(
  path: string,
  env: ServiceAuthEnv,
): Promise<ServiceResult<T>> {
  return serviceRequest<T>(
    path,
    env,
    {
      method: "GET",
    },
  );
}

export async function servicePost<T>(
  path: string,
  env: ServiceAuthEnv,
  body: unknown,
): Promise<ServiceResult<T>> {
  return serviceRequest<T>(
    path,
    env,
    {
      method: "POST",
      body,
    },
  );
}

export async function servicePatch<T>(
  path: string,
  env: ServiceAuthEnv,
  body: unknown,
): Promise<ServiceResult<T>> {
  return serviceRequest<T>(
    path,
    env,
    {
      method: "PATCH",
      body,
    },
  );
}

export async function serviceDelete<T>(
  path: string,
  env: ServiceAuthEnv,
): Promise<ServiceResult<T>> {
  return serviceRequest<T>(
    path,
    env,
    {
      method: "DELETE",
    },
  );
}
