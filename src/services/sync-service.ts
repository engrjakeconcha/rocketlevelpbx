import { prisma } from "@/lib/db/prisma";
import { RoutingEngineClient } from "@/services/routing-engine-client";

type SyncDb = Pick<typeof prisma, "syncJob" | "scheduleTemplate" | "coverageGroup">;

export class SyncService {
  constructor(
    private readonly client = new RoutingEngineClient(),
    private readonly db: SyncDb = prisma
  ) {}

  async syncSchedule(args: {
    domainId: string;
    scheduleTemplateId: string;
    externalRef: string;
    metadata?: unknown;
    payload: unknown;
    requestedByUserId?: string;
  }) {
    const job = await this.db.syncJob.create({
      data: {
        domainId: args.domainId,
        resourceType: "schedule",
        resourceId: args.scheduleTemplateId,
        operation: "update",
        requestedByUserId: args.requestedByUserId
      }
    });

    const metadataConfigured =
      !!args.metadata && typeof args.metadata === "object" && Object.keys(args.metadata as Record<string, unknown>).length > 0;

    if (!metadataConfigured) {
      await this.db.scheduleTemplate.update({
        where: { id: args.scheduleTemplateId },
        data: {
          syncStatus: "SUCCESS",
          lastSyncedAt: new Date(),
          lastSyncMessage: "Saved in demo mode. Routing engine sync is not configured for this tenant yet."
        }
      });
      await this.db.syncJob.update({
        where: { id: job.id },
        data: {
          status: "SUCCESS",
          completedAt: new Date()
        }
      });
      return { status: "SUCCESS" as const, jobId: job.id, mode: "demo" as const };
    }

    try {
      await this.client.updateSchedule(args.externalRef, args.payload, args.metadata);
      await this.db.scheduleTemplate.update({
        where: { id: args.scheduleTemplateId },
        data: {
          syncStatus: "SUCCESS",
          lastSyncedAt: new Date(),
          lastSyncMessage: "Schedule synced successfully"
        }
      });
      await this.db.syncJob.update({
        where: { id: job.id },
        data: { status: "SUCCESS", completedAt: new Date() }
      });
      return { status: "SUCCESS" as const, jobId: job.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync failure";
      await this.db.scheduleTemplate.update({
        where: { id: args.scheduleTemplateId },
        data: {
          syncStatus: "FAILED",
          lastSyncMessage: message
        }
      });
      await this.db.syncJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          lastError: message,
          retryCount: { increment: 1 }
        }
      });
      return { status: "FAILED" as const, jobId: job.id, error: message };
    }
  }

  async syncCoverage(args: {
    domainId: string;
    coverageGroupId: string;
    externalRef: string;
    metadata?: unknown;
    payload: unknown;
    requestedByUserId?: string;
  }) {
    const job = await this.db.syncJob.create({
      data: {
        domainId: args.domainId,
        resourceType: "coverage",
        resourceId: args.coverageGroupId,
        operation: "update",
        requestedByUserId: args.requestedByUserId
      }
    });

    const metadataConfigured =
      !!args.metadata && typeof args.metadata === "object" && Object.keys(args.metadata as Record<string, unknown>).length > 0;

    if (!metadataConfigured) {
      await this.db.coverageGroup.update({
        where: { id: args.coverageGroupId },
        data: {
          syncStatus: "SUCCESS",
          lastSyncedAt: new Date()
        }
      });
      await this.db.syncJob.update({
        where: { id: job.id },
        data: {
          status: "SUCCESS",
          completedAt: new Date()
        }
      });
      return { status: "SUCCESS" as const, jobId: job.id, mode: "demo" as const };
    }

    try {
      await this.client.updateCoverage(args.externalRef, args.payload, args.metadata);
      await this.db.coverageGroup.update({
        where: { id: args.coverageGroupId },
        data: {
          syncStatus: "SUCCESS",
          lastSyncedAt: new Date()
        }
      });
      await this.db.syncJob.update({
        where: { id: job.id },
        data: { status: "SUCCESS", completedAt: new Date() }
      });
      return { status: "SUCCESS" as const, jobId: job.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync failure";
      await this.db.coverageGroup.update({
        where: { id: args.coverageGroupId },
        data: {
          syncStatus: "FAILED"
        }
      });
      await this.db.syncJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          lastError: message,
          retryCount: { increment: 1 }
        }
      });
      return { status: "FAILED" as const, jobId: job.id, error: message };
    }
  }
}
