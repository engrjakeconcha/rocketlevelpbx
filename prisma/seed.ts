import bcrypt from "bcryptjs";
import { PrismaClient, SyncStatus, UserRole, OverrideMode, CoverageMemberType, CoverageMemberStatus, MappingType, AuditActionType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const defaultAdminPasswordHash = await bcrypt.hash("RocketLevel123!", 12);
  const jakeAdminPasswordHash = await bcrypt.hash("Jay12345", 12);

  const adminUsers = [
    {
      email: "admin@rocketlevel.ai",
      name: "RocketLevel Admin",
      passwordHash: defaultAdminPasswordHash
    },
    {
      email: "jerahmeel.concha@heybadara.com",
      name: "Jake Concha",
      passwordHash: jakeAdminPasswordHash
    }
  ];

  let admin = null;

  for (const adminUser of adminUsers) {
    const createdAdmin = await prisma.user.upsert({
      where: { email: adminUser.email },
      update: {
        name: adminUser.name,
        role: UserRole.ADMIN,
        isActive: true
      },
      create: {
        email: adminUser.email,
        name: adminUser.name,
        passwordHash: adminUser.passwordHash,
        role: UserRole.ADMIN
      }
    });

    if (adminUser.email === "admin@rocketlevel.ai") {
      admin = createdAdmin;
    }
  }

  if (!admin) {
    throw new Error("Default admin account was not created");
  }

  const domains = [
    {
      slug: "northshore-dental",
      name: "Northshore Dental",
      description: "Northshore Dental",
      timezone: "America/Chicago"
    },
    {
      slug: "summit-family-law",
      name: "Summit Family Law",
      description: "Summit Family Law",
      timezone: "America/New_York"
    },
    {
      slug: "servpro-team-drake",
      name: "Servpro Team Drake",
      description: "Servpro Team Drake",
      timezone: "America/New_York"
    }
  ];

  const specialCustomerUsers: Record<
    string,
    {
      email: string;
      name: string;
      password: string;
    }
  > = {
    "servpro-team-drake": {
      email: "pbxsupport@rocketlevelcommercial.com",
      name: "Servpro Team Drake",
      password: "Admin1234"
    }
  };

  for (const domainData of domains) {
    const domain = await prisma.domain.upsert({
      where: { slug: domainData.slug },
      update: {},
      create: {
        ...domainData,
        inboundNumber: "+15555550100",
        policyJson: {
          maxCoverageMembers: 8,
          allowCoverageAdditions: true,
          allowExternalNumbers: true,
          allowDestinationUpdates: true
        }
      }
    });

    const specialCustomer = specialCustomerUsers[domain.slug];
    const customerPasswordHash = specialCustomer
      ? await bcrypt.hash(specialCustomer.password, 12)
      : defaultAdminPasswordHash;

    const user = await prisma.user.upsert({
      where: { email: specialCustomer?.email ?? `owner@${domain.slug}.com` },
      update: {
        name: specialCustomer?.name ?? `${domain.description} Owner`,
        passwordHash: customerPasswordHash,
        role: UserRole.CUSTOMER,
        isActive: true
      },
      create: {
        email: specialCustomer?.email ?? `owner@${domain.slug}.com`,
        name: specialCustomer?.name ?? `${domain.description} Owner`,
        passwordHash: customerPasswordHash,
        role: UserRole.CUSTOMER
      }
    });

    await prisma.membership.upsert({
      where: {
        userId_domainId: {
          userId: user.id,
          domainId: domain.id
        }
      },
      update: {},
      create: {
        userId: user.id,
        domainId: domain.id
      }
    });

    const template = await prisma.scheduleTemplate.create({
      data: {
        domainId: domain.id,
        name: "Primary Business Hours",
        timezone: domain.timezone,
        syncStatus: SyncStatus.SUCCESS,
        lastSyncedAt: new Date(),
        lastSyncMessage: "Initial onboarding sync completed",
        weeklyRules: {
          create: [
            { dayOfWeek: 1, isOpen: true, startTime: "08:00", endTime: "17:00" },
            { dayOfWeek: 2, isOpen: true, startTime: "08:00", endTime: "17:00" },
            { dayOfWeek: 3, isOpen: true, startTime: "08:00", endTime: "17:00" },
            { dayOfWeek: 4, isOpen: true, startTime: "08:00", endTime: "17:00" },
            { dayOfWeek: 5, isOpen: true, startTime: "08:00", endTime: "15:00" },
            { dayOfWeek: 6, isOpen: false },
            { dayOfWeek: 0, isOpen: false }
          ]
        },
        holidayClosures: {
          create: [
            {
              name: "Memorial Day",
              startsAt: new Date("2026-05-25T00:00:00.000Z"),
              endsAt: new Date("2026-05-25T23:59:59.000Z")
            }
          ]
        },
        overrides: {
          create: [
            {
              mode: OverrideMode.FORCE_CLOSED,
              label: "Team Retreat",
              startsAt: new Date("2026-04-10T14:00:00.000Z"),
              endsAt: new Date("2026-04-10T22:00:00.000Z"),
              syncStatus: SyncStatus.SUCCESS,
              lastSyncedAt: new Date()
            }
          ]
        }
      }
    });

    const group = await prisma.coverageGroup.create({
      data: {
        domainId: domain.id,
        name: "Primary Coverage",
        maxMembers: 6,
        allowCustomerAdditions: true,
        allowExternalNumbers: true,
        syncStatus: SyncStatus.SUCCESS,
        lastSyncedAt: new Date(),
        members: {
          create: [
            {
              displayLabel: "Primary Tech",
              memberType: CoverageMemberType.USER,
              destinationNumber: "+15555550111",
              sortOrder: 1,
              temporaryStatus: CoverageMemberStatus.ACTIVE
            },
            {
              displayLabel: "Backup 1",
              memberType: CoverageMemberType.EXTERNAL_NUMBER,
              destinationNumber: "+15555550112",
              sortOrder: 2,
              temporaryStatus: CoverageMemberStatus.ACTIVE
            },
            {
              displayLabel: "Backup 2",
              memberType: CoverageMemberType.EXTERNAL_NUMBER,
              destinationNumber: "+15555550113",
              sortOrder: 3,
              temporaryStatus: CoverageMemberStatus.ACTIVE
            }
          ]
        }
      }
    });

    await prisma.allowedNumberPool.createMany({
      data: [
        { domainId: domain.id, phoneNumber: "+15555550111", label: "Primary Tech" },
        { domainId: domain.id, phoneNumber: "+15555550112", label: "Backup 1" },
        { domainId: domain.id, phoneNumber: "+15555550113", label: "Backup 2" }
      ],
      skipDuplicates: true
    });

    await prisma.backendMapping.createMany({
      data: [
        {
          domainId: domain.id,
          mappingType: MappingType.DOMAIN,
          internalKey: "domain",
          externalRef: `rt-domain-${domain.slug}`
        },
        {
          domainId: domain.id,
          mappingType: MappingType.SCHEDULE_TEMPLATE,
          internalKey: template.id,
          externalRef: `rt-schedule-${domain.slug}`,
          metadataJson: {
            domain: domain.slug,
            user: `routing-${domain.slug}`,
            weeklyTimeframeName: "Business Hours",
            weeklyTimeframeScope: "domain",
            holidayTimeframeName: "Holiday Closures",
            holidayTimeframeScope: "domain",
            overrideTimeframePrefix: "RL-AI-Override",
            overrideTimeframeScope: "user"
          }
        },
        {
          domainId: domain.id,
          mappingType: MappingType.COVERAGE_GROUP,
          internalKey: group.id,
          externalRef: `rt-coverage-${domain.slug}`,
          metadataJson: {
            domain: domain.slug,
            callqueue: `queue-${domain.slug}`,
            dispatchType: "Linear Cascade",
            agentDispatchTimeoutSeconds: 15,
            memberMappings: [
              {
                memberType: "USER",
                destinationNumber: "+15555550111",
                agentId: `primarytech@${domain.slug}`
              },
              {
                memberType: "EXTERNAL_NUMBER",
                destinationNumber: "+15555550112",
                agentId: "+15555550112"
              },
              {
                memberType: "EXTERNAL_NUMBER",
                destinationNumber: "+15555550113",
                agentId: "+15555550113"
              }
            ],
            agentDefaults: {
              availabilityType: "automatic",
              wrapUpAllowanceSeconds: 10,
              maxActiveCallsTotal: 1,
              maxConcurrentSmsConversations: 1
            }
          }
        }
      ],
      skipDuplicates: true
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: UserRole.ADMIN,
        domainId: domain.id,
        actionType: AuditActionType.SYNCED,
        objectType: "domain",
        objectId: domain.id,
        requestId: `seed-${domain.slug}`,
        syncStatus: SyncStatus.SUCCESS,
        message: "Seeded sample tenant data",
        afterJson: { domain: domain.slug }
      }
    });

    await prisma.syncJob.create({
      data: {
        domainId: domain.id,
        resourceType: "schedule",
        resourceId: template.id,
        operation: "seed",
        status: SyncStatus.SUCCESS,
        requestedByUserId: admin.id,
        completedAt: new Date()
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
