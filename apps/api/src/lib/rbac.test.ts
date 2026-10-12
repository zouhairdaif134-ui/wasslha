import { describe, expect, it, vi, afterEach } from "vitest";
import { resolveUserRoles, hasRole, hasAnyRole, hasAllRoles } from "./rbac";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RBAC helpers", () => {
  it("matches roles exactly", () => {
    const roles = [
      { id: "1", name: "customer" },
      { id: "2", name: "admin" },
    ];

    expect(hasRole(roles, "admin")).toBe(true);
    expect(hasRole(roles, "merchant")).toBe(false);
    expect(hasAnyRole(roles, ["rider", "admin"])).toBe(true);
    expect(hasAllRoles(roles, ["customer", "admin"])).toBe(true);
    expect(hasAllRoles(roles, ["customer", "rider"])).toBe(false);
  });

  it("rejects an inactive account during role resolution", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              role_id: "role-1",
              roles: { id: "role-1", code: "customer" },
              users: { is_active: false },
            },
          ]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    const result = await resolveUserRoles(
      "user-1",
      "access-token",
      {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_ANON_KEY: "anon-key",
      },
    );

    expect(result.resolved).toBe(false);
    expect(result.roles).toEqual([]);
    expect(result.error).toBe("Account is inactive");
  });

  it("resolves active user roles by lower-case role code", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            role_id: "role-1",
            roles: { id: "role-1", code: "customer" },
            users: { is_active: true },
          },
          {
            role_id: "role-2",
            roles: { id: "role-2", code: "Merchant" },
            users: { is_active: true },
          },
        ]),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveUserRoles(
      "user-1",
      "access-token",
      {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_ANON_KEY: "anon-key",
      },
    );

    expect(result.resolved).toBe(true);
    expect(result.error).toBeNull();
    expect(result.roles).toEqual([
      { id: "role-1", name: "customer" },
      { id: "role-2", name: "merchant" },
    ]);

    // Regression: the users embed must name the relationship (PostgREST 300 otherwise)
    // and roles must be read by code (roles.name is a capitalized display label).
    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestedUrl).toContain("users!user_roles_user_id_fkey!inner(is_active)");
    expect(requestedUrl).toContain("roles(id,code)");
  });
});
