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
      const existingMembers = await tx.coverageMember.findMany({
        where: { coverageGroupId },
        orderBy: { sortOrder: "asc" }
      });

      for (const member of input.members) {
        const existingMember = member.id ? existingMembers.find((item) => item.id === member.id) : null;

        if (!existingMember) {
          throw new Error("Coverage members must reference existing records");
        }

        await tx.coverageMember.update({
          where: { id: existingMember.id },
          data: {
            displayLabel: member.displayLabel,
            memberType: member.memberType,
            destinationNumber: member.destinationNumber,
            enabled: member.enabled,
            temporaryStatus: member.temporaryStatus,
            sortOrder: member.sortOrder
          }
        });
      }

      return tx.coverageGroup.update({
        where: { id: coverageGroupId },
        data: {
          syncStatus: "PENDING"
        },
        include: {
          members: { orderBy: { sortOrder: "asc" } }
        }
      });
    });
  }
};
