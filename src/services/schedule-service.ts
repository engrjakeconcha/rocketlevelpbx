import { AuditActionType } from "@prisma/client";
import { scheduleRepository } from "@/repositories/schedule-repository";
import { auditRepository } from "@/repositories/audit-repository";
import { prisma } from "@/lib/db/prisma";
import { scheduleMutationSchema, type ScheduleMutationInput } from "@/lib/validators/schedule";
import { assertDomainAccess } from "@/lib/tenant/guards";
import type { AccessContext } from "@/types/access";
import { SyncService } from "@/services/sync-service";
import { toJsonValue } from "@/lib/utils/json";

export class ScheduleService {
  constructor(private readonly syncService = new SyncService()) {}

  async getSchedule(access: AccessContext, domainId: string) {
    assertDomainAccess(access, domainId);
    return scheduleRepository.getPrimaryTemplate(domainId);
  }

  async updateSchedule(access: AccessContext, domainId: string, input: ScheduleMutationInput, requestId: string) {
    assertDomainAccess(access, domainId);
    const validated = scheduleMutationSchema.parse(input);
    const template = await scheduleRepository.getPrimaryTemplate(domainId);

    if (!template) {
      throw new Error("No schedule template exists for this domain");
    }

    const updated = await scheduleRepository.updateTemplate(template.id, validated);
    const mapping = await prisma.backendMapping.findFirst({
      where: {
        domainId,
        mappingType: "SCHEDULE_TEMPLATE",
        internalKey: template.id
      }
    });

    await auditRepository.create({
      actorId: access.user.id,
      actorRole: access.user.role,
      domainId,
      actionType: AuditActionType.UPDATED,
      objectType: "schedule_template",
      objectId: updated.id,
      beforeJson: toJsonValue(template),
      afterJson: toJsonValue(updated),
      requestId,
      message: "Updated customer schedule settings"
    });

    if (mapping) {
      await this.syncService.syncSchedule({
        domainId,
        scheduleTemplateId: updated.id,
        externalRef: mapping.externalRef,
        payload: updated,
        requestedByUserId: access.user.id
      });
    }

    return updated;
  }
}
