import type { Session } from "@supabase/supabase-js";

export const API = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

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

export async function api<T>(path: string, session: Session, options: RequestInit = {}): Promise<T> {
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${session.access_token}`,
    ...(options.headers ?? {}),
  };
  const response = await fetch(`${API}/api/v1/${path}`, { ...options, headers });
  const payload = (await response.json()) as { success?: boolean; data?: unknown; error?: { message?: string } };
  if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "تعذر الاتصال بالخدمة");
  return unwrap<T>(payload.data);
}
