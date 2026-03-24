import { describe, expect, it } from "vitest";
import { assertDomainAccess } from "@/lib/tenant/guards";

function createContext(overrides: Record<string, unknown>) {
  return {
    user: {
      id: "user_1",
      email: "customer@example.com",
      name: "Customer",
      role: "CUSTOMER"
    },
    membership: null,
    isAdmin: false,
    domainId: "domain_1",
    domainSlug: "domain-one",
    notificationScenarioId: "scenario_1",
    notificationScenarioName: "Primary Alert Notifications",
    ...overrides
  } as never;
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
      notificationScenarioId: null,
      notificationScenarioName: null,
      user: {
        id: "admin_1",
        email: "admin@example.com",
        name: "Admin",
        role: "ADMIN"
      }
    });

    expect(() => assertDomainAccess(context, "domain_2")).not.toThrow();
  });
});
