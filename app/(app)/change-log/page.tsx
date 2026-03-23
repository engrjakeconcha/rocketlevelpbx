import { AuditLogTable } from "@/components/audit/audit-log-table";
import { requireAccessContext } from "@/lib/tenant/access";
import { auditRepository } from "@/repositories/audit-repository";

export default async function ChangeLogPage() {
  const access = await requireAccessContext();
  const rows = await auditRepository.listForDomain(access.domainId!);
  return <AuditLogTable rows={rows} />;
}
