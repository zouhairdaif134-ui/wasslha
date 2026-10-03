/**
 * WASSLHA
 * Supabase REST Client Foundation
 *
 * Centralized server-side access to Supabase REST APIs.
 * Berrechid MVP.
 */

export interface SupabaseEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

export interface SupabaseRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  accessToken?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface SupabaseResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

function getSupabaseBaseUrl(env: SupabaseEnv): string | null {
  return env.SUPABASE_URL ? env.SUPABASE_URL.replace(/\/$/, "") : null;
}

export async function supabaseRequest<T>(
  path: string,
  env: SupabaseEnv,
  options: SupabaseRequestOptions = {},
): Promise<SupabaseResult<T>> {
  const baseUrl = getSupabaseBaseUrl(env);
  if (!baseUrl || !env.SUPABASE_ANON_KEY) {
    return { data: null, error: "Supabase is not configured", status: 503 };
  }

  const method = options.method || "GET";
  const headers: Record<string, string> = {
    apikey: env.SUPABASE_ANON_KEY,
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    if (method === "POST" || method === "PATCH" || method === "PUT") {
      headers.Prefer ??= "return=representation";
    }
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const text = await response.text();
    let data: T | null = null;
    if (text) {
      try { data = JSON.parse(text) as T; } catch { data = null; }
    }
    if (!response.ok) {
      const message =
        typeof data === "object" && data !== null && "message" in data &&
        typeof (data as { message?: unknown }).message === "string"
          ? (data as { message: string }).message
          : `Supabase request failed with status ${response.status}`;
      return { data, error: message, status: response.status };
    }
    return { data, error: null, status: response.status };
  } catch (error) {
    console.error("Supabase request error", error);
    return { data: null, error: "Supabase service unavailable", status: 503 };
  }
}

export const supabaseGet = <T>(path:string,env:SupabaseEnv,accessToken?:string) =>
  supabaseRequest<T>(path,env,{method:"GET",accessToken});
export const supabasePost = <T>(path:string,env:SupabaseEnv,body:unknown,accessToken?:string) =>
  supabaseRequest<T>(path,env,{method:"POST",accessToken,body});
export const supabasePatch = <T>(path:string,env:SupabaseEnv,body:unknown,accessToken?:string) =>
  supabaseRequest<T>(path,env,{method:"PATCH",accessToken,body});
export const supabaseDelete = <T>(path:string,env:SupabaseEnv,accessToken?:string) =>
  supabaseRequest<T>(path,env,{method:"DELETE",accessToken});
