/**
 * WASSLHA
 * Category Service
 *
 * Server-side marketplace category operations.
 *
 * Berrechid MVP.
 */

import {
  databaseGet,
  type DatabaseEnv,
} from "../lib/database";

export interface CategoryServiceEnv
  extends DatabaseEnv {}

export interface Category {
  id: string;
  parent_id?: string | null;
  name_ar: string;
  name_fr: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function getCategories(
  env: CategoryServiceEnv,
  accessToken?: string,
): Promise<
  CategoryServiceResult<Category[]>
> {
  const result =
    await databaseGet<Category[]>(
      `/rest/v1/categories` +
        `?select=*` +
        `&is_active=eq.true` +
        `&order=sort_order.asc,created_at.asc`,
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

export async function getCategory(
  categoryId: string,
  env: CategoryServiceEnv,
  accessToken?: string,
): Promise<
  CategoryServiceResult<Category | null>
> {
  const result =
    await databaseGet<Category[]>(
      `/rest/v1/categories` +
        `?select=*` +
        `&id=eq.${encodeURIComponent(
          categoryId,
        )}` +
        `&limit=1`,
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
    data:
      result.data?.[0] ?? null,
    error: null,
  };
}
