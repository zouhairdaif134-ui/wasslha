/**
 * WASSLHA
 * Backend Idempotency Types
 *
 * Shared types for idempotent API operations.
 *
 * Berrechid MVP.
 */

export type IdempotencyStatus =
  | "processing"
  | "completed"
  | "failed";

export interface IdempotencyRecord {
  key: string;
  userId: string | null;
  requestHash: string;
  status: IdempotencyStatus;
  responseStatus: number | null;
  responseBody: unknown | null;
  createdAt: string;
  completedAt: string | null;
}

export interface IdempotencyCheckResult {
  exists: boolean;
  record: IdempotencyRecord | null;
}

export interface IdempotencyOperation {
  key: string;
  userId: string | null;
  requestHash: string;
}

export interface IdempotencyResponse {
  status: number;
  body: unknown;
}
