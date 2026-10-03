/**
 * WASSLHA API
 * Backend Core — API Foundation + Authentication Middleware
 * Berrechid MVP
 */

import {
  authenticateRequest,
  type AuthUser,
} from "./lib/auth";

export interface Env {
  ENVIRONMENT: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

type JsonValue = Record<string, unknown>;

const API_PREFIX = "/api/v1";

function json(
  data: JsonValue,
  status = 200,
  requestId?: string,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(requestId ? { "X-Request-ID": requestId } : {}),
    },
  });
}

function getRequestId(request: Request): string {
  return (
    request.headers.get("X-Request-ID") ||
    crypto.randomUUID()
  );
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);

  headers.set("Access-Control-Allow-Origin", "*");
  headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Request-ID, Idempotency-Key",
  );
  headers.set("Access-Control-Max-Age", "86400");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function unauthorized(
  requestId: string,
  message = "Authentication required",
): Response {
  return json(
    {
      error: {
        code: "UNAUTHORIZED",
        message,
      },
    },
    401,
    requestId,
  );
}

function notFound(requestId: string): Response {
  return json(
    {
      error: {
        code: "NOT_FOUND",
        message: "API route not found",
      },
    },
    404,
    requestId,
  );
}

function methodNotAllowed(
  requestId: string,
  allowed: string[],
): Response {
  const response = json(
    {
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "HTTP method not allowed",
      },
    },
    405,
    requestId,
  );

  const headers = new Headers(response.headers);
  headers.set("Allow", allowed.join(", "));

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

function authenticatedUserResponse(
  user: AuthUser,
  requestId: string,
): Response {
  return json(
    {
      data: {
        user: {
          id: user.id,
          email: user.email ?? null,
          phone: user.phone ?? null,
          user_metadata: user.user_metadata ?? {},
        },
      },
    },
    200,
    requestId,
  );
}

async function handleApiRequest(
  request: Request,
  env: Env,
  requestId: string,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  /*
   * Public API root
   */
  if (path === API_PREFIX || path === `${API_PREFIX}/`) {
    if (method !== "GET") {
      return methodNotAllowed(requestId, ["GET"]);
    }

    return json(
      {
        name: "WASSLHA API",
        version: "v1",
        environment: env.ENVIRONMENT,
        status: "ok",
      },
      200,
      requestId,
    );
  }

  /*
   * Public health endpoint
   */
  if (path === `${API_PREFIX}/health`) {
    if (method !== "GET") {
      return methodNotAllowed(requestId, ["GET"]);
    }

    return json(
      {
        status: "ok",
        service: "wasslha-api",
        version: "v1",
        environment: env.ENVIRONMENT,
        timestamp: new Date().toISOString(),
        request_id: requestId,
      },
      200,
      requestId,
    );
  }

  /*
   * Public readiness endpoint
   */
  if (path === `${API_PREFIX}/ready`) {
    if (method !== "GET") {
      return methodNotAllowed(requestId, ["GET"]);
    }

    const supabaseConfigured =
      Boolean(env.SUPABASE_URL) &&
      Boolean(env.SUPABASE_ANON_KEY);

    return json(
      {
        status: supabaseConfigured ? "ready" : "degraded",
        service: "wasslha-api",
        checks: {
          api: "ok",
          supabase: supabaseConfigured
            ? "configured"
            : "not_configured",
        },
        timestamp: new Date().toISOString(),
        request_id: requestId,
      },
      supabaseConfigured ? 200 : 503,
      requestId,
    );
  }

  /*
   * Authentication routes
   */
  if (path === `${API_PREFIX}/auth/me`) {
    if (method !== "GET") {
      return methodNotAllowed(requestId, ["GET"]);
    }

    const auth = await authenticateRequest(request, env);

    if (!auth.authenticated || !auth.user) {
      return unauthorized(
        requestId,
        auth.error || "Authentication required",
      );
    }

    return authenticatedUserResponse(
      auth.user,
      requestId,
    );
  }

  /*
   * Protected API namespace.
   *
   * All future authenticated application routes
   * will pass through this authentication boundary.
   */
  if (path.startsWith(`${API_PREFIX}/`)) {
    const auth = await authenticateRequest(request, env);

    if (!auth.authenticated || !auth.user) {
      return unauthorized(
        requestId,
        auth.error || "Authentication required",
      );
    }

    /*
     * Authentication is valid.
     *
     * RBAC, permissions and module-specific handlers
     * will be added here in the next backend stages.
     */
    return notFound(requestId);
  }

  return notFound(requestId);
}

export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {
    const requestId = getRequestId(request);

    try {
      if (request.method.toUpperCase() === "OPTIONS") {
        return withCors(
          new Response(null, {
            status: 204,
            headers: {
              "X-Request-ID": requestId,
            },
          }),
        );
      }

      const response = await handleApiRequest(
        request,
        env,
        requestId,
      );

      return withCors(response);
    } catch (error) {
      console.error("Unhandled API error", {
        requestId,
        error,
      });

      return withCors(
        json(
          {
            error: {
              code: "INTERNAL_SERVER_ERROR",
              message: "An unexpected error occurred",
            },
            request_id: requestId,
          },
          500,
          requestId,
        ),
      );
    }
  },
};

