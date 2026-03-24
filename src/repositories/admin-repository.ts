import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const adminRepository = {
  listUsers() {
    return prisma.user.findMany({
      include: {
        memberships: {
          include: { domain: true }
        }
      },
      orderBy: { email: "asc" }
    });
  },

  listDomains() {
    return prisma.domain.findMany({
      where: { isActive: true },
      orderBy: { description: "asc" }
    });
  },

  createUser(data: {
    email: string;
    name: string;
    passwordHash: string;
    role: "ADMIN" | "CUSTOMER";
    domainId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash: data.passwordHash,
          role: data.role,
          isActive: true
        },
        include: {
          memberships: {
            include: { domain: true }
          }
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
          }
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
