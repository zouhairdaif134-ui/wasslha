import { describe, expect, it } from "vitest";
import { authorize, hasPermission } from "./authorization";
import { PERMISSIONS } from "./permissions";
import type { RequestContext } from "./request-context";

const context = (roles:string[], authenticated=true):RequestContext => ({
  authenticated,
  user: authenticated ? { id:"user-1" } : null,
  accessToken: authenticated ? "token" : null,
  roles: roles.map((name,index)=>({id:`role-${index}`,name})),
  error: authenticated ? null : "Authentication required",
});

describe("API authorization",()=>{
  it("denies unauthenticated requests",()=>{
    const result=authorize(context([],false),PERMISSIONS.CUSTOMER_APP_ACCESS);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Authentication required");
  });

  it("denies authenticated users without a role",()=>{
    const result=authorize(context([]),PERMISSIONS.CUSTOMER_APP_ACCESS);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("No role assigned");
  });

  it("enforces role permissions",()=>{
    expect(hasPermission(context(["customer"]),PERMISSIONS.CUSTOMER_ORDERS_READ)).toBe(true);
    expect(hasPermission(context(["customer"]),PERMISSIONS.ADMIN_USERS_READ)).toBe(false);
    expect(hasPermission(context(["merchant"]),PERMISSIONS.MERCHANT_PRODUCTS_MANAGE)).toBe(true);
    expect(hasPermission(context(["rider"]),PERMISSIONS.RIDER_DELIVERIES_READ)).toBe(true);
  });
});
