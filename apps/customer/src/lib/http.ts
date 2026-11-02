import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export const API = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
export const ONLINE_PAYMENTS_ENABLED = process.env.EXPO_PUBLIC_ONLINE_PAYMENTS_ENABLED === "true";
export const idempotencyKey = () => Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 14);

// Some API routes answer { success, data: { success, data, error } } (service result nested in the envelope).
export function unwrap<T>(value: unknown): T {
  if (value && typeof value === "object" && !Array.isArray(value) && "success" in value && "data" in value) {
    const inner = value as { success: boolean; data: T; error?: string | null };
    if (!inner.success) throw new Error(inner.error ?? "تعذر الاتصال بالخدمة");
    return inner.data;
  }
  return value as T;
}

export function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

type Payload = { success?: boolean; data?: unknown; error?: { message?: string } };

// getSession() renews an expired token before returning it; the token kept in React state can be stale after the
// phone slept.
async function freshToken(fallback: string): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? fallback;
  } catch {
    return fallback;
  }
}

async function send(path: string, token: string, options: RequestInit): Promise<{ response: Response; payload: Payload }> {
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${token}`,
    ...(options.headers ?? {}),
  };
  const response = await fetch(`${API}/api/v1/${path}`, { ...options, headers });
  const payload = (await response.json()) as Payload;
  return { response, payload };
}

export async function api<T>(path: string, session: Session, options: RequestInit = {}): Promise<T> {
  let { response, payload } = await send(path, await freshToken(session.access_token), options);
  if (response.status === 401) {
    // The server rejected the token: renew it once and retry before giving up.
    const renewed = await supabase.auth.refreshSession();
    const token = renewed.data.session?.access_token;
    if (token) ({ response, payload } = await send(path, token, options));
  }
  if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "تعذر الاتصال بالخدمة");
  return unwrap<T>(payload.data);
}
