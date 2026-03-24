import { beforeEach, describe, expect, it, vi } from "vitest";
import { CoverageService } from "@/services/coverage-service";
import { coverageRepository } from "@/repositories/coverage-repository";
import { auditRepository } from "@/repositories/audit-repository";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/repositories/coverage-repository", () => ({
  coverageRepository: {
    getPrimaryGroup: vi.fn(),
    updateGroupMembers: vi.fn()
  }
}));

vi.mock("@/repositories/audit-repository", () => ({
  auditRepository: {
    create: vi.fn()
  }
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    domain: {
      findUnique: vi.fn()
    },
    allowedNumberPool: {
      findMany: vi.fn()
    },
    backendMapping: {
      findFirst: vi.fn()
    }
  }
}));

describe("CoverageService", () => {
  const access = {
    user: {
      id: "user_1",
      email: "pbxsupport@rocketlevelcommercial.com",
      name: "Servpro Team Drake",
      role: "CUSTOMER" as const
    },
    membership: {
      domainId: "domain_1",
      userId: "user_1",
      domain: {
        slug: "servpro-team-drake"
      }
    },
    isAdmin: false,
    domainId: "domain_1",
    domainSlug: "servpro-team-drake"
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(coverageRepository.getPrimaryGroup).mockResolvedValue({
      id: "group_1",
      domainId: "domain_1",
      maxMembers: 6,
      members: [
        {
          id: "member_1",
          displayLabel: "Primary Tech",
          memberType: "USER",
          destinationNumber: "+15555550111",
          enabled: true,
          temporaryStatus: "ACTIVE",
          sortOrder: 1
        },
        {
          id: "member_2",
          displayLabel: "Backup 1",
          memberType: "EXTERNAL_NUMBER",
          destinationNumber: "+15555550112",
          enabled: true,
          temporaryStatus: "ACTIVE",
          sortOrder: 2
        },
        {
          id: "member_3",
          displayLabel: "Backup 2",
          memberType: "EXTERNAL_NUMBER",
          destinationNumber: "+15555550113",
          enabled: true,
          temporaryStatus: "ACTIVE",
          sortOrder: 3
        }
      ]
    } as never);

    vi.mocked(prisma.domain.findUnique).mockResolvedValue({
      id: "domain_1",
      policyJson: {
        maxCoverageMembers: 6,
        allowExternalNumbers: true,
        allowDestinationUpdates: true
      }
    } as never);
    vi.mocked(prisma.allowedNumberPool.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.backendMapping.findFirst).mockResolvedValue(null as never);
    vi.mocked(auditRepository.create).mockResolvedValue({ id: "audit_1" } as never);
    vi.mocked(coverageRepository.updateGroupMembers).mockResolvedValue({
      id: "group_1",
      members: []
    } as never);
  });

  it("rejects customer attempts to add a new coverage member", async () => {
    const service = new CoverageService({ syncCoverage: vi.fn() } as never);

    await expect(
      service.updateCoverage(
        access,
        "domain_1",
        {
          coverageGroupId: "group_1",
          members: [
            {
              id: "member_1",
              displayLabel: "Primary Tech",
              memberType: "USER",
              destinationNumber: "+15555550111",
              enabled: true,
              temporaryStatus: "ACTIVE",
              sortOrder: 1
            },
            {
              id: "member_2",
              displayLabel: "Backup 1",
              memberType: "EXTERNAL_NUMBER",
              destinationNumber: "+15555550112",
              enabled: true,
              temporaryStatus: "ACTIVE",
              sortOrder: 2
            },
            {
              id: "member_3",
              displayLabel: "Backup 2",
              memberType: "EXTERNAL_NUMBER",
              destinationNumber: "+15555550113",
              enabled: true,
              temporaryStatus: "ACTIVE",
              sortOrder: 3
            },
            {
              id: "member_4",
              displayLabel: "Backup 3",
              memberType: "EXTERNAL_NUMBER",
              destinationNumber: "+15555550114",
              enabled: true,
              temporaryStatus: "ACTIVE",
              sortOrder: 4
            }
          ]
        },
        "req_1"
      )
    ).rejects.toThrow("Coverage members are fixed after onboarding");
  });

  it("allows reordering the existing coverage members", async () => {
    const syncCoverage = vi.fn().mockResolvedValue({ status: "SUCCESS" });
    const service = new CoverageService({ syncCoverage } as never);

    await service.updateCoverage(
      access,
      "domain_1",
      {
        coverageGroupId: "group_1",
        members: [
          {
            id: "member_3",
            displayLabel: "Backup 2",
            memberType: "EXTERNAL_NUMBER",
            destinationNumber: "+15555550113",
            enabled: true,
            temporaryStatus: "ACTIVE",
            sortOrder: 1
          },
          {
            id: "member_1",
            displayLabel: "Primary Tech",
            memberType: "USER",
            destinationNumber: "+15555550111",
            enabled: true,
            temporaryStatus: "ACTIVE",
            sortOrder: 2
          },
          {
            id: "member_2",
            displayLabel: "Backup 1",
            memberType: "EXTERNAL_NUMBER",
            destinationNumber: "+15555550112",
            enabled: true,
            temporaryStatus: "ACTIVE",
            sortOrder: 3
          }
        ]
      },
      "req_2"
    );

    expect(coverageRepository.updateGroupMembers).toHaveBeenCalledWith(
      "group_1",
      expect.objectContaining({
        members: [
          expect.objectContaining({ id: "member_3", sortOrder: 1 }),
          expect.objectContaining({ id: "member_1", sortOrder: 2 }),
          expect.objectContaining({ id: "member_2", sortOrder: 3 })
        ]
      })
    );
  });
});
