/**
 * WASSLHA
 * Backend Structured Logger
 *
 * Centralized server-side logging foundation.
 * Sensitive values must never be logged.
 *
 * Berrechid MVP.
 */

export type LogLevel =
  | "debug"
  | "info"
  | "warn"
  | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  module?: string;
  action?: string;
  resourceId?: string;
  environment?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

function writeLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
): void {
  const entry: LogEntry = {
    timestamp:
      new Date().toISOString(),
    level,
    message,
    ...(context
      ? {
          context,
        }
      : {}),
  };

  const serialized =
    JSON.stringify(entry);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  if (level === "debug") {
    console.debug(serialized);
    return;
  }

  console.log(serialized);
}

export function logDebug(
  message: string,
  context?: LogContext,
): void {
  writeLog(
    "debug",
    message,
    context,
  );
}

export function logInfo(
  message: string,
  context?: LogContext,
): void {
  writeLog(
    "info",
    message,
    context,
  );
}

export function logWarn(
  message: string,
  context?: LogContext,
): void {
  writeLog(
    "warn",
    message,
    context,
  );
}

export function logError(
  message: string,
  context?: LogContext,
): void {
  writeLog(
    "error",
    message,
    context,
  );
      }
