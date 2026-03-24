import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationService } from "@/services/notification-service";
import { notificationRepository } from "@/repositories/notification-repository";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/repositories/notification-repository", () => ({
  notificationRepository: {
    getAssignedScenarioForUser: vi.fn(),
    updateScenarioContacts: vi.fn()
  }
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn()
    }
  }
}));

describe("NotificationService", () => {
  const customerAccess = {
    user: {
      id: "user_1",
      email: "pbxsupport@rocketlevelcommercial.com",
      name: "Servpro Team Brandon",
      role: "CUSTOMER" as const
    },
    membership: null,
    isAdmin: false,
    domainId: "domain_1",
    domainSlug: "servpro-team-drake",
    notificationScenarioId: "scenario_1",
    notificationScenarioName: "Primary Alert Notifications"
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the assigned notification scenario for a customer", async () => {
    vi.mocked(notificationRepository.getAssignedScenarioForUser).mockResolvedValue({
      id: "user_1",
      notificationScenario: {
        id: "scenario_1",
        name: "Primary Alert Notifications",
        makeScenarioId: "make-servpro-primary",
        domainId: "domain_1",
        contacts: []
      }
    } as never);

    const scenario = await new NotificationService().getAssignedScenario(customerAccess);

    expect(scenario?.name).toBe("Primary Alert Notifications");
  });

  it("blocks admins from editing a tenant notification scenario", async () => {
    const service = new NotificationService();

    await expect(
      service.updateAssignedScenario(
        {
          ...customerAccess,
          isAdmin: true,
          domainId: null,
          domainSlug: null,
          notificationScenarioId: null,
          notificationScenarioName: null,
          user: {
            ...customerAccess.user,
            role: "ADMIN" as const
          }
        },
        { contacts: [] },
        "req_1"
      )
    ).rejects.toThrow("No editable notification scenario");
  });

  it("updates the assigned scenario contacts for a customer", async () => {
    vi.mocked(notificationRepository.updateScenarioContacts).mockResolvedValue({
      id: "scenario_1",
      name: "Primary Alert Notifications",
      makeScenarioId: "make-servpro-primary",
      domainId: "domain_1",
      contacts: [
        {
          id: "contact_1",
          label: "Primary Alert Email",
          channel: "EMAIL",
          destination: "pbxsupport@rocketlevelcommercial.com",
          sortOrder: 1,
          isActive: true
        }
      ]
    } as never);

    const scenario = await new NotificationService().updateAssignedScenario(
      customerAccess,
      {
        contacts: [
          {
            id: "contact_1",
            label: "Primary Alert Email",
            channel: "EMAIL",
            destination: "pbxsupport@rocketlevelcommercial.com",
            sortOrder: 1,
            isActive: true
          }
        ]
      },
      "req_2"
    );

    expect(notificationRepository.updateScenarioContacts).toHaveBeenCalledWith("scenario_1", expect.any(Object));
    expect(prisma.auditLog.create).toHaveBeenCalled();
    expect(scenario.contacts).toHaveLength(1);
  });
});
