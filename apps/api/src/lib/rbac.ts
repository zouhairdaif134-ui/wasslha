/**
 * WASSLHA
 * Backend RBAC Foundation
 *
 * Resolves user roles from the database.
 * Authorization decisions remain server-side.
 * Berrechid MVP.
 */

export interface RbacEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

export interface UserRole {
  id: string;
  name: string;
}

export interface RbacResult {
  resolved: boolean;
  roles: UserRole[];
  error: string | null;
}

async function queryUserRoles(
  userId: string,
  accessToken: string,
  env: RbacEnv,
): Promise<RbacResult> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return {
      resolved: false,
      roles: [],
      error: "Supabase authorization is not configured",
    };
  }

  try {
    const url =
      `${env.SUPABASE_URL.replace(/\/$/, "")}` +
      `/rest/v1/user_roles` +
      `?select=role_id,roles(id,name)` +
      `&user_id=eq.${encodeURIComponent(userId)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: env.SUPABASE_ANON_KEY,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        resolved: false,
        roles: [],
        error: "Unable to resolve user roles",
      };
    }

    const rows = (await response.json()) as Array<{
      role_id?: string;
      roles?: {
        id?: string;
        name?: string;
      } | null;
    }>;

    const roles: UserRole[] = [];

    for (const row of rows) {
      if (
        row.roles?.id &&
        row.roles.name
      ) {
        roles.push({
          id: row.roles.id,
          name: row.roles.name,
        });
      }
    }

    return {
      resolved: true,
      roles,
      error: null,
    };
  } catch (error) {
    console.error("RBAC role resolution error", error);

    return {
      resolved: false,
      roles: [],
      error: "Authorization service unavailable",
    };
  }
}

export async function resolveUserRoles(
  userId: string,
  accessToken: string,
  env: RbacEnv,
): Promise<RbacResult> {
  return queryUserRoles(
    userId,
    accessToken,
    env,
  );
}

export function hasRole(
  roles: UserRole[],
  roleName: string,
): boolean {
  return roles.some(
    (role) => role.name === roleName,
  );
}

export function hasAnyRole(
  roles: UserRole[],
  roleNames: string[],
): boolean {
  return roleNames.some((roleName) =>
    hasRole(roles, roleName),
  );
}

export function hasAllRoles(
  roles: UserRole[],
  roleNames: string[],
): boolean {
  return roleNames.every((roleName) =>
    hasRole(roles, roleName),
  );
}
