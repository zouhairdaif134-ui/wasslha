/**
 * WASSLHA
 * Notification Service
 *
 * Server-side notification operations.
 *
 * Berrechid MVP.
 */

import {
  databaseGet,
  databaseUpdate,
  type DatabaseEnv,
} from "../lib/database";

export interface NotificationServiceEnv
  extends DatabaseEnv {}

export interface Notification {
  id: string;
  user_id: string;
  type?: string | null;
  title?: string | null;
  body?: string | null;
  data?: Record<string, unknown> | null;
  is_read?: boolean;
  read_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function getUserNotifications(
  userId: string,
  env: NotificationServiceEnv,
  accessToken: string,
): Promise<
  NotificationServiceResult<Notification[]>
> {
  const result =
    await databaseGet<Notification[]>(
      `/rest/v1/notifications` +
        `?select=*` +
        `&user_id=eq.${encodeURIComponent(
          userId,
        )}` +
        `&order=created_at.desc`,
      env,
      accessToken,
    );

  if (result.error) {
    return {
      success: false,
      data: null,
      error: result.error,
    };
  }

  return {
    success: true,
    data: result.data ?? [],
    error: null,
  };
}

export async function getUnreadNotifications(
  userId: string,
  env: NotificationServiceEnv,
  accessToken: string,
): Promise<
  NotificationServiceResult<Notification[]>
> {
  const result =
    await databaseGet<Notification[]>(
      `/rest/v1/notifications` +
        `?select=*` +
        `&user_id=eq.${encodeURIComponent(
          userId,
        )}` +
        `&is_read=eq.false` +
        `&order=created_at.desc`,
      env,
      accessToken,
    );

  if (result.error) {
    return {
      success: false,
      data: null,
      error: result.error,
    };
  }

  return {
    success: true,
    data: result.data ?? [],
    error: null,
  };
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
  env: NotificationServiceEnv,
  accessToken: string,
): Promise<
  NotificationServiceResult<Notification | null>
> {
  const result =
    await databaseUpdate<Notification[]>(
      `/rest/v1/notifications` +
        `?id=eq.${encodeURIComponent(
          notificationId,
        )}` +
        `&user_id=eq.${encodeURIComponent(
          userId,
        )}`,
      env,
      {
        is_read: true,
        read_at:
          new Date().toISOString(),
      },
      accessToken,
    );

  if (result.error) {
    return {
      success: false,
      data: null,
      error: result.error,
    };
  }

  return {
    success: true,
    data:
      result.data?.[0] ?? null,
    error: null,
  };
}
