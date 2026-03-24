import { AuditActionType } from "@prisma/client";
import type { AccessContext } from "@/types/access";
import { assertDomainAccess } from "@/lib/tenant/guards";
import { prisma } from "@/lib/db/prisma";
import { normalizePhoneNumber } from "@/lib/utils/phone";
import { toJsonValue } from "@/lib/utils/json";
import { auditRepository } from "@/repositories/audit-repository";
import { timeframeQueueRepository } from "@/repositories/timeframe-queue-repository";
import { timeframeQueueMutationSchema, type TimeframeQueueMutationInput } from "@/lib/validators/timeframe-queue";
import { RoutingEngineClient } from "@/services/routing-engine-client";

export class TimeframeQueueService {
  constructor(private readonly routingClient = new RoutingEngineClient()) {}

  async updateLinkedQueue(access: AccessContext, domainId: string, input: TimeframeQueueMutationInput, requestId: string) {
    assertDomainAccess(access, domainId);
    const validated = timeframeQueueMutationSchema.parse(input);
    const mapping = await prisma.backendMapping.findFirst({
      where: {
        domainId,
        mappingType: "SCHEDULE_TEMPLATE"
      }
    });

    const domainMapping = mapping?.metadataJson as { domain?: string } | null;
    const normalizedMembers = validated.members.map((member, index) => ({
      ...member,
      destinationNumber: normalizePhoneNumber(member.destinationNumber),
      sortOrder: index + 1,
      requestConfirmationEnabled: member.requestConfirmationEnabled ?? true
    }));

    const updated = await timeframeQueueRepository.updateQueueMembers(domainId, {
      timeframeId: validated.timeframeId,
      members: normalizedMembers
    });

    if (domainMapping?.domain && updated.assignment?.routingQueue.externalId) {
      await this.routingClient.updateLinkedQueueMembers({
        domain: domainMapping.domain,
        callqueue: updated.assignment.routingQueue.externalId,
        members: updated.assignment.routingQueue.members.map((member) => ({
          destinationNumber: member.destinationNumber,
          displayLabel: member.displayLabel,
          sortOrder: member.sortOrder,
          enabled: member.enabled,
          requestConfirmationEnabled: member.requestConfirmationEnabled
        }))
      });
    }

    await auditRepository.create({
      actorId: access.user.id,
      actorRole: access.user.role,
      domainId,
      actionType: AuditActionType.UPDATED,
      objectType: "timeframe_queue",
      objectId: updated.id,
      afterJson: toJsonValue(updated),
      requestId,
      message: "Updated linked on-call technician queue members"
    });

    return updated;
  }
}
