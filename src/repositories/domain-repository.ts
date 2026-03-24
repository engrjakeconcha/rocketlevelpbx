import { prisma } from "@/lib/db/prisma";

export const domainRepository = {
  listForAdmin() {
    return prisma.domain.findMany({
      orderBy: { name: "asc" }
    });
  },

  findById(domainId: string) {
    return prisma.domain.findUnique({
      where: { id: domainId },
      include: {
        backendMappings: {
          orderBy: { mappingType: "asc" }
        },
        scheduleTemplates: {
          include: {
            weeklyRules: true,
            holidayClosures: true,
            overrides: true
          }
        },
        coverageGroups: {
          include: {
            members: {
              orderBy: { sortOrder: "asc" }
            }
          }
        },
        routingTimeframes: {
          orderBy: { name: "asc" },
          include: {
            assignment: {
              include: {
                routingQueue: true
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
        }
      }
    });
  },

  findBySlug(slug: string) {
    return prisma.domain.findUnique({
      where: { slug }
    });
  }
};
