import { AuditActionType, Prisma, SyncStatus } from "@prisma/client";
import type { AccessContext } from "@/types/access";
import { prisma } from "@/lib/db/prisma";
import { normalizePhoneNumber } from "@/lib/utils/phone";
import { toJsonValue } from "@/lib/utils/json";
import { auditRepository } from "@/repositories/audit-repository";
import { adminRepository } from "@/repositories/admin-repository";
import { RoutingEngineClient } from "@/services/routing-engine-client";

function extractDigits(value: string) {
  return value.replace(/\D/g, "");
}

function extractPhoneLikeDigits(value: string) {
  const digits = extractDigits(value);

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  if (digits.length >= 10) {
    return digits.slice(0, 10);
  }

  return digits;
}

function inferQueueExternalId(args: {
  timeframeName: string;
  queues: Array<{
    externalId: string;
    name: string;
    extension?: string | null;
    members: Array<{ destinationNumber: string }>;
  }>;
}) {
  const timeframeDigits = extractPhoneLikeDigits(args.timeframeName);

  if (!timeframeDigits) {
    return null;
  }

  for (const queue of args.queues) {
    const memberMatch = queue.members.some((member) => extractPhoneLikeDigits(member.destinationNumber).endsWith(timeframeDigits));
    const queueMatch =
      extractDigits(queue.name).includes(timeframeDigits) ||
      extractDigits(queue.extension ?? "").includes(timeframeDigits) ||
      extractDigits(queue.externalId).includes(timeframeDigits);

    if (memberMatch || queueMatch) {
      return queue.externalId;
    }
  }

  return null;
}

export class AdminRoutingImportService {
  constructor(private readonly routingClient = new RoutingEngineClient()) {}

  async importDomainSnapshot(access: AccessContext, domainId: string, requestId: string) {
    if (!access.isAdmin) {
      throw new Error("Only admins can import routing snapshots");
    }

    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      include: {
        backendMappings: true,
        routingTimeframes: {
          include: {
            assignment: {
              include: {
                routingQueue: true
              }
            }
          }
        }
      }
    });

    if (!domain) {
      throw new Error("Domain not found");
    }

    const scheduleMapping = domain.backendMappings.find((mapping) => mapping.mappingType === "SCHEDULE_TEMPLATE");
    const metadata = (scheduleMapping?.metadataJson ?? {}) as { domain?: string; user?: string } | null;

    if (!metadata?.domain) {
      throw new Error("This domain is missing the live routing domain mapping");
    }

    const [timeframes, callqueues] = await Promise.all([
      this.routingClient.listEditableTimeframes({
        domain: metadata.domain,
        user: metadata.user
      }),
      this.routingClient.listDomainCallqueues({
        domain: metadata.domain
      })
    ]);

    type ImportedQueue = Awaited<ReturnType<RoutingEngineClient["listDomainCallqueues"]>>[number];
    type ImportedQueueMember = Awaited<ReturnType<RoutingEngineClient["listCallqueueMembers"]>>[number];

    const queuesWithMembers = await Promise.all(
      callqueues.map(async (queue: ImportedQueue) => {
        const members = await this.routingClient.listCallqueueMembers({
          domain: metadata.domain as string,
          callqueue: queue.id
        });

        return {
          externalId: queue.id,
          name: queue.name,
          extension: queue.extension,
          linearRoutingEnabled: queue.linearRoutingEnabled,
          snapshotJson: toJsonValue(queue.snapshot) as Prisma.InputJsonValue,
          members: members.map((member: ImportedQueueMember) => ({
            externalId: member.externalId,
            displayLabel: member.displayLabel,
            destinationNumber: normalizePhoneNumber(member.destinationNumber),
            enabled: member.enabled,
            requestConfirmationEnabled: member.requestConfirmationEnabled,
            sortOrder: member.sortOrder
          }))
        };
      })
    );

    const existingAssignments = new Map(
      domain.routingTimeframes
        .filter((timeframe) => timeframe.assignment?.routingQueue.externalId)
        .map((timeframe) => [timeframe.externalId, timeframe.assignment?.routingQueue.externalId as string])
    );

    const assignments = timeframes
      .map((timeframe) => {
        const preservedQueueExternalId =
          existingAssignments.get(timeframe.id) ??
          inferQueueExternalId({
            timeframeName: timeframe.name,
            queues: queuesWithMembers
          });

        if (!preservedQueueExternalId) {
          return null;
        }

        return {
          timeframeExternalId: timeframe.id,
          queueExternalId: preservedQueueExternalId,
          locked: true
        };
      })
      .filter((assignment): assignment is NonNullable<typeof assignment> => Boolean(assignment));

    const unmatchedTimeframes = timeframes.filter(
      (timeframe) => !assignments.some((assignment) => assignment.timeframeExternalId === timeframe.id)
    );
    const remainingQueueExternalIds = queuesWithMembers
      .map((queue) => queue.externalId)
      .filter((queueExternalId) => !assignments.some((assignment) => assignment.queueExternalId === queueExternalId));

    if (unmatchedTimeframes.length === 1 && remainingQueueExternalIds.length === 1) {
      assignments.push({
        timeframeExternalId: unmatchedTimeframes[0].id,
        queueExternalId: remainingQueueExternalIds[0],
        locked: true
      });
    }

    const imported = await adminRepository.importRoutingSnapshot({
      domainId,
      timeframes: timeframes.map((timeframe) => ({
        externalId: timeframe.id,
        name: timeframe.name,
        scope: timeframe.scope === "domain" ? "DOMAIN" : "USER",
        snapshotJson: toJsonValue({
          entries: timeframe.entries
        }) as Prisma.InputJsonValue
      })),
      queues: queuesWithMembers,
      assignments
    });

    await prisma.syncJob.create({
      data: {
        domainId,
        resourceType: "routing_snapshot",
        resourceId: domainId,
        operation: "import",
        status: SyncStatus.SUCCESS,
        requestedByUserId: access.user.id,
        completedAt: new Date()
      }
    });

    await auditRepository.create({
      actorId: access.user.id,
      actorRole: access.user.role,
      domainId,
      actionType: AuditActionType.SYNCED,
      objectType: "routing_snapshot",
      objectId: domainId,
      afterJson: toJsonValue({
        backendDomain: metadata.domain,
        timeframeCount: timeframes.length,
        queueCount: queuesWithMembers.length,
        assignmentCount: assignments.length
      }),
      requestId,
      syncStatus: SyncStatus.SUCCESS,
      message: "Imported live timeframes and linked on-call technician queues"
    });

    return {
      backendDomain: metadata.domain,
      timeframeCount: imported.routingTimeframes.length,
      queueCount: imported.routingQueues.length,
      assignmentCount: imported.routingTimeframes.filter((timeframe) => Boolean(timeframe.assignment)).length
    };
  }
}
