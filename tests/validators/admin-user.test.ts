import { describe, expect, it } from "vitest";
import { adminUserSchema } from "@/lib/validators/admin-user";

describe("adminUserSchema", () => {
  it("requires customers to be linked to both a domain and a notification scenario", () => {
    const result = adminUserSchema.safeParse({
      name: "Customer User",
      email: "customer@example.com",
      password: "Password123!",
      role: "CUSTOMER",
      domainId: "domain_1",
      notificationScenarioId: null
    });

    expect(result.success).toBe(false);
  });

  it("rejects assigning a notification scenario to admins", () => {
    const result = adminUserSchema.safeParse({
      name: "Admin User",
      email: "admin@example.com",
      password: "Password123!",
      role: "ADMIN",
      domainId: null,
      notificationScenarioId: "scenario_1"
    });

    expect(result.success).toBe(false);
  });
});
