import bcrypt from "bcryptjs";
import {
  PrismaClient,
  SyncStatus,
  UserRole,
  OverrideMode,
  CoverageMemberType,
  CoverageMemberStatus,
  MappingType,
  AuditActionType,
  NotificationChannel,
  RoutingTimeframeScope,
  RoutingTimeframeType
} from "@prisma/client";

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
      name: "Servpro Team Brandon",
      description: "Servpro Team Brandon",
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
      name: "Servpro Team Brandon",
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

    const notificationScenario = await prisma.notificationScenario.upsert({
      where: {
        domainId_name: {
          domainId: domain.id,
          name: "Primary Alert Notifications"
        }
      },
      update: {
        description: "Primary SMS and email notifications for the customer alert workflow.",
        makeScenarioId: `make-${domain.slug}-primary-alerts`,
        makeWebhookUrl: null,
        makeAuthHeaderName: null,
        makeAuthHeaderValue: null,
        isActive: true
      },
      create: {
        domainId: domain.id,
        name: "Primary Alert Notifications",
        description: "Primary SMS and email notifications for the customer alert workflow.",
        makeScenarioId: `make-${domain.slug}-primary-alerts`,
        makeWebhookUrl: null,
        makeAuthHeaderName: null,
        makeAuthHeaderValue: null
      }
    });

    await prisma.notificationContact.deleteMany({
      where: { notificationScenarioId: notificationScenario.id }
    });

    await prisma.notificationContact.createMany({
      data: [
        {
          notificationScenarioId: notificationScenario.id,
          label: "Primary Alert Email",
          channel: NotificationChannel.EMAIL,
          destination: specialCustomer?.email ?? `owner@${domain.slug}.com`,
          sortOrder: 1
        },
        {
          notificationScenarioId: notificationScenario.id,
          label: "Primary Alert SMS",
          channel: NotificationChannel.SMS,
          destination: "+15555550111",
          sortOrder: 2
        }
      ]
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        notificationScenarioId: notificationScenario.id
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

    const routingQueues = await Promise.all([
      prisma.routingQueue.upsert({
        where: {
          domainId_externalId: {
            domainId: domain.id,
            externalId: domain.slug === "servpro-team-drake" ? "401" : `${domain.slug}-queue-1`
          }
        },
        update: {
          name: "Primary Tech Queue",
          extension: domain.slug === "servpro-team-drake" ? "401" : "401",
          linearRoutingEnabled: true,
          lastSyncedAt: new Date()
        },
        create: {
          domainId: domain.id,
          externalId: domain.slug === "servpro-team-drake" ? "401" : `${domain.slug}-queue-1`,
          name: "Primary Tech Queue",
          extension: "401",
          linearRoutingEnabled: true,
          lastSyncedAt: new Date()
        }
      }),
      prisma.routingQueue.upsert({
        where: {
          domainId_externalId: {
            domainId: domain.id,
            externalId: domain.slug === "servpro-team-drake" ? "402" : `${domain.slug}-queue-2`
          }
        },
        update: {
          name: "Secondary Tech Queue",
          extension: domain.slug === "servpro-team-drake" ? "402" : "402",
          linearRoutingEnabled: true,
          lastSyncedAt: new Date()
        },
        create: {
          domainId: domain.id,
          externalId: domain.slug === "servpro-team-drake" ? "402" : `${domain.slug}-queue-2`,
          name: "Secondary Tech Queue",
          extension: "402",
          linearRoutingEnabled: true,
          lastSyncedAt: new Date()
        }
      })
    ]);

    for (const queue of routingQueues) {
      await prisma.routingQueueMember.deleteMany({
        where: { routingQueueId: queue.id }
      });
    }

    await prisma.routingQueueMember.createMany({
      data: [
        {
          routingQueueId: routingQueues[0].id,
          externalId: "+15555550111",
          displayLabel: "Primary Tech",
          destinationNumber: "+15555550111",
          memberType: CoverageMemberType.EXTERNAL_NUMBER,
          sortOrder: 1,
          enabled: true,
          requestConfirmationEnabled: true
        },
        {
          routingQueueId: routingQueues[0].id,
          externalId: "+15555550112",
          displayLabel: "Backup 1",
          destinationNumber: "+15555550112",
          memberType: CoverageMemberType.EXTERNAL_NUMBER,
          sortOrder: 2,
          enabled: true,
          requestConfirmationEnabled: true
        },
        {
          routingQueueId: routingQueues[0].id,
          externalId: "+15555550113",
          displayLabel: "Backup 2",
          destinationNumber: "+15555550113",
          memberType: CoverageMemberType.EXTERNAL_NUMBER,
          sortOrder: 3,
          enabled: true,
          requestConfirmationEnabled: true
        },
        {
          routingQueueId: routingQueues[1].id,
          externalId: "+15555550121",
          displayLabel: "Primary Tech",
          destinationNumber: "+15555550121",
          memberType: CoverageMemberType.EXTERNAL_NUMBER,
          sortOrder: 1,
          enabled: true,
          requestConfirmationEnabled: true
        },
        {
          routingQueueId: routingQueues[1].id,
          externalId: "+15555550122",
          displayLabel: "Backup 1",
          destinationNumber: "+15555550122",
          memberType: CoverageMemberType.EXTERNAL_NUMBER,
          sortOrder: 2,
          enabled: true,
          requestConfirmationEnabled: true
        }
      ]
    });

    const timeframeSeeds =
      domain.slug === "servpro-team-drake"
        ? [
            {
              externalId: "4e3c38783257f275cc7e68542ad30bc8",
              name: "813 683 0004",
              queueIndex: 0,
              entries: [
                {
                  startsAt: "2025-12-29T07:00:00.000Z",
                  endsAt: "2026-01-05T07:00:00.000Z",
                  recurrenceType: "custom",
                  recurrenceIntervalCount: 2,
                  recurrenceIntervalUnit: "weeks"
                }
              ]
            },
            {
              externalId: "decd0871ce10fef6da2b6a94f0ad4f73",
              name: "813 255 4214",
              queueIndex: 1,
              entries: [
                {
                  startsAt: "2025-12-22T07:00:00.000Z",
                  endsAt: "2025-12-29T07:00:00.000Z",
                  recurrenceType: "custom",
                  recurrenceIntervalCount: 2,
                  recurrenceIntervalUnit: "weeks"
                }
              ]
            },
            {
              externalId: "f30c190a83e3fcf6c91d9ec69a5ab18f",
              name: "813 683 0004 v2",
              queueIndex: 0,
              entries: [
                {
                  startsAt: "2025-12-19T00:00:00.000Z",
                  endsAt: "2025-12-22T07:00:00.000Z",
                  recurrenceType: "doesNotRecur"
                }
              ]
            }
          ]
        : [
            {
              externalId: `${domain.slug}-tf-1`,
              name: `${domain.description} Weekly Rotation`,
              queueIndex: 0,
              entries: [
                {
                  startsAt: "2026-03-23T13:00:00.000Z",
                  endsAt: "2026-03-30T13:00:00.000Z",
                  recurrenceType: "custom",
                  recurrenceIntervalCount: 1,
                  recurrenceIntervalUnit: "weeks"
                }
              ]
            },
            {
              externalId: `${domain.slug}-tf-2`,
              name: `${domain.description} Monthly Rotation`,
              queueIndex: 1,
              entries: [
                {
                  startsAt: "2026-04-01T13:00:00.000Z",
                  endsAt: "2026-04-08T13:00:00.000Z",
                  recurrenceType: "custom",
                  recurrenceIntervalCount: 1,
                  recurrenceIntervalUnit: "months"
                }
              ]
            }
          ];

    const routingTimeframes = [];

    for (const timeframeSeed of timeframeSeeds) {
      const routingTimeframe = await prisma.routingTimeframe.upsert({
        where: {
          domainId_externalId: {
            domainId: domain.id,
            externalId: timeframeSeed.externalId
          }
        },
        update: {
          name: timeframeSeed.name,
          scope: RoutingTimeframeScope.DOMAIN,
          type: RoutingTimeframeType.SPECIFIC_DATES,
          snapshotJson: {
            entries: timeframeSeed.entries
          },
          lastSyncedAt: new Date()
        },
        create: {
          domainId: domain.id,
          externalId: timeframeSeed.externalId,
          name: timeframeSeed.name,
          scope: RoutingTimeframeScope.DOMAIN,
          type: RoutingTimeframeType.SPECIFIC_DATES,
          snapshotJson: {
            entries: timeframeSeed.entries
          },
          lastSyncedAt: new Date()
        }
      });

      routingTimeframes.push({ record: routingTimeframe, queueIndex: timeframeSeed.queueIndex });
    }

    for (const timeframe of routingTimeframes) {
      await prisma.timeframeQueueAssignment.upsert({
        where: {
          routingTimeframeId: timeframe.record.id
        },
        update: {
          domainId: domain.id,
          routingQueueId: routingQueues[timeframe.queueIndex].id,
          locked: true
        },
        create: {
          domainId: domain.id,
          routingTimeframeId: timeframe.record.id,
          routingQueueId: routingQueues[timeframe.queueIndex].id,
          locked: true
        }
      });
    }

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
