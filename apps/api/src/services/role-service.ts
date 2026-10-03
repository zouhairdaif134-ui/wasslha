/**
 * WASSLHA
 * Role Service
 *
 * Server-side role operations.
 *
 * Berrechid MVP.
 */

import {
  databaseGet,
  type DatabaseEnv,
} from "../lib/database";

export interface RoleServiceEnv
  extends DatabaseEnv {}

export interface Role {
  id: string;
  name: string;
  created_at?: string;
}

export interface RoleServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function getUserRoles(
  userId: string,
  env: RoleServiceEnv,
  accessToken: string,
): Promise<
  RoleServiceResult<Role[]>
> {
  const result =
    await databaseGet<
      Array<{
        role_id?: string;
        roles?: Role | null;
      }>
    >(
      `/rest/v1/user_roles` +
        `?select=role_id,roles(id,name,created_at)` +
        `&user_id=eq.${encodeURIComponent(
          userId,
        )}`,
      env,
      accessToken,
    );

  if (
    result.error
  ) {
    return {
      success: false,
      data: null,
      error:
        result.error,
    };
  }

  const roles: Role[] = [];

  for (
    const row of
      result.data ?? []
  ) {
    if (
      row.roles?.id &&
      row.roles.name
    ) {
      roles.push(
        row.roles,
      );
    }
  }

  return {
    success: true,
    data: roles,
    error: null,
  };
}

export async function hasUserRole(
  userId: string,
  roleName: string,
  env: RoleServiceEnv,
  accessToken: string,
): Promise<
  RoleServiceResult<boolean>
> {
  const result =
    await databaseGet<
      Array<{
        role_id?: string;
        roles?: {
          id?: string;
          name?: string;
        } | null;
      }>
    >(
      `/rest/v1/user_roles` +
        `?select=role_id,roles(id,name)` +
        `&user_id=eq.${encodeURIComponent(
          userId,
        )}` +
        `&roles.name=eq.${encodeURIComponent(
          roleName,
        )}`,
      env,
      accessToken,
    );

  if (
    result.error
  ) {
    return {
      success: false,
      data: null,
      error:
        result.error,
    };
  }

  return {
    success: true,
    data:
      (result.data?.length ??
        0) > 0,
    error: null,
  };
}
