import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const adminRepository = {
  listUsers() {
    return prisma.user.findMany({
      include: {
        memberships: {
          include: { domain: true }
        },
        notificationScenario: true
      },
      orderBy: { email: "asc" }
    });
  },

  listDomains() {
    return prisma.domain.findMany({
      where: { isActive: true },
      include: {
        notificationScenarios: {
          where: { isActive: true },
          orderBy: { name: "asc" }
        }
      },
      orderBy: { description: "asc" }
    });
  },

  createUser(data: {
    email: string;
    name: string;
    passwordHash: string;
    role: "ADMIN" | "CUSTOMER";
    domainId?: string;
    notificationScenarioId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      if (data.role === "CUSTOMER") {
        if (!data.domainId || !data.notificationScenarioId) {
          throw new Error("Customers must be assigned to both a domain and a notification scenario");
        }

        const scenario = await tx.notificationScenario.findFirst({
          where: {
            id: data.notificationScenarioId,
            domainId: data.domainId,
            isActive: true
          }
        });

        if (!scenario) {
          throw new Error("The selected notification scenario does not belong to the chosen domain");
        }
      }

      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash: data.passwordHash,
          role: data.role,
          isActive: true,
          notificationScenarioId: data.role === "CUSTOMER" ? data.notificationScenarioId : undefined
        },
        include: {
          memberships: {
            include: { domain: true }
          },
          notificationScenario: true
        }
      });

      if (data.role === "CUSTOMER" && data.domainId) {
        await tx.membership.create({
          data: {
            userId: user.id,
            domainId: data.domainId,
            isPrimary: true
          }
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          memberships: {
            include: { domain: true }
          },
          notificationScenario: true
        }
      });
    });
  },

  async deleteUser(args: { userId: string; actingUserId: string }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: args.userId },
        include: {
          memberships: true
        }
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.id === args.actingUserId) {
        throw new Error("Admins cannot delete their own account");
      }

      if (user.role === "ADMIN") {
        const adminCount = await tx.user.count({
          where: {
            role: "ADMIN",
            isActive: true
          }
        });

        if (adminCount <= 1) {
          throw new Error("The last remaining admin cannot be deleted");
        }
      }

      await tx.user.delete({
        where: { id: user.id }
      });

      return user;
    });
  },

  listBackendMappings() {
    return prisma.backendMapping.findMany({
      include: { domain: true },
      orderBy: [{ domain: { name: "asc" } }, { mappingType: "asc" }]
    });
  },

  createBackendMapping(data: {
    domainId: string;
    mappingType: "DOMAIN" | "SCHEDULE_TEMPLATE" | "COVERAGE_GROUP" | "COVERAGE_MEMBER" | "OVERRIDE";
    internalKey: string;
    externalRef: string;
    metadataJson?: Prisma.InputJsonValue;
  }) {
    return prisma.backendMapping.create({
      data
    });
  },

  async importAccessibleDomains(
    domains: Array<{
      backendDomain: string;
      description: string;
      timezone: string;
      policy: {
        maxUsers: number;
        maxCallQueues: number;
      };
    }>
  ) {
    return prisma.$transaction(async (tx) => {
      const imported = [];

      for (const incoming of domains) {
        const existingScheduleMapping = await tx.backendMapping.findFirst({
          where: {
            mappingType: "SCHEDULE_TEMPLATE",
            metadataJson: {
              path: ["domain"],
              equals: incoming.backendDomain
            }
          },
          include: {
            domain: true
          }
        });

        const slugBase = incoming.backendDomain
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        let slug = slugBase;
        let slugSuffix = 2;

        while (true) {
          const conflict = await tx.domain.findFirst({
            where: {
              slug,
              ...(existingScheduleMapping?.domainId ? { id: { not: existingScheduleMapping.domainId } } : {})
            }
          });

          if (!conflict) {
            break;
          }

          slug = `${slugBase}-${slugSuffix}`;
          slugSuffix += 1;
        }

        const domain = existingScheduleMapping?.domain
          ? await tx.domain.update({
              where: { id: existingScheduleMapping.domainId },
              data: {
                name: incoming.description,
                description: incoming.description,
                slug,
                timezone: incoming.timezone,
                policyJson: {
                  maxUsers: incoming.policy.maxUsers,
                  maxCallQueues: incoming.policy.maxCallQueues
                }
              }
            })
          : await tx.domain.create({
              data: {
                name: incoming.description,
                description: incoming.description,
                slug,
                timezone: incoming.timezone,
                inboundNumber: null,
                isActive: true,
                policyJson: {
                  maxUsers: incoming.policy.maxUsers,
                  maxCallQueues: incoming.policy.maxCallQueues
                }
              }
            });

        const scheduleTemplate = existingScheduleMapping?.internalKey
          ? await tx.scheduleTemplate.update({
              where: {
                id: existingScheduleMapping.internalKey
              },
              data: {
                domainId: domain.id,
                name: "Primary Business Hours",
                timezone: incoming.timezone,
                isDefault: true
              }
            })
          : await tx.scheduleTemplate.create({
              data: {
                domainId: domain.id,
                name: "Primary Business Hours",
                timezone: incoming.timezone,
                isDefault: true
              }
            });

        const existingDomainScheduleMapping = await tx.backendMapping.findFirst({
          where: {
            domainId: domain.id,
            mappingType: "SCHEDULE_TEMPLATE"
          }
        });

        if (existingDomainScheduleMapping) {
          await tx.backendMapping.update({
            where: {
              id: existingDomainScheduleMapping.id
            },
            data: {
              internalKey: scheduleTemplate.id,
              externalRef: incoming.backendDomain,
              metadataJson: {
                domain: incoming.backendDomain
              }
            }
          });
        } else {
          await tx.backendMapping.create({
            data: {
              domainId: domain.id,
              mappingType: "SCHEDULE_TEMPLATE",
              internalKey: scheduleTemplate.id,
              externalRef: incoming.backendDomain,
              metadataJson: {
                domain: incoming.backendDomain
              }
            }
          });
        }

        await tx.notificationScenario.upsert({
          where: {
            domainId_name: {
              domainId: domain.id,
              name: "Primary Alert Notifications"
            }
          },
          update: {
            description: "Primary SMS and email notifications for the customer alert workflow.",
            makeScenarioId: `make-${domain.slug}-primary-alerts`,
            isActive: true
          },
          create: {
            domainId: domain.id,
            name: "Primary Alert Notifications",
            description: "Primary SMS and email notifications for the customer alert workflow.",
            makeScenarioId: `make-${domain.slug}-primary-alerts`
          }
        });

        imported.push(domain);
      }

      return imported;
    });
  },

  async importRoutingSnapshot(data: {
    domainId: string;
    timeframes: Array<{
      externalId: string;
      name: string;
      scope: "DOMAIN" | "USER";
      snapshotJson?: Prisma.InputJsonValue;
    }>;
    queues: Array<{
      externalId: string;
      name: string;
      extension?: string | null;
      linearRoutingEnabled: boolean;
      snapshotJson?: Prisma.InputJsonValue;
      members: Array<{
        externalId?: string | null;
        displayLabel: string;
        destinationNumber: string;
        enabled: boolean;
        requestConfirmationEnabled: boolean;
        sortOrder: number;
      }>;
    }>;
    assignments: Array<{
      timeframeExternalId: string;
      queueExternalId: string;
      locked?: boolean;
    }>;
  }) {
    return prisma.$transaction(async (tx) => {
      const existingTimeframes = await tx.routingTimeframe.findMany({
        where: { domainId: data.domainId },
        include: {
          assignment: {
            include: {
              routingQueue: true
            }
          }
        }
      });

      const queueIdByExternalId = new Map<string, string>();
      const timeframeIdByExternalId = new Map<string, string>();

      for (const queue of data.queues) {
        const upsertedQueue = await tx.routingQueue.upsert({
          where: {
            domainId_externalId: {
              domainId: data.domainId,
              externalId: queue.externalId
            }
          },
          update: {
            name: queue.name,
            extension: queue.extension ?? null,
            linearRoutingEnabled: queue.linearRoutingEnabled,
            snapshotJson: queue.snapshotJson,
            lastSyncedAt: new Date()
          },
          create: {
            domainId: data.domainId,
            externalId: queue.externalId,
            name: queue.name,
            extension: queue.extension ?? null,
            linearRoutingEnabled: queue.linearRoutingEnabled,
            snapshotJson: queue.snapshotJson,
            lastSyncedAt: new Date()
          }
        });

        queueIdByExternalId.set(queue.externalId, upsertedQueue.id);

        await tx.routingQueueMember.deleteMany({
          where: {
            routingQueueId: upsertedQueue.id
          }
        });

        if (queue.members.length > 0) {
          await tx.routingQueueMember.createMany({
            data: queue.members.map((member) => ({
              routingQueueId: upsertedQueue.id,
              externalId: member.externalId ?? member.destinationNumber,
              displayLabel: member.displayLabel,
              destinationNumber: member.destinationNumber,
              memberType: "EXTERNAL_NUMBER",
              sortOrder: member.sortOrder,
              enabled: member.enabled,
              requestConfirmationEnabled: member.requestConfirmationEnabled
            }))
          });
        }
      }

      for (const timeframe of data.timeframes) {
        const upsertedTimeframe = await tx.routingTimeframe.upsert({
          where: {
            domainId_externalId: {
              domainId: data.domainId,
              externalId: timeframe.externalId
            }
          },
          update: {
            name: timeframe.name,
            scope: timeframe.scope,
            type: "SPECIFIC_DATES",
            snapshotJson: timeframe.snapshotJson,
            lastSyncedAt: new Date()
          },
          create: {
            domainId: data.domainId,
            externalId: timeframe.externalId,
            name: timeframe.name,
            scope: timeframe.scope,
            type: "SPECIFIC_DATES",
            snapshotJson: timeframe.snapshotJson,
            lastSyncedAt: new Date()
          }
        });

        timeframeIdByExternalId.set(timeframe.externalId, upsertedTimeframe.id);
      }

      for (const assignment of data.assignments) {
        const routingTimeframeId = timeframeIdByExternalId.get(assignment.timeframeExternalId);
        const routingQueueId = queueIdByExternalId.get(assignment.queueExternalId);

        if (!routingTimeframeId || !routingQueueId) {
          continue;
        }

        await tx.timeframeQueueAssignment.upsert({
          where: {
            routingTimeframeId
          },
          update: {
            domainId: data.domainId,
            routingQueueId,
            locked: assignment.locked ?? true
          },
          create: {
            domainId: data.domainId,
            routingTimeframeId,
            routingQueueId,
            locked: assignment.locked ?? true
          }
        });
      }

      return tx.domain.findUniqueOrThrow({
        where: { id: data.domainId },
        include: {
          routingTimeframes: {
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
          },
          routingQueues: {
            orderBy: { name: "asc" },
            include: {
              members: {
                orderBy: { sortOrder: "asc" }
              }
            }
          },
          backendMappings: true
        }
      });
    });
  },

  listSyncJobs() {
    return prisma.syncJob.findMany({
      include: { domain: true },
      orderBy: { requestedAt: "desc" },
      take: 100
    });
  }
};
