/**
 * WASSLHA
 * Marketplace Service
 *
 * Server-side marketplace discovery operations.
 *
 * Berrechid MVP.
 */

import {
  databaseGet,
  type DatabaseEnv,
} from "../lib/database";

export interface MarketplaceServiceEnv
  extends DatabaseEnv {}

export interface MarketplaceProduct {
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

export interface MarketplaceServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function getMarketplaceProducts(
  env: MarketplaceServiceEnv,
  accessToken?: string,
  options: {
    categoryId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<
  MarketplaceServiceResult<MarketplaceProduct[]>
> {
  const limit =
    Number.isInteger(options.limit) &&
    options.limit! > 0 &&
    options.limit! <= 100
      ? options.limit!
      : 20;

  const offset =
    Number.isInteger(options.offset) &&
    options.offset! >= 0
      ? options.offset!
      : 0;

  const params = new URLSearchParams();

  params.set(
    "select",
    "*",
  );

  params.set(
    "is_active",
    "eq.true",
  );

  if (options.categoryId) {
    params.set(
      "category_id",
      `eq.${options.categoryId}`,
    );
  }

  if (
    options.search &&
    options.search.trim().length > 0
  ) {
    params.set(
      "name",
      `ilike.*${options.search.trim()}*`,
    );
  }

  params.set(
    "order",
    "created_at.desc",
  );

  params.set(
    "limit",
    String(limit),
  );

  params.set(
    "offset",
    String(offset),
  );

  const result =
    await databaseGet<MarketplaceProduct[]>(
      `/rest/v1/products?${params.toString()}`,
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

export async function getMarketplaceProduct(
  productId: string,
  env: MarketplaceServiceEnv,
  accessToken?: string,
): Promise<
  MarketplaceServiceResult<MarketplaceProduct | null>
> {
  const result =
    await databaseGet<MarketplaceProduct[]>(
      `/rest/v1/products` +
        `?select=*` +
        `&id=eq.${encodeURIComponent(
          productId,
        )}` +
        `&is_active=eq.true` +
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
