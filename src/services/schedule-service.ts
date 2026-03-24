import { AuditActionType } from "@prisma/client";
import { scheduleRepository } from "@/repositories/schedule-repository";
import { auditRepository } from "@/repositories/audit-repository";
import { prisma } from "@/lib/db/prisma";
import { scheduleMutationSchema, type ScheduleMutationInput } from "@/lib/validators/schedule";
import { assertDomainAccess } from "@/lib/tenant/guards";
import type { AccessContext } from "@/types/access";
import { SyncService } from "@/services/sync-service";
import { RoutingEngineClient } from "@/services/routing-engine-client";
import { toJsonValue } from "@/lib/utils/json";

export class ScheduleService {
  constructor(
    private readonly syncService = new SyncService(),
    private readonly routingClient = new RoutingEngineClient()
  ) {}

  async getSchedule(access: AccessContext, domainId: string) {
    assertDomainAccess(access, domainId);
    const schedule = await scheduleRepository.getPrimaryTemplate(domainId);

    if (!schedule) {
      return null;
    }

    const mapping = await prisma.backendMapping.findFirst({
      where: {
        domainId,
        mappingType: "SCHEDULE_TEMPLATE",
        internalKey: schedule.id
      }
    });

    let routingTimeframes: Awaited<ReturnType<RoutingEngineClient["listManagedScheduleTimeframes"]>> = [];
    let routingTimeframesError: string | null = null;

    if (mapping?.metadataJson) {
      try {
        routingTimeframes = await this.routingClient.listManagedScheduleTimeframes(mapping.metadataJson);
      } catch (error) {
        routingTimeframesError = error instanceof Error ? error.message : "Unable to load routing timeframes";
      }
    }

    return {
      ...schedule,
      routingTimeframes,
      routingTimeframesError
    };
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
        metadata: mapping.metadataJson,
        payload: updated,
        requestedByUserId: access.user.id
      });
    }

    return updated;
  }
}
