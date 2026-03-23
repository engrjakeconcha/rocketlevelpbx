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
