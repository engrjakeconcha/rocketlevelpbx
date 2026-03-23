import { prisma } from "@/lib/db/prisma";
import type { CoverageMutationInput } from "@/lib/validators/coverage";

export const coverageRepository = {
  async getPrimaryGroup(domainId: string) {
    return prisma.coverageGroup.findFirst({
      where: { domainId },
      include: {
        members: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });
  },

  async updateGroupMembers(coverageGroupId: string, input: CoverageMutationInput) {
    return prisma.$transaction(async (tx) => {
      await tx.coverageMember.deleteMany({ where: { coverageGroupId } });

      return tx.coverageGroup.update({
        where: { id: coverageGroupId },
        data: {
          syncStatus: "PENDING",
          members: {
            create: input.members.map((member) => ({
              displayLabel: member.displayLabel,
              memberType: member.memberType,
              destinationNumber: member.destinationNumber,
              enabled: member.enabled,
              temporaryStatus: member.temporaryStatus,
              sortOrder: member.sortOrder
            }))
          }
        },
        include: {
          members: { orderBy: { sortOrder: "asc" } }
        }
      });
    });
  }
};
