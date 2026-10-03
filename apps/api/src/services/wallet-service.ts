/**
 * WASSLHA
 * Wallet Service
 *
 * Server-side wallet read operations.
 * Financial writes remain backend-controlled.
 *
 * Berrechid MVP.
 */

import {
  databaseGet,
  type DatabaseEnv,
} from "../lib/database";

export interface WalletServiceEnv
  extends DatabaseEnv {}

export interface Wallet {
  id: string;
  user_id: string;
  balance_minor: number;
  currency: string;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  transaction_type?: string | null;
  amount_minor?: number | null;
  balance_after_minor?: number | null;
  currency?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  created_at?: string;
}

export interface WalletServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function getUserWallet(
  userId: string,
  env: WalletServiceEnv,
  accessToken: string,
): Promise<
  WalletServiceResult<Wallet | null>
> {
  const result =
    await databaseGet<Wallet[]>(
      `/rest/v1/wallets` +
        `?select=*` +
        `&user_id=eq.${encodeURIComponent(
          userId,
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

export async function getWalletTransactions(
  walletId: string,
  env: WalletServiceEnv,
  accessToken: string,
): Promise<
  WalletServiceResult<WalletTransaction[]>
> {
  const result =
    await databaseGet<WalletTransaction[]>(
      `/rest/v1/wallet_transactions` +
        `?select=*` +
        `&wallet_id=eq.${encodeURIComponent(
          walletId,
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

export async function getWalletBalance(
  userId: string,
  env: WalletServiceEnv,
  accessToken: string,
): Promise<
  WalletServiceResult<number | null>
> {
  const wallet =
    await getUserWallet(
      userId,
      env,
      accessToken,
    );

  if (!wallet.success) {
    return {
      success: false,
      data: null,
      error: wallet.error,
    };
  }

  return {
    success: true,
    data:
      wallet.data?.balance_minor ??
      null,
    error: null,
  };
}
