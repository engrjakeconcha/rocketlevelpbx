import { describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { assertDomainAccess } from "@/lib/tenant/guards";
import type { AccessContext } from "@/types/access";

function createContext(overrides: Partial<AccessContext>): AccessContext {
  return {
    user: {
      id: "user_1",
      email: "customer@example.com",
      name: "Customer",
      role: UserRole.CUSTOMER
    },
    membership: null,
    isAdmin: false,
    domainId: "domain_1",
    domainSlug: "domain-one",
    ...overrides
  };
}

describe("tenant access boundaries", () => {
  it("blocks customer access to a different domain", () => {
    const context = createContext({});
    expect(() => assertDomainAccess(context, "domain_2")).toThrow("Access denied");
  });

  it("allows admins to access every domain", () => {
    const context = createContext({
      isAdmin: true,
      domainId: null,
      domainSlug: null,
      user: {
        id: "admin_1",
        email: "admin@example.com",
        name: "Admin",
        role: UserRole.ADMIN
      }
    });

    expect(() => assertDomainAccess(context, "domain_2")).not.toThrow();
  });
});
