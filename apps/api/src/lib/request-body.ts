/**
 * WASSLHA
 * Backend Request Body Foundation
 *
 * Safe JSON request-body parsing helpers.
 * Backend validation remains authoritative.
 *
 * Berrechid MVP.
 */

import {
  badRequest,
} from "./errors";

export async function parseJsonBody(
  request: Request,
): Promise<unknown> {
  const contentType =
    request.headers.get("Content-Type") || "";

  if (
    !contentType
      .toLowerCase()
      .includes("application/json")
  ) {
    throw badRequest(
      "Content-Type must be application/json",
    );
  }

  try {
    return await request.json();
  } catch {
    throw badRequest(
      "Request body contains invalid JSON",
    );
  }
}

export async function parseJsonObjectBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const body =
    await parseJsonBody(request);

  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw badRequest(
      "Request body must be a JSON object",
    );
  }

  return body as Record<
    string,
    unknown
  >;
}
