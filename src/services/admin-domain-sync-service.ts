import { AuditActionType, SyncStatus } from "@prisma/client";
import type { AccessContext } from "@/types/access";
import { auditRepository } from "@/repositories/audit-repository";
import { adminRepository } from "@/repositories/admin-repository";
import { prisma } from "@/lib/db/prisma";
import { RoutingEngineClient } from "@/services/routing-engine-client";
import { toJsonValue } from "@/lib/utils/json";

export class AdminDomainSyncService {
  constructor(private readonly routingClient = new RoutingEngineClient()) {}

  async syncAccessibleDomains(access: AccessContext, requestId: string) {
    if (!access.isAdmin) {
      throw new Error("Only admins can sync accessible domains");
    }

    const domains = await this.routingClient.listAccessibleDomains();
    const imported = await adminRepository.importAccessibleDomains(domains);

    for (const domain of imported) {
      await prisma.syncJob.create({
        data: {
          domainId: domain.id,
          resourceType: "domain_catalog",
          resourceId: domain.id,
          operation: "import",
          status: SyncStatus.SUCCESS,
          requestedByUserId: access.user.id,
          completedAt: new Date()
        }
      });

      await auditRepository.create({
        actorId: access.user.id,
        actorRole: access.user.role,
        domainId: domain.id,
        actionType: AuditActionType.SYNCED,
        objectType: "domain_catalog",
        objectId: domain.id,
        afterJson: toJsonValue({
          description: domain.description,
          slug: domain.slug
        }),
        requestId,
        syncStatus: SyncStatus.SUCCESS,
        message: "Synced domain from reseller access"
      });
    }

    return {
      count: imported.length,
      domains: imported.map((domain) => ({
        id: domain.id,
        description: domain.description,
        slug: domain.slug
      }))
    };
  }
}
