/**
 * WASSLHA
 * Product Service
 *
 * Server-side product operations for merchants
 * and the marketplace.
 *
 * Berrechid MVP.
 */

import {
  databaseGet,
  databaseInsert,
  databaseUpdate,
  type DatabaseEnv,
} from "../lib/database";

export interface ProductServiceEnv
  extends DatabaseEnv {}

export interface Product {
  id: string;
  store_id: string;
  category_id?: string | null;
  name?: string | null;
  description?: string | null;
  price_minor?: number | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function getStoreProducts(
  storeId: string,
  env: ProductServiceEnv,
  accessToken: string,
): Promise<
  ProductServiceResult<Product[]>
> {
  const result =
    await databaseGet<Product[]>(
      `/rest/v1/products` +
        `?select=*` +
        `&store_id=eq.${encodeURIComponent(
          storeId,
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

export async function getProduct(
  productId: string,
  env: ProductServiceEnv,
  accessToken: string,
): Promise<
  ProductServiceResult<Product | null>
> {
  const result =
    await databaseGet<Product[]>(
      `/rest/v1/products` +
        `?select=*` +
        `&id=eq.${encodeURIComponent(
          productId,
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

export async function createProduct(
  storeId: string,
  env: ProductServiceEnv,
  accessToken: string,
  product: Omit<
    Product,
    "id" |
      "store_id" |
      "created_at" |
      "updated_at"
  >,
): Promise<
  ProductServiceResult<Product | null>
> {
  const result =
    await databaseInsert<Product[]>(
      `/rest/v1/products`,
      env,
      {
        ...product,
        store_id: storeId,
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

export async function updateProduct(
  productId: string,
  storeId: string,
  env: ProductServiceEnv,
  accessToken: string,
  updates: Partial<
    Pick<
      Product,
      | "category_id"
      | "name"
      | "description"
      | "price_minor"
      | "is_active"
    >
  >,
): Promise<
  ProductServiceResult<Product | null>
> {
  const result =
    await databaseUpdate<Product[]>(
      `/rest/v1/products` +
        `?id=eq.${encodeURIComponent(
          productId,
        )}` +
        `&store_id=eq.${encodeURIComponent(
          storeId,
        )}`,
      env,
      updates,
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
