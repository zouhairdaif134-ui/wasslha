/**
 * WASSLHA
 * Backend Pagination Foundation
 *
 * Standard server-side pagination helpers.
 *
 * Berrechid MVP.
 */

import {
  validatePagination,
} from "./validation";

export interface PaginationInput {
  page?: unknown;
  limit?: unknown;
}

export interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

export function createPagination(
  input: PaginationInput = {},
): Pagination {
  const result =
    validatePagination(
      input.page,
      input.limit,
    );

  if (!result.valid || !result.data) {
    throw new Error(
      result.errors.join("; "),
    );
  }

  const { page, limit } =
    result.data;

  return {
    page,
    limit,
    offset:
      (page - 1) * limit,
  };
}

export function createPaginationMeta(
  pagination: Pagination,
  total: number,
): PaginationMeta {
  const safeTotal =
    Number.isFinite(total) &&
    total >= 0
      ? Math.floor(total)
      : 0;

  const totalPages =
    safeTotal === 0
      ? 0
      : Math.ceil(
          safeTotal /
            pagination.limit,
        );

  return {
    page: pagination.page,
    limit: pagination.limit,
    total: safeTotal,
    total_pages: totalPages,
    has_next_page:
      pagination.page <
      totalPages,
    has_previous_page:
      pagination.page > 1 &&
      totalPages > 0,
  };
}
