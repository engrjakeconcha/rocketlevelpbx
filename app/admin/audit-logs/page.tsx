import { AuditLogTable } from "@/components/audit/audit-log-table";
import { requireAdminAccess } from "@/lib/tenant/access";
import { auditRepository } from "@/repositories/audit-repository";

export default async function AdminAuditLogsPage() {
  await requireAdminAccess();
  const rows = await auditRepository.listAll();
  return <AuditLogTable rows={rows} />;
}
