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

  listSyncJobs() {
    return prisma.syncJob.findMany({
      include: { domain: true },
      orderBy: { requestedAt: "desc" },
      take: 100
    });
  }
};
