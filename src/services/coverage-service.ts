import { AuditActionType } from "@prisma/client";
import { coverageRepository } from "@/repositories/coverage-repository";
import { auditRepository } from "@/repositories/audit-repository";
import { prisma } from "@/lib/db/prisma";
import { coverageMutationSchema, type CoverageMutationInput } from "@/lib/validators/coverage";
import { normalizePhoneNumber } from "@/lib/utils/phone";
import { assertDomainAccess } from "@/lib/tenant/guards";
import type { AccessContext } from "@/types/access";
import { SyncService } from "@/services/sync-service";
import { toJsonValue } from "@/lib/utils/json";

export class CoverageService {
  constructor(private readonly syncService = new SyncService()) {}

  async getCoverage(access: AccessContext, domainId: string) {
    assertDomainAccess(access, domainId);
    return coverageRepository.getPrimaryGroup(domainId);
  }

  async updateCoverage(access: AccessContext, domainId: string, input: CoverageMutationInput, requestId: string) {
    assertDomainAccess(access, domainId);
    const group = await coverageRepository.getPrimaryGroup(domainId);

    if (!group) {
      throw new Error("No coverage group exists for this domain");
    }

    const validated = coverageMutationSchema.parse(input);
    const domain = await prisma.domain.findUnique({ where: { id: domainId } });

    if (!domain) {
      throw new Error("Domain not found");
    }

    const policy = domain.policyJson as {
      maxCoverageMembers?: number;
      allowCoverageAdditions?: boolean;
      allowExternalNumbers?: boolean;
      allowDestinationUpdates?: boolean;
    };

    if (validated.members.length > (policy.maxCoverageMembers ?? group.maxMembers)) {
      throw new Error("Coverage member limit exceeded");
    }

    const allowedPool = await prisma.allowedNumberPool.findMany({
      where: { domainId }
    });

    const allowedNumbers = new Set(allowedPool.map((entry) => entry.phoneNumber));

    const normalizedMembers = validated.members.map((member) => {
      const destinationNumber = normalizePhoneNumber(member.destinationNumber);

      if (!policy.allowExternalNumbers && member.memberType === "EXTERNAL_NUMBER") {
        throw new Error("External numbers are not enabled for this domain");
      }

      if (allowedNumbers.size > 0 && !allowedNumbers.has(destinationNumber)) {
        throw new Error("Destination number is outside the approved number pool");
      }

      return {
        ...member,
        destinationNumber
      };
    });

    const updated = await coverageRepository.updateGroupMembers(group.id, {
      ...validated,
      members: normalizedMembers
    });

    const mapping = await prisma.backendMapping.findFirst({
      where: {
        domainId,
        mappingType: "COVERAGE_GROUP",
        internalKey: group.id
      }
    });

    await auditRepository.create({
      actorId: access.user.id,
      actorRole: access.user.role,
      domainId,
      actionType: AuditActionType.REORDERED,
      objectType: "coverage_group",
      objectId: updated.id,
      beforeJson: toJsonValue(group),
      afterJson: toJsonValue(updated),
      requestId,
      message: "Updated coverage members"
    });

    if (mapping) {
      await this.syncService.syncCoverage({
        domainId,
        coverageGroupId: updated.id,
        externalRef: mapping.externalRef,
        metadata: mapping.metadataJson,
        payload: updated,
        requestedByUserId: access.user.id
      });
    }

    return updated;
  }
}
