import { SyncStatus, UserRole } from "@prisma/client";
import type { AccessContext } from "@/types/access";
import {
  notificationScenarioConfigSchema,
  notificationScenarioMutationSchema,
  type NotificationScenarioConfigInput,
  type NotificationScenarioMutationInput
} from "@/lib/validators/notification-scenario";
import { notificationRepository } from "@/repositories/notification-repository";
import { prisma } from "@/lib/db/prisma";
import { MakeWebhookService } from "@/services/make-webhook-service";

export class NotificationService {
  constructor(private readonly makeWebhookService = new MakeWebhookService()) {}

  async listScenarios(access: AccessContext) {
    if (!access.isAdmin) {
      throw new Error("Admin access required");
    }

    return notificationRepository.listScenarios();
  }

  async getAssignedScenario(access: AccessContext) {
    if (access.isAdmin) {
      throw new Error("Admins do not have a tenant notification scenario");
    }

    const user = await notificationRepository.getAssignedScenarioForUser(access.user.id);
    return user?.notificationScenario ?? null;
  }

  async updateAssignedScenario(access: AccessContext, input: NotificationScenarioMutationInput, requestId: string) {
    if (access.isAdmin || !access.notificationScenarioId || !access.domainId) {
      throw new Error("No editable notification scenario is assigned to this user");
    }

    const validated = notificationScenarioMutationSchema.parse(input);
    const updated = await notificationRepository.updateScenarioContacts(access.notificationScenarioId, validated);

    if (updated.domainId !== access.domainId) {
      throw new Error("Access denied for the requested notification scenario");
    }

    await prisma.auditLog.create({
      data: {
        actorId: access.user.id,
        domainId: access.domainId,
        actorRole: access.user.role as UserRole,
        actionType: "UPDATED",
        objectType: "notification_scenario",
        objectId: updated.id,
        afterJson: {
          contactCount: updated.contacts.length,
          makeScenarioId: updated.makeScenarioId
        },
        syncStatus: SyncStatus.PENDING,
        requestId,
        message: "Updated notification recipients"
      }
    });

    await this.makeWebhookService.syncScenarioContacts(updated);

    return updated;
  }

  async updateScenarioConfig(access: AccessContext, input: NotificationScenarioConfigInput) {
    if (!access.isAdmin) {
      throw new Error("Admin access required");
    }

    const validated = notificationScenarioConfigSchema.parse(input);

    return notificationRepository.updateScenarioConfig({
      id: validated.id,
      makeScenarioId: validated.makeScenarioId,
      makeWebhookUrl: validated.makeWebhookUrl || null,
      makeAuthHeaderName: validated.makeAuthHeaderName || null,
      makeAuthHeaderValue: validated.makeAuthHeaderValue || null
    });
  }
}
