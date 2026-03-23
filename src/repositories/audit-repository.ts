import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { UserRole, SyncStatus, AuditActionType } from "@prisma/client";

type CreateAuditEntryInput = {
  actorId?: string | null;
  actorRole: UserRole;
  domainId: string;
  actionType: AuditActionType;
  objectType: string;
  objectId: string;
  beforeJson?: Prisma.JsonValue | null;
  afterJson?: Prisma.JsonValue | null;
  syncStatus?: SyncStatus;
  requestId: string;
  message?: string | null;
};

export const auditRepository = {
  create(input: CreateAuditEntryInput) {
    return prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorRole: input.actorRole,
        domainId: input.domainId,
        actionType: input.actionType,
        objectType: input.objectType,
        objectId: input.objectId,
        beforeJson: input.beforeJson === null ? Prisma.JsonNull : input.beforeJson,
        afterJson: input.afterJson === null ? Prisma.JsonNull : input.afterJson,
        syncStatus: input.syncStatus ?? "PENDING",
        requestId: input.requestId,
        message: input.message ?? null
      }
    });
  },

  listForDomain(domainId: string) {
    return prisma.auditLog.findMany({
      where: { domainId },
      include: { actor: true, domain: true },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  },

  listAll() {
    return prisma.auditLog.findMany({
      include: { actor: true, domain: true },
      orderBy: { createdAt: "desc" },
      take: 200
    });
  }
};
