/**
 * WASSLHA
 * Backend Route Helpers
 *
 * Centralized route matching helpers for the API.
 *
 * Berrechid MVP.
 */

export interface RouteMatch {
  matched: boolean;
  params: Record<string, string>;
}

function normalizePath(
  path: string,
): string[] {
  return path
    .split("/")
    .filter(
      (segment) =>
        segment.length > 0,
    );
}

export function matchRoute(
  requestPath: string,
  routePath: string,
): RouteMatch {
  const requestSegments =
    normalizePath(
      requestPath,
    );

  const routeSegments =
    normalizePath(
      routePath,
    );

  if (
    requestSegments.length !==
    routeSegments.length
  ) {
    return {
      matched: false,
      params: {},
    };
  }

  const params: Record<
    string,
    string
  > = {};

  for (
    let index = 0;
    index <
      routeSegments.length;
    index += 1
  ) {
    const routeSegment =
      routeSegments[index];

    const requestSegment =
      requestSegments[index];

    if (
      routeSegment.startsWith(":")
    ) {
      const paramName =
        routeSegment.slice(1);

      if (
        paramName.length === 0
      ) {
        return {
          matched: false,
          params: {},
        };
      }

      params[paramName] =
        decodeURIComponent(
          requestSegment,
        );

      continue;
    }

    if (
      routeSegment !==
      requestSegment
    ) {
      return {
        matched: false,
        params: {},
      };
    }
  }

  return {
    matched: true,
    params,
  };
}

export function getRouteParam(
  match: RouteMatch,
  name: string,
): string | null {
  const value =
    match.params[name];

  return value !== undefined
    ? value
    : null;
}
