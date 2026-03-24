import type { Prisma } from "@prisma/client";
import type { BackendTimeframesMutationInput } from "@/lib/validators/schedule";
import type { TimeframeQueueMutationInput } from "@/lib/validators/timeframe-queue";
import { prisma } from "@/lib/db/prisma";

export const timeframeQueueRepository = {
  getDomainAssignments(domainId: string) {
    return prisma.routingTimeframe.findMany({
      where: { domainId },
      orderBy: { name: "asc" },
      include: {
        assignment: {
          include: {
            routingQueue: {
              include: {
                members: {
                  orderBy: { sortOrder: "asc" }
                }
              }
            }
          }
        }
      }
    });
  },

  async updateTimeframes(domainId: string, input: BackendTimeframesMutationInput) {
    return prisma.$transaction(async (tx) => {
      for (const timeframe of input.timeframes) {
        const existing = await tx.routingTimeframe.findFirst({
          where: {
            domainId,
            externalId: timeframe.id
          }
        });

        if (!existing) {
          throw new Error("Timeframe changes must target existing stored timeframes");
        }

        await tx.routingTimeframe.update({
          where: { id: existing.id },
          data: {
            name: timeframe.name,
            scope: timeframe.scope === "domain" ? "DOMAIN" : "USER",
            snapshotJson: {
              entries: timeframe.entries
            } as Prisma.InputJsonValue,
            lastSyncedAt: new Date()
          }
        });
      }

      return tx.routingTimeframe.findMany({
        where: { domainId },
        orderBy: { name: "asc" },
        include: {
          assignment: {
            include: {
              routingQueue: {
                include: {
                  members: {
                    orderBy: { sortOrder: "asc" }
                  }
                }
              }
            }
          }
        }
      });
    });
  },

  async updateQueueMembers(domainId: string, input: TimeframeQueueMutationInput) {
    return prisma.$transaction(async (tx) => {
      const timeframe = await tx.routingTimeframe.findFirst({
        where: {
          domainId,
          externalId: input.timeframeId
        },
        include: {
          assignment: {
            include: {
              routingQueue: {
                include: {
                  members: {
                    orderBy: { sortOrder: "asc" }
                  }
                }
              }
            }
          }
        }
      });

      if (!timeframe?.assignment?.routingQueue) {
        throw new Error("No linked queue exists for this timeframe");
      }

      const queue = timeframe.assignment.routingQueue;
      const existingIds = new Set(queue.members.map((member) => member.id));
      const submittedIds = new Set(input.members.map((member) => member.id).filter(Boolean) as string[]);

      for (const member of queue.members) {
        if (!submittedIds.has(member.id)) {
          await tx.routingQueueMember.delete({
            where: { id: member.id }
          });
        }
      }

      for (const member of input.members) {
        if (member.id) {
          if (!existingIds.has(member.id)) {
            throw new Error("Queue changes must target existing members or new additions without an id");
          }

          await tx.routingQueueMember.update({
            where: { id: member.id },
            data: {
              displayLabel: member.displayLabel,
              destinationNumber: member.destinationNumber,
              sortOrder: member.sortOrder,
              enabled: member.enabled,
              requestConfirmationEnabled: member.requestConfirmationEnabled
            }
          });
          continue;
        }

        await tx.routingQueueMember.create({
          data: {
            routingQueueId: queue.id,
            displayLabel: member.displayLabel,
            destinationNumber: member.destinationNumber,
            sortOrder: member.sortOrder,
            enabled: member.enabled,
            requestConfirmationEnabled: member.requestConfirmationEnabled,
            memberType: "EXTERNAL_NUMBER",
            externalId: member.destinationNumber
          }
        });
      }

      return tx.routingTimeframe.findFirstOrThrow({
        where: {
          domainId,
          externalId: input.timeframeId
        },
        include: {
          assignment: {
            include: {
              routingQueue: {
                include: {
                  members: {
                    orderBy: { sortOrder: "asc" }
                  }
                }
              }
            }
          }
        }
      });
    });
  }
};
